# Data Model: Recurring Tasks (v4)

Extends [001 data-model.md](../001-task-management/data-model.md). Dates are `YYYY-MM-DD` strings;
weekdays are numbers with Monday as 0 and Sunday as 6.

## Recurrence

| Field | Type | Rules |
|-------|------|-------|
| `kind` | `"daily" \| "weekly" \| "monthly" \| "days"` | Required |
| `weekdays` | number[] | `daily`, `monthly`: empty. `weekly`: exactly one value 0 to 6. `days`: one or more distinct values 0 to 6, ascending |
| `dayOfMonth` | number \| null | `monthly`: an integer 1 to 31. All other kinds: `null` |
| `endDate` | string \| null | `null` or a real calendar date. Occurrences after it are never created |

### Building a rule (`buildRule`)

From the form's choices and the due date in the form:

- `daily`: no anchor.
- `weekly`: `weekdays = [weekday of the due date]`.
- `monthly`: `dayOfMonth = day of the due date`.
- `days`: `weekdays` = the chosen days, sorted and de-duplicated.

When an existing rule is edited and its kind and days are not changed, the stored anchor is kept
(only the end date changes), so editing a task never moves its pattern.

### Validation (`validateRecurrence`)

| Problem | Message |
|---------|---------|
| Repeat chosen but no due date | "Choose a due date to start the repeat from." |
| `days` with no day chosen | "Choose at least one day." |
| End date not a real date | "End date is not a valid date." |
| End date before the due date | "End date cannot be earlier than the due date." |

### Next date (`nextDate(rule, after)`)

The first date strictly after `after` that the rule produces, or `null` if that date is after
`endDate`:

| Kind | Result |
|------|--------|
| `daily` | `after` plus 1 day |
| `weekly`, `days` | the next date after `after` whose weekday is in `weekdays` (1 to 7 days ahead) |
| `monthly` | `dayOfMonth` in `after`'s month, clamped to the month's length, if that is after `after`; otherwise the same in the next month |

The function is memoryless: the result depends only on the rule and `after`.

### Range (`datesBetween(rule, after, from, to)`)

All dates `nextDate` produces in sequence after `after` that lie in `[from, to]`, starting from
`max(after, from - 1 day)` so the cost depends on the range, not on how old the series is. Capped at
400 dates.

### Description (`describeRecurrence(rule)`)

| Rule | Text |
|------|------|
| daily | "Repeats daily" |
| weekly on Thursday | "Repeats weekly on Thursday" |
| monthly on the 31st | "Repeats monthly on the 31st" |
| days Mon, Wed, Fri | "Repeats Mon, Wed, Fri" |
| with end date | the above plus " until Dec 31, 2026" |

## Task (additions)

| Field | Type | Rules |
|-------|------|-------|
| `recurrence` | Recurrence (optional) | Present only on tasks that belong to a live series. Requires `dueDate` to be set |
| `seriesId` | string (optional) | Present exactly when `recurrence` is. Shared by all occurrences of a series (a UUID created when a task is first made to repeat) |
| `seriesTemplate` | SeriesTemplate (optional) | Present exactly when `recurrence` is. The series' own `title`, `description`, `priority` and `tags`. A one-off edit to an occurrence changes only the task; the next occurrence, and the calendar previews, are made from the template, so a one-off edit never carries forward. Editing "Entire series" changes the template |

Tasks that do not repeat have neither field. Older stored data and older export files have neither
and remain valid.

### Invariants

- A series has at most one open occurrence (status other than `completed`). Operations keep this true; imported data that breaks it is tolerated (each open task is treated on its own).
- A live series's completed occurrences keep `recurrence` and `seriesId` (history shown with the label). When a series ends, every task in it loses both fields.
- A task with `recurrence` always has a `dueDate`.

## Series operations (`series.ts`)

Each returns a **change set**: `{ upsert: Task[]; remove: string[]; outcome }`. `upsert` tasks replace
an existing task with the same id, or are added to the front of the list if new.

| Operation | Effect |
|-----------|--------|
| `completeOccurrence(task, now, newId)` | Marks the task completed. If it repeats and `nextDate(rule, dueDate)` exists, adds a new occurrence: title, description, priority and tags from the series template, the same rule and series; `status: "todo"`; the next due date; new `id`, `createdAt`, `updatedAt`. Outcome `"next"`. If no date is left, ends the series (outcome `"last"`); a non-recurring task has outcome `"done"` |
| `saveOccurrence(tasks, original, input, scope, now, ids)` | Applies an edit. See below |
| `createOccurrence(input, now, ids)` | Makes a new task from the form. If it repeats, it starts a new series with its own template |
| `stopSeries(tasks, seriesId)` | Removes `recurrence`, `seriesId` and `seriesTemplate` from every task in the series |
| `deleteOccurrence(tasks, task)` | Removes the task. If it was the open occurrence of a live series, also ends the series for the remaining tasks |
| `openOccurrence(tasks, seriesId)` | The series' task whose status is not `completed`, or `undefined` |
| `previewsFor(tasks, from, to, today)` | For each open recurring task in `tasks`, the rule's dates in `[from, to]` after its due date and after today, as `{ task, date, title, priority }`, where `title` and `priority` come from the series template |

### `saveOccurrence` in detail

Input is the form's `TaskInput` (which may carry `recurrence`, or `null` to clear it) and a scope.

1. **Not part of a series, no rule asked for**: an ordinary update.
2. **Not part of a series, a rule asked for**: the task joins a new series (new `seriesId`) with the built rule. If its status is completed, the completion flow runs.
3. **Part of a series, scope "occurrence"**: update this task's title, description, priority, tags, due date, and status only; the rule is unchanged. If the status becomes completed, run the completion flow. If a completed task is reopened while another open occurrence exists, strip its rule and series.
4. **Part of a series, scope "series"**: let `open` be the series' open occurrence. Apply title, description, priority, tags, and the rule (including its end date) to `open`. If the edited task is `open`, also apply due date and status to it (completing it if the status becomes completed). If the edited task is a completed one, leave it untouched. If the input rule is `null`, the series is stopped.

## Previews

A preview is `{ task, date }`: the open occurrence and a future date. It is never stored, has no id
of its own, and exists only while the calendar draws.

## Export file

Adds two optional fields per task, `recurrence` and `seriesId`. See
[contracts/data-contract.md](contracts/data-contract.md).
