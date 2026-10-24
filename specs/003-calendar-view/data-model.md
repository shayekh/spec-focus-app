# Data Model: Calendar View (v3)

This feature adds no stored data and no fields. It changes `Task.dueDate` only when the user moves
a task. See [001 data-model.md](../001-task-management/data-model.md) for the task.

All dates are `YYYY-MM-DD` strings (calendar dates with no time zone). Arithmetic is done in UTC on
whole days.

## CalendarState (in memory only)

| Field | Type | Rules |
|-------|------|-------|
| `view` | `"month" \| "week" \| "day"` | Starts as `"month"` |
| `anchor` | date string | The date the user is looking at; starts as today; always a real calendar date |

### Operations

- `shift(state, direction)`: `direction` is `-1` or `1`. Month: one month, with the day clamped to the target month's length (31 Jan plus 1 month gives 28 or 29 Feb). Week: 7 days. Day: 1 day.
- `setView(state, view)`: changes `view`, keeps `anchor`.
- `goToDate(state, date)`: sets `anchor`.
- `today(state, today)`: sets `anchor` to today.
- `visibleDates(state)`: the dates the view shows (see below).
- `heading(state)`: text for the period, for example "October 2026", "Oct 19 to Oct 25, 2026", "Sunday, October 25, 2026".

### Visible dates

| View | Dates |
|------|-------|
| Month | Monday on or before the 1st of the anchor's month, through the Sunday on or after its last day; 28 to 42 dates, in rows of 7 |
| Week | Monday through Sunday of the anchor's week (7 dates) |
| Day | the anchor (1 date) |

A month-grid date outside the anchor's month is "outside the period" and is shown muted but still
accepts tasks and drops.

## CalendarEntry (derived)

A task placed on one date. A task has at most one entry, on its `dueDate`; tasks with
`dueDate === null` have none.

`entriesByDate(tasks)` returns `Map<date, Task[]>`, each list ordered by:
1. not completed before completed,
2. priority: high, medium, low,
3. title, alphabetically (case-insensitive).

## Rescheduling

`rescheduleTask(task, date, now)` returns the task with `dueDate = date` and `updatedAt = now` when
`date` is a real calendar date different from the current `dueDate`; otherwise it returns the task
unchanged (the same object), so the caller can skip saving. A task that moves to a date before
today is overdue under the normal rule (not completed and due before today).

## MoveState (in memory only)

The keyboard move in progress.

| Field | Type | Rules |
|-------|------|-------|
| `taskId` | string | The task being moved |
| `target` | date string | Starts at the task's due date; changes with the arrow keys |

Arrow keys: left −1 day, right +1 day, up −7 days, down +7 days. Enter drops (calling
`rescheduleTask` with `target`). Escape discards. When `target` leaves the visible dates, the
anchor follows it so the target stays on screen.
