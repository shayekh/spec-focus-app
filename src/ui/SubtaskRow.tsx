import { useId, useRef, useState, type KeyboardEvent } from "react";
import { PRIORITIES, isPriority, type Priority } from "../domain/priority";
import { isSubtaskOverdue, type Subtask } from "../domain/subtasks";
import type { Task } from "../domain/task";

export interface SubtaskEdit {
  title: string;
  priority: Priority;
  dueDate: string | null;
}

interface SubtaskRowProps {
  subtask: Subtask;
  /** The parent: its tags are shown, and its status decides whether the subtask can be overdue. */
  task: Task;
  today: string;
  isFirst: boolean;
  isLast: boolean;
  onToggle: (done: boolean) => void;
  /** Returns an error message to show in the row, or `null` when the edit was saved. */
  onSave: (edit: SubtaskEdit) => string | null;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
}

/** One subtask: its checkbox, details, and actions, or its edit fields. */
export function SubtaskRow({
  subtask,
  task,
  today,
  isFirst,
  isLast,
  onToggle,
  onSave,
  onDelete,
  onMove,
}: SubtaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(subtask.title);
  const [priority, setPriority] = useState<Priority>(subtask.priority);
  const [dueDate, setDueDate] = useState(subtask.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const errorId = useId();
  const overdue = isSubtaskOverdue(subtask, task, today);

  function startEdit() {
    setTitle(subtask.title);
    setPriority(subtask.priority);
    setDueDate(subtask.dueDate ?? "");
    setError(null);
    setEditing(true);
    // The fields exist after this render.
    queueMicrotask(() => titleRef.current?.focus());
  }

  function finishEdit() {
    setEditing(false);
    queueMicrotask(() => editButtonRef.current?.focus());
  }

  function save() {
    const problem = onSave({ title, priority, dueDate: dueDate === "" ? null : dueDate });
    if (problem) {
      setError(problem);
      titleRef.current?.focus();
      return;
    }
    finishEdit();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      // Leaving the fields must not also close the dialog.
      event.stopPropagation();
      finishEdit();
    } else if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      save();
    }
  }

  if (editing) {
    return (
      <li className="subtask-row is-editing" data-subtask-id={subtask.id} onKeyDown={handleKeyDown}>
        <label className="field">
          Subtask title
          <input
            ref={titleRef}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </label>
        {error && (
          <span id={errorId} className="field-error">
            {error}
          </span>
        )}
        <label className="field">
          Priority
          <select value={priority} onChange={(event) => isPriority(event.target.value) && setPriority(event.target.value)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Due date (optional)
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <div className="subtask-actions">
          <button type="button" onClick={finishEdit}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={save}>
            Save
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className={`subtask-row${subtask.done ? " is-done" : ""}`} data-subtask-id={subtask.id}>
      <label className="subtask-check">
        <input type="checkbox" checked={subtask.done} onChange={(event) => onToggle(event.target.checked)} />
        <span className="subtask-title">{subtask.title}</span>
      </label>
      <div className="task-meta">
        <span className={`badge priority priority-${subtask.priority}`}>Priority: {subtask.priority}</span>
        {subtask.dueDate && <span className="badge due">Due {subtask.dueDate}</span>}
        {overdue && <span className="badge overdue">Overdue</span>}
        {task.tags.map((tag) => (
          <span key={tag} className="badge">
            {tag}
          </span>
        ))}
      </div>
      <div className="subtask-actions">
        {!isFirst && (
          <button type="button" data-move="up" aria-label={`Move ${subtask.title} up`} onClick={() => onMove("up")}>
            Up
          </button>
        )}
        {!isLast && (
          <button type="button" data-move="down" aria-label={`Move ${subtask.title} down`} onClick={() => onMove("down")}>
            Down
          </button>
        )}
        <button ref={editButtonRef} type="button" aria-label={`Edit ${subtask.title}`} onClick={startEdit}>
          Edit
        </button>
        <button type="button" className="danger-outline" aria-label={`Delete ${subtask.title}`} onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  );
}
