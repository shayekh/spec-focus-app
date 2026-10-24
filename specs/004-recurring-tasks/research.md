# Research: Recurring Tasks (v4)

No `NEEDS CLARIFICATION` remains.

## How a series is stored

- **Decision**: A series is a set of ordinary tasks that share a `seriesId`. Each carries a copy of the rule. Only the open occurrence is "live"; completing it creates the next occurrence as a new task.
- **Rationale**: Matches the spec ("completing creates the next occurrence"), needs no scheduler or background job, keeps history as real completed tasks, and works with everything built so far (list, filters, calendar, export) because an occurrence is just a task.
- **Alternatives considered**: One task plus a list of completion dates (loses per-occurrence edits and breaks list, filter, and export); materializing many future occurrences up front (hundreds of tasks to create and clean up when the rule changes, and an endless series has no end to stop at).

## Rule shape

- **Decision**: `{ kind: "daily" | "weekly" | "monthly" | "days", weekdays: number[], dayOfMonth: number | null, endDate: string | null }`, with Monday as weekday 0. A weekly rule has exactly one weekday, a "days" rule has one or more, a monthly rule has a day of the month, and a daily rule has neither.
- **Rationale**: The rule stores its anchor (weekday or day of month) when it is set, so moving one occurrence to another day never changes the pattern. The same shape serves every kind.
- **Alternatives considered**: An iCalendar RRULE string (a parser and many unsupported features); deriving the anchor from the current due date each time (a moved occurrence would drag the whole series with it).

## Which date is "next"

- **Decision**: `nextDate(rule, after)` returns the first date the rule produces strictly after `after`, or null when it falls past the end date. It is memoryless: it depends only on the rule and `after`, never on earlier occurrences.
- **Rationale**: Memorylessness makes completion, previews, and tests simple. `after` is the completed occurrence's due date (spec clarification: the schedule, not the completion day).
- **Monthly detail**: take the anchor day clamped to the length of the month; if that is not after `after`, move to the next month. 31 January gives 28 or 29 February, then 31 March.

## Previews on the calendar

- **Decision**: `previewsFor(openOccurrences, from, to, today)` returns, for each open recurring occurrence, the rule's dates in `[from, to]` that are after both its due date and today. They are computed on the fly for the visible dates only and never stored.
- **Rationale**: FR-017 to FR-020. Because the rule is memoryless, the sequence can start at `max(dueDate, today, from - 1)` instead of at the series start, so a daily series that began years ago costs at most 42 steps per view.
- **Alternatives considered**: Storing future occurrences (see above); showing previews on dates before today (they would look like missed tasks that were never created).

## Operations return change sets

- **Decision**: Every series operation returns `{ upsert: Task[]; remove: string[]; outcome }`, and the reducer applies it in one step (new action `change`).
- **Rationale**: Completing a task replaces one task and adds another; stopping a series rewrites several; deleting removes one and rewrites others. One action means one save and one render, and no moment where the series has two open occurrences or none.
- **Alternatives considered**: Dispatching several actions in a row (two saves, a flash of an inconsistent list, and a failure between them leaves a broken series).

## Edit scope

- **Decision**: "This occurrence only" changes only the given task. "Entire series" applies title, description, priority, tags, rule, and end date to the series' open occurrence (and so to every occurrence created later); due date and status always apply to the occurrence being edited. When the occurrence being edited is a completed one, the series fields go to the open occurrence and the completed one is left alone.
- **Rationale**: The spec's clarification. Because later occurrences are copies made at completion time, changing the open occurrence is all that is needed to change the future.
- **Repeat controls in "this occurrence only"**: shown but disabled with a note, since the rule belongs to the series.

## Completing by any route

- **Decision**: The Complete button and a status change to "completed" in the form both go through `completeOccurrence`/`saveOccurrence`, so the next occurrence is created exactly once whichever route is used.
- **Reopening**: if a completed occurrence is set back to open while its series already has a newer open occurrence, it is stripped of its rule and series (becoming an ordinary task), so a series never has two open occurrences (FR-011).

## Ending a series

- **Decision**: A series ends when its last occurrence is completed (no date left before the end date), when the user stops it, or when its open occurrence is deleted. In all three cases the rule and series identity are removed from every task in the series, so history shows as ordinary completed tasks.
- **Rationale**: Leaves no half-recurring tasks behind and makes "Repeats weekly" labels trustworthy: a label means the series is live.

## Unreadable data

- **Decision**: Before a stored document or an imported file is validated, tasks whose `recurrence` or `seriesId` is not readable are repaired by dropping those two fields. The task guard then validates the repaired list strictly.
- **Rationale**: FR-022: a bad rule must not make the whole document unreadable. Doing the repair at the two boundaries keeps the guard honest (a `Task` always has a valid rule or none).

## Moving date math into dates.ts

- **Decision**: `addDays`, `addMonths`, `weekdayIndex`, `startOfWeek`, `daysInMonth`, `isSameMonth`, and `isCalendarDate` move into `src/domain/dates.ts`, which imports nothing. `calendar.ts` and `task.ts` re-export them so existing imports keep working.
- **Rationale**: `task.ts` now needs the rule guard, and the rule needs date math, and `calendar.ts` needs `Task`. A shared leaf module breaks the cycle without duplicating code.

## Calendar entries

- **Decision**: Calendar entries show a repeat symbol (an inline SVG, hidden from assistive technology) and the word "repeats" in their accessible name. Previews use a dashed outline, italic title, the word "upcoming" in the name, no drag handle and no Move button.
- **Rationale**: FR-018: distinct without relying on color, and clearly not a real task.

## Series details and one-off edits

- **Decision**: Every task in a live series carries a `seriesTemplate` (title, description, priority, tags). Editing "This occurrence only" changes the task but not the template; editing "Entire series" changes both. The next occurrence and the calendar previews are made from the template.
- **Rationale**: Found while implementing: copying the completed occurrence would make a one-off edit (for example a title changed for one day) repeat forever, which contradicts "this occurrence only". A small template keeps the rule that a series is just ordinary tasks.
- **Alternatives considered**: a separate series record (a second collection to keep in step with the tasks, and a storage version bump); copying from the earliest occurrence (breaks when it is deleted).

## Stopping and deleting

- **Decision**: "Stop repeating" is a button in the task form of a recurring task, behind a confirmation dialog. Deleting a recurring open occurrence uses the existing delete confirmation with an extra sentence saying the series will end.
- **Rationale**: Reuses the dialog and focus behavior from v2 and keeps destructive actions confirmed.

## Testing

- **Decision**: Pure functions get exhaustive tests (24 simulated months per rule kind, month ends, leap years, end dates). Components and app flows get tests through the real UI. Playwright covers the full journeys, the calendar previews in all three views, and keyboard-only use.
- **Rationale**: The risk is in date edge cases and series bookkeeping, which pure tests catch cheaply; the browser tests confirm the pieces fit.
