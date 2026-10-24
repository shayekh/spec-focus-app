import { useId, type RefObject } from "react";
import { explainRepeat } from "../domain/recurrence";
import type { RepeatChoice } from "../domain/taskDraft";

/** What changed in the repeat controls. Only the fields that changed are present. */
export type RepeatChange = Partial<{ repeat: RepeatChoice; days: number[]; until: string }>;

interface RepeatFieldsProps {
  repeat: RepeatChoice;
  /** The weekdays ticked for "On selected days" (Monday is 0). */
  days: number[];
  /** The end date, or "" for none. */
  until: string;
  /** The due date in the form, which a weekly or monthly repeat starts from. */
  dueDate: string;
  daysError?: string;
  untilError?: string;
  /** Show the controls but do not let the user change them. */
  disabled?: boolean;
  /** So the form can move focus to the first problem. */
  firstDayRef?: RefObject<HTMLInputElement>;
  untilRef?: RefObject<HTMLInputElement>;
  onChange: (change: RepeatChange) => void;
}

const CHOICES: { value: RepeatChoice; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "days", label: "On selected days" },
];

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isChoice(value: string): value is RepeatChoice {
  return CHOICES.some((choice) => choice.value === value);
}

/** The controls that make a task repeat: how often, on which days, and until when. */
export function RepeatFields({
  repeat,
  days,
  until,
  dueDate,
  daysError,
  untilError,
  disabled = false,
  firstDayRef,
  untilRef,
  onChange,
}: RepeatFieldsProps) {
  const daysErrorId = useId();
  const untilErrorId = useId();
  const sentence = explainRepeat(repeat, dueDate === "" ? null : dueDate);

  function toggleDay(day: number, checked: boolean) {
    const next = checked ? [...new Set([...days, day])] : days.filter((d) => d !== day);
    onChange({ days: next.sort((a, b) => a - b) });
  }

  return (
    <fieldset className="repeat-fields" disabled={disabled}>
      <legend className="visually-hidden">Repeat settings</legend>

      <label className="field">
        Repeat
        <select
          value={repeat}
          onChange={(event) => isChoice(event.target.value) && onChange({ repeat: event.target.value })}
        >
          {CHOICES.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </label>

      {sentence && <p className="repeat-sentence">{sentence}</p>}

      {repeat === "days" && (
        <fieldset className="repeat-days" aria-describedby={daysError ? daysErrorId : undefined}>
          <legend>Repeat on</legend>
          <div className="day-checks">
            {DAY_NAMES.map((name, day) => (
              <label key={name} className="day-check">
                <input
                  ref={day === 0 ? firstDayRef : undefined}
                  type="checkbox"
                  aria-label={name}
                  checked={days.includes(day)}
                  onChange={(event) => toggleDay(day, event.target.checked)}
                />
                <span aria-hidden="true">{DAY_SHORT[day]}</span>
              </label>
            ))}
          </div>
          {daysError && (
            <span id={daysErrorId} className="field-error">
              {daysError}
            </span>
          )}
        </fieldset>
      )}

      {repeat !== "none" && (
        <>
          <label className="field">
            Repeat until (optional)
            <input
              ref={untilRef}
              type="date"
              value={until}
              onChange={(event) => onChange({ until: event.target.value })}
              aria-invalid={untilError ? true : undefined}
              aria-describedby={untilError ? untilErrorId : undefined}
            />
          </label>
          {untilError && (
            <span id={untilErrorId} className="field-error">
              {untilError}
            </span>
          )}
        </>
      )}

      {disabled && <p className="repeat-note">Choose Entire series to change how this task repeats.</p>}
    </fieldset>
  );
}
