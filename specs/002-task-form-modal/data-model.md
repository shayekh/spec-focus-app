# Data Model: Task Form Modal (v2)

This feature adds no stored data and does not change the `Task` entity from
[001 data-model.md](../001-task-management/data-model.md). It adds one in-memory type.

## FormValues (form draft, in memory only)

The values currently shown in the form. It exists only while the modal is open.

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Required after trimming |
| `description` | string | Free text |
| `priority` | `"low" \| "medium" \| "high"` | Default `"medium"` for a new task |
| `status` | `"todo" \| "in-progress" \| "completed"` | Default `"todo"` for a new task |
| `dueDate` | string | `YYYY-MM-DD`, or empty string for none (matches a date input) |
| `tags` | string | Comma-separated text as typed |

### Derivations

- `toFormValues(task?)`: the initial values. A task gives its saved values (tags joined with `, `, a null due date becomes `""`); no task gives the defaults.
- `toTaskInput(values)`: the `TaskInput` passed to `createTask` or `updateTask` (tags split, trimmed, empties dropped; `""` due date becomes `null`).

### Dirty rule (`isDirty(initial, current)`)

Two form states are the same when, after normalization, every field is equal:

- `title` and `description`: surrounding whitespace trimmed.
- `tags`: split on commas, trimmed, empties dropped, de-duplicated ignoring case, compared in order.
- `dueDate`: `""` equals `""`.
- `priority`, `status`: exact.

`isDirty` is true when any field differs. Changing a value and changing it back is not dirty.

### Validation (`validateForm(values)`)

Returns `{ title?: string; dueDate?: string }`; an empty object means valid.

| Field | Rule | Message |
|-------|------|---------|
| `title` | non-empty after trimming | "Title is required." |
| `dueDate` | empty, or a real calendar date `YYYY-MM-DD` | "Due date is not a valid date." |

## Modal stack (in memory only)

An ordered list of the open modals. Only the last entry is interactive; `#root` and every earlier
entry are inert. It starts empty and is empty again after the last modal closes.
