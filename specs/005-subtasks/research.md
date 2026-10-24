# Research: Subtasks (v5)

Decisions made while planning. Nothing here needed outside research; each is a choice among simple options.

## Where subtasks are stored

- **Decision**: An optional `subtasks` array on the parent task, in the order the user chose. A task with none has no field.
- **Rationale**: Subtasks live and die with their parent, are always read together with it, and are capped at 50. Embedding means one save, one export field, and no way for a subtask to outlive its parent. List order is the array order, so reordering needs no extra numbers.
- **Alternatives considered**: a separate `subtasks` collection with `parentId` (a second thing to keep in step on delete, import, and cross-tab changes, and a storage version bump); making a subtask a full task (would drag in status, tags, recurrence, and calendar behavior the spec does not want).

## What a subtask has

- **Decision**: `id`, `title`, `priority`, `dueDate` (or null), and `done` (boolean). No tags, status, or description.
- **Rationale**: The spec gives subtasks their own due date and priority, and "complete or not". Tags are inherited, so they are read from the parent when shown and never stored; changing the parent's tags then updates every subtask with no extra code.
- **Alternatives considered**: reusing the `Status` type for subtasks (an "in progress" subtask is not asked for and complicates the progress count).

## Where the user manages subtasks

- **Decision**: A Subtasks dialog opened from a button on each list item. Its changes apply at once.
- **Rationale**: The task form is already a long form with a draft, a discard confirmation, and a repeat section; adding live-editing child rows to it would mix two saving models. A dialog reuses `Modal` (focus trap, isolation, focus return) and can show a long list with room for edit fields at 375px. Applying changes immediately matches ticking a checkbox: there is nothing to "save".
- **Alternatives considered**: inline rows in the list item (crowds the list and makes reordering and editing hard on narrow screens); a section in the task form (needs draft handling for ids, order, and completion, and the "prompt to complete the parent" would fight the form's own status field).

## Reordering

- **Decision**: "Move up" and "Move down" buttons per subtask; the first has no Move up and the last no Move down. After a move, focus stays on the same subtask's button in the same direction, or moves to the other direction's button at an end, and the new position is announced.
- **Rationale**: Keyboard and touch friendly with no drag-and-drop code, consistent with the calendar's Move button idea. Drag is out of scope (spec Assumptions).
- **Alternatives considered**: drag handles (pointer only; would need a keyboard alternative anyway); numbered position fields (clumsy).

## The prompt to complete the parent

- **Decision**: `setSubtaskDone` reports `offerComplete: true` only when a subtask has just been marked done, the parent is not completed, and every subtask is now done. The app then shows a confirmation dialog "Complete <task> too?" over the Subtasks dialog; agreeing runs the same completion as the Complete button.
- **Rationale**: The prompt follows from one action, so declining needs no memory: it cannot return until another subtask is completed. Deleting or editing never prompts (spec Edge Cases). Reusing the confirmation dialog gives focus handling, Escape, and a safe default for free; focus starts on "Leave open", the safe choice.
- **Alternatives considered**: a toast or inline banner (easy to miss, no focus handling, harder for screen readers); remembering a "dismissed" flag (extra state with no benefit).

## Completing the parent

- **Decision**: `completeTask` (used by the Complete button, the prompt, and series completion) and `updateTask` (used when the form changes the status to completed) both mark every subtask done at the moment the parent changes to completed. Reopening leaves subtasks alone.
- **Rationale**: One rule in `task.ts` covers every route, so no path can leave a completed parent with unfinished subtasks. Applying it only on the transition keeps a completed parent that later gets a new subtask from being silently changed on the next edit.
- **Alternatives considered**: doing it in the UI layer per route (easy to miss one); deriving "all done" at display time instead of storing (would make a completed parent's subtasks look done while stored undone, breaking export fidelity).

## Repeating tasks

- **Decision**: The next occurrence gets a copy of the completed occurrence's subtasks with new ids (derived from the new occurrence's id and the position), all not done.
- **Rationale**: A recurring checklist should start fresh each time. Copying from the occurrence at completion is the smallest rule; it does mean a subtask added to one occurrence repeats, which the spec records as an assumption. Deriving ids keeps the operation pure and deterministic with the single id the caller already supplies.
- **Alternatives considered**: keeping subtasks in `seriesTemplate` (a second copy to keep in step, and "this occurrence only" edits would need a scope choice in the dialog); not copying them (a recurring "weekly review" would lose its checklist).

## Progress

- **Decision**: Progress is derived (`done` count over total), never stored. The list shows text "N of M subtasks complete" and a bar that is hidden from assistive technology.
- **Rationale**: A stored counter can disagree with the list; deriving makes SC-002 true by construction. Text carries the meaning so it never depends on color or the bar.
- **Alternatives considered**: a native `<progress>` element (screen readers would read the value twice next to the text).

## Bad stored or imported data

- **Decision**: Like unreadable recurrence in v4, a task whose `subtasks` value is not a valid list (wrong shape, duplicate ids, more than 50, bad priority or date) keeps all its other fields and loses only its subtasks, at load and at import.
- **Rationale**: One bad subtask must not make the whole document or the whole import fail, and dropping the list is simpler and safer than guessing which entries to keep.
- **Alternatives considered**: dropping only the bad entries (partial lists would silently change progress); rejecting the file (loses the user's data over an optional field).

## Calendar and search

- **Decision**: Unchanged. They work on parent tasks only.
- **Rationale**: Spec FR-013. Subtask due dates are informational, so there is nothing to draw or search.

## Testing

- **Decision**: Pure functions get exhaustive tests (every operation, limits, ordering, the prompt condition, the cascade, the series copy, repair). Components and app flows are tested through the real UI. Playwright covers each user story, keyboard-only use, a 375px window with long titles, and timing with 500 tasks and 1000 subtasks.
- **Rationale**: The risk is in bookkeeping (counts, order, the cascade); pure tests catch it cheaply and the browser tests confirm the pieces fit.
