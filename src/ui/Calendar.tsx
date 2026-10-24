import { useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import {
  describeDate,
  entriesByDate,
  goToDate,
  heading,
  isSameMonth,
  monthGrid,
  moveTarget,
  setView,
  shift,
  visibleDates,
  type CalendarState,
  type CalendarView,
} from "../domain/calendar";
import type { Task } from "../domain/task";
import type { Preview } from "../domain/series";
import { CalendarDay, type DropHandlers } from "./CalendarDay";
import type { EntryActions } from "./CalendarEntry";

interface CalendarProps {
  /** The tasks to show (already filtered by the app's filter bar). */
  tasks: Task[];
  /** Future occurrences of repeating tasks, for the dates being shown. */
  previews?: Preview[];
  state: CalendarState;
  onStateChange: (state: CalendarState) => void;
  today: string;
  /** True when the filters are hiding some tasks, so an empty period can say so. */
  hiddenByFilters: boolean;
  onOpen: (task: Task) => void;
  /** Give a task a new due date (called only when the date really changes). */
  onReschedule: (taskId: string, date: string) => void;
  onClearFilters: () => void;
}

/** A keyboard move in progress. */
interface MoveState {
  taskId: string;
  target: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LIMIT = 3;

const MODES: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

function emptyMessage(state: CalendarState): string {
  switch (state.view) {
    case "month":
      return "Nothing due this month.";
    case "week":
      return "Nothing due this week.";
    case "day":
      return `Nothing due on ${describeDate(state.anchor)}.`;
  }
}

export function Calendar({
  tasks,
  previews = [],
  state,
  onStateChange,
  today,
  hiddenByFilters,
  onOpen,
  onReschedule,
  onClearFilters,
}: CalendarProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [moving, setMoving] = useState<MoveState | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);

  const byDate = useMemo(() => entriesByDate(tasks), [tasks]);
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const dates = useMemo(() => visibleDates(state), [state]);
  const previewsByDate = useMemo(() => {
    const map = new Map<string, Preview[]>();
    for (const preview of previews) map.set(preview.date, [...(map.get(preview.date) ?? []), preview]);
    return map;
  }, [previews]);
  const periodIsEmpty = !dates.some((date) => byDate.has(date) || previewsByDate.has(date));

  function findMoveButton(taskId: string): HTMLElement | undefined {
    const entries = sectionRef.current?.querySelectorAll<HTMLElement>("[data-task-id]") ?? [];
    return Array.from(entries)
      .find((entry) => entry.getAttribute("data-task-id") === taskId)
      ?.querySelector<HTMLElement>(".cal-move") ?? undefined;
  }

  // After a drop the task sits in a different cell, so focus goes to its Move button there.
  useEffect(() => {
    if (!pendingFocus) return;
    findMoveButton(pendingFocus)?.focus();
    setPendingFocus(null);
  }, [pendingFocus, tasks]);

  // While moving, the arrow keys can carry the task into another period, which rebuilds the cells.
  // Keep focus on the Move button through that.
  useEffect(() => {
    if (!moving) return;
    const button = findMoveButton(moving.taskId);
    if (button && document.activeElement !== button) button.focus();
  }, [moving, state]);

  // While a move is in progress the arrow keys, Enter, and Escape are handled at the document level.
  // Moving the target into another period can remove the moved task's own entry (and so its focused
  // Move button) from the page, and the move must keep working when that happens.
  useEffect(() => {
    if (!moving) return;
    const current = moving;
    const task = taskById.get(current.taskId);
    if (!task) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setMoving(null);
        setAnnouncement("Move cancelled.");
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        setMoving(null);
        if (!task || !reschedule(task.id, current.target)) {
          setAnnouncement(`${task?.title ?? "Task"} stays on ${describeDate(current.target)}.`);
        }
        setPendingFocus(current.taskId);
        return;
      }
      const next = moveTarget(current.target, event.key);
      if (next === null) return;
      event.preventDefault();
      event.stopPropagation();
      setMoving({ taskId: current.taskId, target: next });
      setAnnouncement(describeDate(next));
      // Bring the target into view if the arrow keys took it past the edge of this period.
      if (!dates.includes(next)) onStateChange(goToDate(state, next));
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [moving, state, dates, taskById, onReschedule, onStateChange]);

  /** Reschedule a task, announcing the result, unless the date is not changing. */
  function reschedule(taskId: string, date: string): boolean {
    const task = taskById.get(taskId);
    if (!task || task.dueDate === date) return false;
    onReschedule(taskId, date);
    setAnnouncement(`${task.title} moved to ${describeDate(date)}.`);
    return true;
  }

  function startMove(task: Task) {
    if (moving?.taskId === task.id || task.dueDate === null) return;
    setMoving({ taskId: task.id, target: task.dueDate });
    setAnnouncement(
      `Moving ${task.title}. Use the arrow keys to choose a date, Enter to drop it, Escape to cancel. ` +
        `Currently ${describeDate(task.dueDate)}.`,
    );
  }

  function handleMoveBlur(event: FocusEvent<HTMLButtonElement>, task: Task) {
    if (!moving || moving.taskId !== task.id) return;
    // Only an actual move of focus to another control ends the move.
    if (event.relatedTarget instanceof Element && !event.currentTarget.contains(event.relatedTarget)) {
      setMoving(null);
      setAnnouncement("Move cancelled.");
    }
  }

  const actions: EntryActions = {
    onOpen,
    movingId: moving?.taskId ?? null,
    onMoveStart: startMove,
    onMoveBlur: handleMoveBlur,
  };

  const drop: DropHandlers = {
    onEnter: (date) => setDropTarget(date),
    onLeave: (date) => setDropTarget((current) => (current === date ? null : current)),
    onDrop: (date, taskId) => {
      setDropTarget(null);
      reschedule(taskId, date);
    },
  };

  function showDay(date: string) {
    onStateChange({ view: "day", anchor: date });
  }

  const renderDay = (
    date: string,
    options: { outside?: boolean; limit?: number; block?: boolean } = {},
  ) => (
    <CalendarDay
      key={date}
      date={date}
      today={today}
      outside={options.outside}
      limit={options.limit}
      block={options.block}
      entries={byDate.get(date) ?? []}
      previews={previewsByDate.get(date) ?? []}
      isDropTarget={dropTarget === date || moving?.target === date}
      actions={actions}
      drop={drop}
      onShowDay={showDay}
    />
  );

  return (
    <section
      ref={sectionRef}
      className="calendar"
      aria-label="Calendar"
      onDragEnd={() => setDropTarget(null)}
    >
      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button type="button" onClick={() => onStateChange(shift(state, -1))}>
            Previous
          </button>
          <button type="button" onClick={() => onStateChange(goToDate(state, today))}>
            Today
          </button>
          <button type="button" onClick={() => onStateChange(shift(state, 1))}>
            Next
          </button>
        </div>
        <h2 className="calendar-heading" aria-live="polite">
          {heading(state)}
        </h2>
        <div role="group" aria-label="Calendar view" className="calendar-modes">
          {MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              aria-pressed={state.view === mode.value}
              onClick={() => onStateChange(setView(state, mode.value))}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <p role="status" aria-label="Calendar announcements" className="visually-hidden">
        {announcement}
      </p>

      {periodIsEmpty && (
        <p className="calendar-empty">
          {hiddenByFilters ? "No tasks match your filters in this period." : emptyMessage(state)}
          {hiddenByFilters && (
            <>
              {" "}
              <button type="button" onClick={onClearFilters}>
                Clear filters
              </button>
            </>
          )}
        </p>
      )}

      {state.view === "month" && (
        <div className="calendar-scroll">
          <table className="calendar-grid calendar-month">
            <caption className="visually-hidden">{heading(state)}</caption>
            <thead>
              <tr>
                {WEEKDAYS.map((day) => (
                  <th key={day} scope="col">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthGrid(state.anchor).map((row) => (
                <tr key={row[0]}>
                  {row.map((date) =>
                    renderDay(date, { outside: !isSameMonth(date, state.anchor), limit: MONTH_LIMIT }),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state.view === "week" && (
        <div className="calendar-scroll">
          <table className="calendar-grid calendar-week">
            <caption className="visually-hidden">{heading(state)}</caption>
            <thead>
              <tr>
                {WEEKDAYS.map((day) => (
                  <th key={day} scope="col">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>{dates.map((date) => renderDay(date))}</tr>
            </tbody>
          </table>
        </div>
      )}

      {state.view === "day" && (
        <div className="calendar-dayview">{renderDay(state.anchor, { block: true })}</div>
      )}
    </section>
  );
}
