import type { FocusEvent } from "react";
import { isOverdue } from "../domain/overdue";
import type { Task } from "../domain/task";
import { RepeatIcon } from "./RepeatIcon";

/** The drag-and-drop data type that carries a task id. */
export const TASK_DRAG_TYPE = "application/x-focus-task-id";

/** What an entry can do, supplied by the calendar. */
export interface EntryActions {
  onOpen: (task: Task) => void;
  /** The task being moved with the keyboard, if any. */
  movingId: string | null;
  onMoveStart: (task: Task) => void;
  onMoveBlur: (event: FocusEvent<HTMLButtonElement>, task: Task) => void;
}

interface CalendarEntryProps {
  task: Task;
  today: string;
  actions: EntryActions;
}

/** One task on the calendar: open it, drag it, or move it with the keyboard. */
export function CalendarEntry({ task, today, actions }: CalendarEntryProps) {
  const completed = task.status === "completed";
  const overdue = isOverdue(task, today);
  const moving = actions.movingId === task.id;
  const label = [
    task.title,
    `${task.priority} priority`,
    ...(completed ? ["completed"] : []),
    ...(overdue ? ["overdue"] : []),
    ...(task.recurrence ? ["repeats"] : []),
  ].join(", ");

  return (
    <li
      className={`cal-entry${completed ? " is-completed" : ""}${overdue ? " is-overdue" : ""}${moving ? " is-moving" : ""}`}
      data-task-id={task.id}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(TASK_DRAG_TYPE, task.id);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <button
        type="button"
        className="cal-entry-open"
        aria-label={label}
        title={task.title}
        onClick={() => actions.onOpen(task)}
      >
        <span className={`priority-dot priority-${task.priority}`} aria-hidden="true" />
        <span className="cal-entry-title">{task.title}</span>
        {task.recurrence && <RepeatIcon />}
      </button>
      <button
        type="button"
        className="cal-move"
        aria-label={`Move ${task.title}`}
        onClick={() => actions.onMoveStart(task)}
        onBlur={(event) => actions.onMoveBlur(event, task)}
      >
        Move
      </button>
    </li>
  );
}
