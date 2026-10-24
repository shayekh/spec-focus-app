import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  PRIORITIES,
  STATUSES,
  isPriority,
  isStatus,
  type Priority,
  type Status,
  type Task,
  type TaskInput,
} from "../domain/task";
import { useRestoreFocus } from "./useRestoreFocus";

interface TaskFormProps {
  /** When set, the form edits this task instead of creating a new one. */
  initial?: Task;
  onSave: (input: TaskInput) => void;
  onCancel: () => void;
}

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>("input, select, textarea, button:not([disabled])"),
  );
}

export function TaskForm({ initial, onSave, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [status, setStatus] = useState<Status>(initial?.status ?? "todo");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [titleError, setTitleError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const errorId = useId();
  useRestoreFocus();

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (title.trim() === "") {
      setTitleError("Title is required.");
      titleRef.current?.focus();
      return;
    }
    onSave({
      title,
      description,
      priority,
      status,
      dueDate: dueDate === "" ? null : dueDate,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t !== ""),
    });
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key === "Tab" && dialogRef.current) {
      const items = focusableIn(dialogRef.current);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div className="dialog-backdrop">
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={handleKeyDown}
      >
        <h2 id={headingId}>{initial ? "Edit task" : "New task"}</h2>
        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            Title
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? errorId : undefined}
            />
          </label>
          {titleError && (
            <span id={errorId} className="field-error">
              {titleError}
            </span>
          )}
          <label className="field">
            Description
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="field">
            Priority
            <select
              value={priority}
              onChange={(e) => isPriority(e.target.value) && setPriority(e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Status
            <select
              value={status}
              onChange={(e) => isStatus(e.target.value) && setStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Due date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label className="field">
            Tags (comma-separated)
            <input value={tags} onChange={(e) => setTags(e.target.value)} />
          </label>
          <div className="dialog-actions">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
