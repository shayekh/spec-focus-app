import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  PRIORITIES,
  STATUSES,
  isPriority,
  isStatus,
  type Task,
  type TaskInput,
} from "../domain/task";
import {
  isDirty,
  toFormValues,
  toTaskInput,
  validateForm,
  type FormErrors,
  type FormValues,
} from "../domain/taskDraft";
import type { EditScope } from "../domain/series";
import { ConfirmDialog } from "./ConfirmDialog";
import { Modal } from "./Modal";
import { RepeatFields, type RepeatChange } from "./RepeatFields";

interface TaskFormProps {
  /** When set, the form edits this task instead of creating a new one. */
  initial?: Task;
  /**
   * `scope` says whether the changes apply to this task only or to its whole series. Return
   * `false` to keep the form open (for example when the save was refused).
   */
  onSave: (input: TaskInput, scope: EditScope) => boolean | void;
  onCancel: () => void;
  /**
   * Whether the task's series still has an open occurrence. Only then is there a series left to
   * change, so only then does the form offer the choice between this occurrence and the series.
   */
  seriesHasOpen?: boolean;
  /** Ends the task's series right away. The task stays, as an ordinary task. */
  onStopRepeating?: () => void;
  /** A problem with the whole form, shown above the buttons. */
  formError?: string | null;
}

export function TaskForm({
  initial,
  onSave,
  onCancel,
  seriesHasOpen = false,
  onStopRepeating,
  formError,
}: TaskFormProps) {
  const [initialValues, setInitialValues] = useState<FormValues>(() => toFormValues(initial));
  const [values, setValues] = useState<FormValues>(initialValues);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const submitted = useRef(false);
  const [scope, setScope] = useState<EditScope>("occurrence");
  const [confirmingStop, setConfirmingStop] = useState(false);
  const [stopped, setStopped] = useState(false);
  const scopeId = useId();
  const repeats = initial?.recurrence !== undefined && !stopped;
  const showScope = repeats && seriesHasOpen;
  const occurrenceOnly = showScope && scope === "occurrence";
  const titleRef = useRef<HTMLInputElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const firstDayRef = useRef<HTMLInputElement>(null);
  const untilRef = useRef<HTMLInputElement>(null);
  const titleErrorId = useId();
  const dueDateErrorId = useId();

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (key === "title" || key === "dueDate") {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  function changeRepeat(change: RepeatChange) {
    setValues((current) => ({
      ...current,
      ...(change.repeat !== undefined ? { repeat: change.repeat } : {}),
      ...(change.days !== undefined ? { repeatDays: change.days } : {}),
      ...(change.until !== undefined ? { repeatUntil: change.until } : {}),
    }));
    setErrors((current) => ({
      ...current,
      ...(change.days !== undefined ? { repeatDays: undefined } : {}),
      ...(change.until !== undefined ? { repeatUntil: undefined } : {}),
      // Choosing another repeat, or none, makes the old repeat messages stale.
      ...(change.repeat !== undefined ? { repeatDays: undefined, repeatUntil: undefined } : {}),
      ...(change.repeat === "none" ? { dueDate: undefined } : {}),
    }));
  }

  // The Stop repeating button is gone now, so put focus somewhere the keyboard can carry on from.
  useEffect(() => {
    if (stopped) titleRef.current?.focus();
  }, [stopped]);

  /** The series was ended: the form now shows an ordinary task, and that change is already saved. */
  function stopRepeating() {
    setConfirmingStop(false);
    onStopRepeating?.();
    const cleared = { repeat: "none" as const, repeatDays: [], repeatUntil: "" };
    setInitialValues((current) => ({ ...current, ...cleared }));
    setValues((current) => ({ ...current, ...cleared }));
    setErrors((current) => ({ ...current, repeatDays: undefined, repeatUntil: undefined }));
    setScope("occurrence");
    setStopped(true);
  }

  /** Cancel, Close, and Escape all come here: ask first if there is anything to lose. */
  function requestClose() {
    if (isDirty(initialValues, values)) setConfirmingDiscard(true);
    else onCancel();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Two quick submits can arrive before the form unmounts; only the first one counts.
    if (submitted.current) return;

    const found = validateForm(values);
    if (found.title || found.dueDate || found.repeatDays || found.repeatUntil) {
      setErrors(found);
      const firstProblem = found.title
        ? titleRef
        : found.dueDate
          ? dueDateRef
          : found.repeatDays
            ? firstDayRef
            : untilRef;
      firstProblem.current?.focus();
      return;
    }

    submitted.current = true;
    if (onSave(toTaskInput(values, initial?.recurrence ?? null), scope) === false) submitted.current = false;
  }

  return (
    <>
      <Modal
        title={initial ? "Edit task" : "New task"}
        onRequestClose={requestClose}
        showClose
        initialFocusRef={titleRef}
      >
        <form onSubmit={handleSubmit} noValidate>
          {showScope && (
            <fieldset className="scope-choice">
              <legend>Apply changes to</legend>
              <label className="scope-option">
                <input
                  type="radio"
                  name={scopeId}
                  checked={scope === "occurrence"}
                  onChange={() => setScope("occurrence")}
                />
                This occurrence only
              </label>
              <label className="scope-option">
                <input
                  type="radio"
                  name={scopeId}
                  checked={scope === "series"}
                  onChange={() => setScope("series")}
                />
                Entire series
              </label>
            </fieldset>
          )}
          <label className="field">
            Title
            <input
              ref={titleRef}
              value={values.title}
              onChange={(e) => setField("title", e.target.value)}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? titleErrorId : undefined}
            />
          </label>
          {errors.title && (
            <span id={titleErrorId} className="field-error">
              {errors.title}
            </span>
          )}
          <label className="field">
            Description
            <textarea
              rows={3}
              value={values.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </label>
          <label className="field">
            Priority
            <select
              value={values.priority}
              onChange={(e) => isPriority(e.target.value) && setField("priority", e.target.value)}
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
              value={values.status}
              onChange={(e) => isStatus(e.target.value) && setField("status", e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {showScope && <p className="field-note">Applies to this occurrence only.</p>}
          <label className="field">
            Due date
            <input
              ref={dueDateRef}
              type="date"
              value={values.dueDate}
              onChange={(e) => setField("dueDate", e.target.value)}
              aria-invalid={errors.dueDate ? true : undefined}
              aria-describedby={errors.dueDate ? dueDateErrorId : undefined}
            />
          </label>
          {showScope && <p className="field-note">Applies to this occurrence only.</p>}
          {errors.dueDate && (
            <span id={dueDateErrorId} className="field-error">
              {errors.dueDate}
            </span>
          )}
          <RepeatFields
            repeat={values.repeat}
            days={values.repeatDays}
            until={values.repeatUntil}
            dueDate={values.dueDate}
            daysError={errors.repeatDays}
            untilError={errors.repeatUntil}
            firstDayRef={firstDayRef}
            untilRef={untilRef}
            disabled={occurrenceOnly}
            onChange={changeRepeat}
          />
          {repeats && (
            <button type="button" className="link-button" onClick={() => setConfirmingStop(true)}>
              Stop repeating
            </button>
          )}
          <label className="field">
            Tags (comma-separated)
            <input value={values.tags} onChange={(e) => setField("tags", e.target.value)} />
          </label>
          {formError && (
            <p role="alert" className="field-error">
              {formError}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" onClick={requestClose}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Save
            </button>
          </div>
        </form>
      </Modal>
    {confirmingStop && (
      <ConfirmDialog
        title="Stop repeating?"
        message="This ends the series. This task stays, but no new occurrences are created."
        confirmLabel="Stop repeating"
        cancelLabel="Keep repeating"
        onConfirm={stopRepeating}
        onCancel={() => setConfirmingStop(false)}
      />
    )}
    {confirmingDiscard && (
      <ConfirmDialog
        title="Discard changes?"
        message="Your changes have not been saved and will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={onCancel}
        onCancel={() => setConfirmingDiscard(false)}
      />
    )}
    </>
  );
}
