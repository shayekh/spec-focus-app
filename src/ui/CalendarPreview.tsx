import type { Task } from "../domain/task";
import type { Preview } from "../domain/series";
import { RepeatIcon } from "./RepeatIcon";

interface CalendarPreviewProps {
  preview: Preview;
  /** Opens the series' open occurrence, the one task a preview stands for. */
  onOpen: (task: Task) => void;
}

/**
 * A future occurrence of a repeating task. It is a reminder of what is coming, not a task: it
 * cannot be dragged or moved, and selecting it opens the open occurrence it comes from.
 */
export function CalendarPreview({ preview, onOpen }: CalendarPreviewProps) {
  const label = `${preview.title}, ${preview.priority} priority, repeats, upcoming`;
  return (
    <li className="cal-entry cal-preview" data-preview-date={preview.date}>
      <button
        type="button"
        className="cal-entry-open"
        aria-label={label}
        title={preview.title}
        onClick={() => onOpen(preview.task)}
      >
        <span className={`priority-dot priority-${preview.priority}`} aria-hidden="true" />
        <span className="cal-entry-title">{preview.title}</span>
        <RepeatIcon />
      </button>
    </li>
  );
}
