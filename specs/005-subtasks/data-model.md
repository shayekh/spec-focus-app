# Data Model: Subtasks (v5)

Extends [001 data-model.md](../001-task-management/data-model.md) and
[004 data-model.md](../004-recurring-tasks/data-model.md). Dates are `YYYY-MM-DD` strings.

## Subtask

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | Required, non-empty, unique within its task |
| `title` | string | Required; at least one character after trimming. Stored trimmed |
| `priority` | `"low" \| "medium" \| "high"` | Required; new subtasks are `"medium"` |
| `dueDate` | string \| null | `null` or a real calendar date |
| `done` | boolean | Required; new subtasks are `false` |

A subtask has no tags of its own. Where tags are shown, they are the parent's current tags.

## Task (additions)

| Field | Type | Rules |
|-------|------|-------|
| `subtasks` | Subtask[] (optional) | Absent when the task has none (an empty list is never stored). At most 50 entries; ids unique. Order is the display order |

Older stored data and older export files have no `subtasks` and remain valid.

### Invariants

- A task with at least one subtask can be in any status. Its subtasks are not constrained by its status, except at the moment it becomes completed, when every subtask becomes done.
- Progress is derived: `done` = subtasks with `done: true`, `total` = all subtasks. It is never stored.

## Subtask operations (`subtasks.ts`)

All are pure. Each takes the task and returns a new task (the input is never changed) with `updatedAt` set to `now`. `Result` means `{ ok: true, ... } | { ok: false, error }`.

| Operation | Effect |
|-----------|--------|
| `addSubtask(task, input, id, now)` | Appends a subtask `{ id, title (trimmed), priority (default medium), dueDate (default null), done: false }`. Errors: "Title is required.", "Due date is not a valid date.", "A task can have up to 50 subtasks." |
| `editSubtask(task, subtaskId, input, now)` | Replaces title, priority, and due date; keeps `done` and position. Same title and date errors; "That subtask no longer exists." |
| `setSubtaskDone(task, subtaskId, done, now)` | Sets `done`. Returns `{ task, offerComplete }` where `offerComplete` is true only when `done` was set to true, the task is not completed, and every subtask is now done. An unknown id returns the task unchanged and `offerComplete: false` |
| `deleteSubtask(task, subtaskId, now)` | Removes it; when none are left the field is removed. Never offers completion |
| `moveSubtask(task, subtaskId, direction, now)` | Swaps with its neighbour. Returns `{ task, position, total }` (position is 1-based, after the move), or `null` when the subtask is unknown or at that end |
| `progress(task)` | `{ done, total }` |
| `describeProgress({ done, total })` | "2 of 5 subtasks complete"; "0 of 1 subtask complete" for a single subtask |
| `isSubtaskOverdue(subtask, task, today)` | True when the subtask is not done, has a due date before `today`, and the task is not completed |
| `completeSubtasks(subtasks)` | Every subtask with `done: true` (same order and ids) |
| `copySubtasks(subtasks, idPrefix)` | The same subtasks, all `done: false`, with ids `${idPrefix}:1`, `${idPrefix}:2`, ... |

### Changes to existing operations

| Operation | Change |
|-----------|--------|
| `completeTask(task, now)` | Also sets every subtask to done |
| `updateTask(task, input, now, seriesId)` | Keeps `subtasks`; if the status changes to completed from another status, every subtask becomes done. A task that was already completed keeps its subtasks as they are |
| `finishCompletion` (series) | The next occurrence gets `copySubtasks(completed.subtasks, newId)` when the completed occurrence has subtasks |
| `deleteOccurrence` | Unchanged: removing a task removes its embedded subtasks with it |

## Validation of stored and imported data

- `isSubtaskList(value)`: an array of 1 to 50 subtasks, each valid, with unique ids.
- `isTask` requires `subtasks` to be absent or satisfy `isSubtaskList`.
- `dropUnreadableSubtasks(value)`: for a record whose `subtasks` is present but does not satisfy `isSubtaskList`, returns a copy without `subtasks`; everything else is returned as it was. Applied, with `dropUnreadableRecurrence`, to every stored task when loading and to every task in an imported file before validating.
