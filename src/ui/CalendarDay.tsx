import type { DragEvent } from "react";
import { describeDate } from "../domain/calendar";
import type { Task } from "../domain/task";
import type { Preview } from "../domain/series";
import { CalendarEntry, TASK_DRAG_TYPE, type EntryActions } from "./CalendarEntry";
import { CalendarPreview } from "./CalendarPreview";

/** How a date reacts to a task being dragged over it. */
export interface DropHandlers {
  onEnter: (date: string) => void;
  onLeave: (date: string) => void;
  onDrop: (date: string, taskId: string) => void;
}

interface CalendarDayProps {
  date: string;
  today: string;
  /** A date outside the month being shown (month view only). */
  outside?: boolean;
  entries: Task[];
  /** Future occurrences of repeating tasks, drawn after the real entries. */
  previews?: Preview[];
  /** Show at most this many entries, then a "+N more" button. No limit when omitted. */
  limit?: number;
  /** Render as a block (day view) instead of a table cell. */
  block?: boolean;
  /** True while a dragged or keyboard-moved task is aimed at this date. */
  isDropTarget: boolean;
  actions: EntryActions;
  drop: DropHandlers;
  /** Called by the "+N more" button. */
  onShowDay: (date: string) => void;
}

function carriesTask(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes(TASK_DRAG_TYPE);
}

/** One date cell: its date, today marker, the tasks due on it, and a place to drop a task. */
export function CalendarDay({
  date,
  today,
  outside = false,
  entries,
  previews = [],
  limit,
  block = false,
  isDropTarget,
  actions,
  drop,
  onShowDay,
}: CalendarDayProps) {
  const Wrapper = block ? "div" : "td";
  const isToday = date === today;
  const total = entries.length + previews.length;
  const room = limit === undefined ? total : limit;
  const shownEntries = entries.slice(0, room);
  const shownPreviews = previews.slice(0, Math.max(0, room - shownEntries.length));
  const hidden = total - shownEntries.length - shownPreviews.length;
  const classes = [
    "cal-day",
    block ? "cal-day-block" : "",
    outside ? "is-outside" : "",
    isToday ? "has-today" : "",
    isDropTarget ? "is-drop-target" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Wrapper
      className={classes}
      onDragEnter={(event: DragEvent) => {
        if (!carriesTask(event)) return;
        event.preventDefault();
        drop.onEnter(date);
      }}
      onDragOver={(event: DragEvent) => {
        if (!carriesTask(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDragLeave={(event: DragEvent) => {
        // Moving onto a child of this date is not leaving it.
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        drop.onLeave(date);
      }}
      onDrop={(event: DragEvent) => {
        if (!carriesTask(event)) return;
        event.preventDefault();
        drop.onDrop(date, event.dataTransfer.getData(TASK_DRAG_TYPE));
      }}
    >
      <div className="cal-day-head">
        <time
          dateTime={date}
          className={isToday ? "is-today" : undefined}
          aria-current={isToday ? "date" : undefined}
        >
          <span className="cal-day-number" aria-hidden="true">
            {Number(date.slice(8))}
          </span>
          <span className="visually-hidden">
            {describeDate(date)}
            {isToday ? ", today" : ""}
          </span>
        </time>
      </div>
      {shownEntries.length + shownPreviews.length > 0 && (
        <ul className="cal-entries">
          {shownEntries.map((task) => (
            <CalendarEntry key={task.id} task={task} today={today} actions={actions} />
          ))}
          {shownPreviews.map((preview) => (
            <CalendarPreview key={`${preview.task.id}:${preview.date}`} preview={preview} onOpen={actions.onOpen} />
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <button
          type="button"
          className="cal-more"
          aria-label={`${hidden} more tasks on ${describeDate(date)}`}
          onClick={() => onShowDay(date)}
        >
          +{hidden} more
        </button>
      )}
    </Wrapper>
  );
}
