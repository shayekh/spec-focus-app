import { useEffect, useId, useRef, useState } from "react";
import {
  addSubtask,
  deleteSubtask,
  describeProgress,
  editSubtask,
  moveSubtask,
  progress,
  setSubtaskDone,
} from "../domain/subtasks";
import type { Task } from "../domain/task";
import { Modal } from "./Modal";
import { SubtaskRow, type SubtaskEdit } from "./SubtaskRow";

interface SubtasksDialogProps {
  /** The live task: every change replaces it through `onChange`. */
  task: Task;
  today: string;
  onChange: (task: Task) => void;
  /** Called after the last subtask was completed on an open task, so the app can ask about the task. */
  onOffer: (task: Task) => void;
  onClose: () => void;
}

/** Where focus goes after the list re-renders: a move button of a row, or the add field. */
type FocusTarget = { id: string; direction: "up" | "down" } | "add" | null;

export function SubtasksDialog({ task, today, onChange, onOffer, onClose }: SubtasksDialogProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const errorId = useId();
  const subtasks = task.subtasks ?? [];
  const summary = describeProgress(progress(task));

  useEffect(() => {
    if (focusTarget === null) return;
    if (focusTarget === "add") {
      addRef.current?.focus();
    } else {
      const rows = Array.from(listRef.current?.querySelectorAll("[data-subtask-id]") ?? []);
      const row = rows.find((el) => el.getAttribute("data-subtask-id") === focusTarget.id);
      const other = focusTarget.direction === "up" ? "down" : "up";
      const button =
        row?.querySelector<HTMLElement>(`[data-move="${focusTarget.direction}"]`) ??
        row?.querySelector<HTMLElement>(`[data-move="${other}"]`);
      button?.focus();
    }
    setFocusTarget(null);
  }, [focusTarget]);

  function handleAdd() {
    const result = addSubtask(task, { title }, crypto.randomUUID(), new Date());
    if (!result.ok) {
      setError(result.error);
      addRef.current?.focus();
      return;
    }
    onChange(result.task);
    setTitle("");
    setError(null);
    setAnnouncement(`Added "${result.subtask.title}". ${describeProgress(progress(result.task))}`);
    addRef.current?.focus();
  }

  function handleToggle(id: string, done: boolean) {
    const subtask = subtasks.find((s) => s.id === id);
    if (!subtask) return;
    const result = setSubtaskDone(task, id, done, new Date());
    onChange(result.task);
    setAnnouncement(
      `${subtask.title} marked ${done ? "complete" : "not complete"}. ${describeProgress(progress(result.task))}`,
    );
    if (result.offerComplete) onOffer(result.task);
  }

  function handleSave(id: string, edit: SubtaskEdit): string | null {
    const result = editSubtask(task, id, edit, new Date());
    if (!result.ok) return result.error;
    onChange(result.task);
    setAnnouncement(`Saved "${edit.title.trim()}".`);
    return null;
  }

  function handleDelete(id: string) {
    const subtask = subtasks.find((s) => s.id === id);
    if (!subtask) return;
    const next = deleteSubtask(task, id, new Date());
    onChange(next);
    setAnnouncement(
      next.subtasks ? `Deleted "${subtask.title}". ${describeProgress(progress(next))}` : `Deleted "${subtask.title}".`,
    );
    setFocusTarget("add");
  }

  function handleMove(id: string, direction: "up" | "down") {
    const subtask = subtasks.find((s) => s.id === id);
    const moved = moveSubtask(task, id, direction, new Date());
    if (!subtask || !moved) return;
    onChange(moved.task);
    setAnnouncement(`${subtask.title} moved to position ${moved.position} of ${moved.total}`);
    setFocusTarget({ id, direction });
  }

  return (
    <Modal title={`Subtasks: ${task.title}`} onRequestClose={onClose} showClose initialFocusRef={addRef}>
      <p className="subtasks-summary">{subtasks.length > 0 ? summary : "No subtasks yet."}</p>
      <p role="status" aria-label="Subtasks announcements" className="visually-hidden">
        {announcement}
      </p>
      <div className="subtask-add">
        <label className="field">
          New subtask
          <input
            ref={addRef}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </label>
        <button type="button" className="primary" onClick={handleAdd}>
          Add subtask
        </button>
      </div>
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
      {subtasks.length > 0 && (
        <ol ref={listRef} className="subtask-list" aria-label="Subtasks">
          {subtasks.map((subtask, index) => (
            <SubtaskRow
              key={subtask.id}
              subtask={subtask}
              task={task}
              today={today}
              isFirst={index === 0}
              isLast={index === subtasks.length - 1}
              onToggle={(done) => handleToggle(subtask.id, done)}
              onSave={(edit) => handleSave(subtask.id, edit)}
              onDelete={() => handleDelete(subtask.id)}
              onMove={(direction) => handleMove(subtask.id, direction)}
            />
          ))}
        </ol>
      )}
    </Modal>
  );
}
