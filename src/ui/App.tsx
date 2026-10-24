import { useEffect, useMemo, useState } from "react";
import {
  completeTask,
  createTask,
  updateTask,
  type Task,
  type TaskInput,
} from "../domain/task";
import { todayString } from "../domain/overdue";
import { DEFAULT_QUERY, applyQuery, deriveTags, reconcileQuery, type Query } from "../domain/query";
import { useTasks } from "../state/useTasks";
import { ConfirmDialog } from "./ConfirmDialog";
import { FilterBar } from "./FilterBar";
import { TaskForm } from "./TaskForm";
import { TaskList } from "./TaskList";
import { ThemeToggle } from "./ThemeToggle";
import { TransferMenu } from "./TransferMenu";

type Dialog =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; task: Task }
  | { kind: "delete"; task: Task };

export function App() {
  const { tasks, notice, dismissNotice, dispatch } = useTasks();
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const [announcement, setAnnouncement] = useState("");
  const [query, setQuery] = useState<Query>(DEFAULT_QUERY);

  // Reset the tag filter when its tag disappears, so it cannot silently return later.
  const effectiveQuery = reconcileQuery(query, tasks);
  useEffect(() => {
    if (effectiveQuery !== query) setQuery(effectiveQuery);
  }, [effectiveQuery, query]);

  const visibleTasks = useMemo(() => applyQuery(tasks, effectiveQuery), [tasks, effectiveQuery]);
  const tags = useMemo(() => deriveTags(tasks), [tasks]);

  function clearFilters() {
    setQuery({ ...DEFAULT_QUERY, sort: query.sort });
  }

  function close() {
    setDialog({ kind: "none" });
  }

  function handleSave(input: TaskInput) {
    if (dialog.kind === "create") {
      const result = createTask(input);
      if (!result.ok) return setAnnouncement(result.error);
      dispatch({ type: "add", task: result.task });
      setAnnouncement(`Task "${result.task.title}" created.`);
    } else if (dialog.kind === "edit") {
      const result = updateTask(dialog.task, input);
      if (!result.ok) return setAnnouncement(result.error);
      dispatch({ type: "update", task: result.task });
      setAnnouncement(`Task "${result.task.title}" updated.`);
    }
    close();
  }

  function handleComplete(task: Task) {
    dispatch({ type: "update", task: completeTask(task) });
    setAnnouncement(`Task "${task.title}" marked complete.`);
  }

  function handleImport(imported: Task[]) {
    dispatch({ type: "replaceAll", tasks: imported });
    setAnnouncement(`Imported ${imported.length} task${imported.length === 1 ? "" : "s"}.`);
  }

  function handleConfirmDelete() {
    if (dialog.kind !== "delete") return;
    dispatch({ type: "delete", id: dialog.task.id });
    setAnnouncement(`Task "${dialog.task.title}" deleted.`);
    close();
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Focus App</h1>
        <div className="toolbar" role="toolbar" aria-label="Actions">
          <button type="button" className="primary" onClick={() => setDialog({ kind: "create" })}>
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
        <TaskList
          tasks={visibleTasks}
          hasTasks={tasks.length > 0}
          today={todayString()}
          onEdit={(task) => setDialog({ kind: "edit", task })}
          onComplete={handleComplete}
          onDelete={(task) => setDialog({ kind: "delete", task })}
          onClearFilters={clearFilters}
        />
      </main>
      {(dialog.kind === "create" || dialog.kind === "edit") && (
        <TaskForm
          key={dialog.kind === "edit" ? dialog.task.id : "new"}
          initial={dialog.kind === "edit" ? dialog.task : undefined}
          onSave={handleSave}
          onCancel={close}
        />
      )}
      {dialog.kind === "delete" && (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${dialog.task.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={close}
        />
      )}
    </div>
  );
}
