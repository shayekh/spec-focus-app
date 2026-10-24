import { useEffect, useMemo, useState } from "react";
import type { Task, TaskInput } from "../domain/task";
import {
  completeOccurrence,
  createOccurrence,
  deleteOccurrence,
  openOccurrence,
  previewsFor,
  saveOccurrence,
  stopSeries,
  type ChangeSet,
  type EditScope,
} from "../domain/series";
import { todayString } from "../domain/overdue";
import { describeDate, rescheduleTask, visibleDates, type CalendarState } from "../domain/calendar";
import { DEFAULT_QUERY, applyQuery, deriveTags, reconcileQuery, type Query } from "../domain/query";
import { useTasks } from "../state/useTasks";
import { Calendar } from "./Calendar";
import { ConfirmDialog } from "./ConfirmDialog";
import { FilterBar } from "./FilterBar";
import { SubtasksDialog } from "./SubtasksDialog";
import { TaskForm } from "./TaskForm";
import { TaskList } from "./TaskList";
import { ThemeToggle } from "./ThemeToggle";
import { ViewSwitch, type AppView } from "./ViewSwitch";
import { TransferMenu } from "./TransferMenu";

type Dialog =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; task: Task }
  | { kind: "delete"; task: Task }
  | { kind: "subtasks"; taskId: string };

export function App() {
  const { tasks, notice, dismissNotice, dispatch } = useTasks();
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const [announcement, setAnnouncement] = useState("");
  /** The task the user is being asked to complete after finishing its last subtask. */
  const [offerFor, setOfferFor] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [query, setQuery] = useState<Query>(DEFAULT_QUERY);
  const [appView, setAppView] = useState<AppView>("list");
  const [calendarState, setCalendarState] = useState<CalendarState>(() => ({
    view: "month",
    anchor: todayString(),
  }));

  // Reset the tag filter when its tag disappears, so it cannot silently return later.
  const effectiveQuery = reconcileQuery(query, tasks);
  useEffect(() => {
    if (effectiveQuery !== query) setQuery(effectiveQuery);
  }, [effectiveQuery, query]);

  const visibleTasks = useMemo(() => applyQuery(tasks, effectiveQuery), [tasks, effectiveQuery]);
  const tags = useMemo(() => deriveTags(tasks), [tasks]);
  // Upcoming occurrences are worked out only for the dates on screen, from the tasks the filters let through.
  const today = todayString();
  const previews = useMemo(() => {
    if (appView !== "calendar") return [];
    const dates = visibleDates(calendarState);
    const [first, last] = [dates[0], dates[dates.length - 1]];
    return first === undefined || last === undefined ? [] : previewsFor(visibleTasks, first, last, today);
  }, [appView, visibleTasks, calendarState, today]);

  function clearFilters() {
    setQuery({ ...DEFAULT_QUERY, sort: query.sort });
  }

  function close() {
    setDialog({ kind: "none" });
    setFormError(null);
  }

  /** Apply a change set in one step and say what happened to anyone using a screen reader. */
  function apply(changes: ChangeSet, title: string, fallback: string) {
    dispatch({ type: "change", upsert: changes.upsert, remove: changes.remove });
    if (changes.outcome === "next" && changes.next?.dueDate) {
      setAnnouncement(`Completed "${title}". Next one is due ${describeDate(changes.next.dueDate)}.`);
    } else if (changes.outcome === "last") {
      setAnnouncement(`Completed "${title}". That was the last occurrence.`);
    } else {
      setAnnouncement(fallback);
    }
  }

  function newIds() {
    return { newId: crypto.randomUUID(), seriesId: crypto.randomUUID() };
  }

  function handleSave(input: TaskInput, scope: EditScope): boolean {
    if (dialog.kind === "create") {
      const result = createOccurrence(input, new Date(), { ...newIds(), taskId: crypto.randomUUID() });
      if (!result.ok) {
        setAnnouncement(result.error);
        return false;
      }
      apply(result.changes, input.title.trim(), `Task "${input.title.trim()}" created.`);
    } else if (dialog.kind === "edit") {
      // Another tab may have changed or deleted this task while the form was open. Work from the
      // current task, and never lose the user's text silently: keep the form open and say so.
      const current = tasks.find((t) => t.id === dialog.task.id);
      if (!current) {
        setFormError("This task no longer exists, so your changes cannot be saved.");
        return false;
      }
      const result = saveOccurrence(tasks, current, input, scope, new Date(), newIds());
      if (!result.ok) {
        setAnnouncement(result.error);
        return false;
      }
      apply(result.changes, input.title.trim(), `Task "${input.title.trim()}" updated.`);
    }
    close();
    return true;
  }

  function handleComplete(task: Task) {
    apply(
      completeOccurrence(tasks, task, new Date(), crypto.randomUUID()),
      task.title,
      `Task "${task.title}" marked complete.`,
    );
  }

  function handleImport(imported: Task[]) {
    dispatch({ type: "replaceAll", tasks: imported });
    setAnnouncement(`Imported ${imported.length} task${imported.length === 1 ? "" : "s"}.`);
  }

  function handleReschedule(taskId: string, date: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const moved = rescheduleTask(task, date);
    if (moved !== task) dispatch({ type: "update", task: moved });
  }

  const subtasksTask = dialog.kind === "subtasks" ? tasks.find((t) => t.id === dialog.taskId) : undefined;

  function handleStopRepeating() {
    if (dialog.kind !== "edit" || dialog.task.seriesId === undefined) return;
    const { upsert, remove } = stopSeries(tasks, dialog.task.seriesId);
    dispatch({ type: "change", upsert, remove });
    setAnnouncement(`"${dialog.task.title}" no longer repeats.`);
  }

  function handleConfirmOffer() {
    const task = tasks.find((t) => t.id === offerFor);
    setOfferFor(null);
    if (task) handleComplete(task);
  }

  function handleConfirmDelete() {
    if (dialog.kind !== "delete") return;
    dispatch({ type: "change", ...deleteOccurrence(tasks, dialog.task) });
    setAnnouncement(`Task "${dialog.task.title}" deleted.`);
    close();
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Focus App</h1>
        <div className="toolbar" role="toolbar" aria-label="Actions">
          <button
            type="button"
            className="primary"
            data-modal-fallback
            onClick={() => setDialog({ kind: "create" })}
          >
            New task
          </button>
          <TransferMenu tasks={tasks} onImport={handleImport} />
          <ThemeToggle />
        </div>
      </header>
      <div role="status" aria-live="polite" className="visually-hidden">
        {announcement}
      </div>
      {notice && (
        <div className="notice" role="alert">
          {notice}{" "}
          <button type="button" onClick={dismissNotice}>
            Dismiss
          </button>
        </div>
      )}
      <div className="view-row">
        <ViewSwitch value={appView} onChange={setAppView} />
      </div>
      {tasks.length > 0 && (
        <FilterBar
          query={effectiveQuery}
          tags={tags}
          shown={visibleTasks.length}
          total={tasks.length}
          onChange={setQuery}
          onClear={clearFilters}
        />
      )}
      <main>
        {appView === "list" ? (
          <TaskList
            tasks={visibleTasks}
            hasTasks={tasks.length > 0}
            today={todayString()}
            onEdit={(task) => setDialog({ kind: "edit", task })}
            onComplete={handleComplete}
            onDelete={(task) => setDialog({ kind: "delete", task })}
            onSubtasks={(task) => setDialog({ kind: "subtasks", taskId: task.id })}
            onClearFilters={clearFilters}
            onCreate={() => setDialog({ kind: "create" })}
          />
        ) : (
          <Calendar
            tasks={visibleTasks}
            previews={previews}
            state={calendarState}
            onStateChange={setCalendarState}
            today={todayString()}
            hiddenByFilters={visibleTasks.length < tasks.length}
            onOpen={(task) => setDialog({ kind: "edit", task })}
            onReschedule={handleReschedule}
            onClearFilters={clearFilters}
          />
        )}
      </main>
      {(dialog.kind === "create" || dialog.kind === "edit") && (
        <TaskForm
          key={dialog.kind === "edit" ? dialog.task.id : "new"}
          initial={dialog.kind === "edit" ? dialog.task : undefined}
          formError={formError}
          seriesHasOpen={
            dialog.kind === "edit" &&
            dialog.task.seriesId !== undefined &&
            openOccurrence(tasks, dialog.task.seriesId) !== undefined
          }
          onStopRepeating={handleStopRepeating}
          onSave={handleSave}
          onCancel={close}
        />
      )}
      {dialog.kind === "delete" && (
        <ConfirmDialog
          title="Delete task"
          message={
            `Delete "${dialog.task.title}"? This cannot be undone.` +
            (dialog.task.seriesId !== undefined && dialog.task.status !== "completed"
              ? " This task repeats. Deleting it also ends the series."
              : "") +
            (dialog.task.subtasks
              ? ` Its ${dialog.task.subtasks.length} ${dialog.task.subtasks.length === 1 ? "subtask" : "subtasks"} will be deleted too.`
              : "")
          }
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={close}
        />
      )}
      {subtasksTask && (
        <SubtasksDialog
          task={subtasksTask}
          today={todayString()}
          onChange={(task) => dispatch({ type: "update", task })}
          onOffer={(task) => setOfferFor(task.id)}
          onClose={close}
        />
      )}
      {offerFor !== null && subtasksTask && (
        <ConfirmDialog
          title="Complete task?"
          message={`All subtasks of "${subtasksTask.title}" are complete. Complete the task too?`}
          confirmLabel="Complete task"
          cancelLabel="Leave open"
          confirmVariant="primary"
          onConfirm={handleConfirmOffer}
          onCancel={() => setOfferFor(null)}
        />
      )}
    </div>
  );
}
