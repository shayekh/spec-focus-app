# Research: Calendar View (v3)

No `NEEDS CLARIFICATION` remains.

## Calendar library or hand-built

- **Decision**: Build the calendar by hand on top of pure date functions.
- **Rationale**: The need is small (three views, tasks per day, one drag) and the constitution asks for the simplest thing that works. A library would add a dependency, its own styling and focus behavior to bring in line with our themes and contrast tests, and weight for features we do not use (times, durations, recurrence).
- **Alternatives considered**: FullCalendar or similar (large, time-grid oriented, hard to make match the keyboard and theme requirements); react-big-calendar (same concerns).

## Date representation

- **Decision**: Dates stay `YYYY-MM-DD` strings everywhere. Arithmetic (add days, weekday, month length) goes through `Date.UTC` and `getUTC*` only, and strings are compared as strings.
- **Rationale**: FR-016 says a due date is a calendar date. Local-time `Date` objects shift across daylight-saving changes (a "midnight plus 24 hours" can land on the same day), and `new Date("2030-01-05")` parses as UTC while `new Date(2030, 0, 5)` is local. Doing everything in UTC on whole days removes both traps.
- **Alternatives considered**: A date library (dependency for a few small functions); local `Date` math (the daylight-saving bug above).

## Week and month grids

- **Decision**: Weeks start on Monday. The month grid starts on the Monday on or before the 1st and ends on the Sunday on or after the last day, giving 4 to 6 rows of 7 dates.
- **Rationale**: FR-018. Computed from the weekday (0 to 6 where Monday is 0) so it does not depend on the user's locale.
- **Alternatives considered**: Locale-dependent first day (browser support for the week-info API is uneven, and it would make tests depend on the machine).

## Stepping and switching views

- **Decision**: Calendar state is `{ view, anchor }`. Previous and Next move the anchor by one month, 7 days, or 1 day; month stepping clamps the day (31 January plus one month is 28 or 29 February). Switching view keeps the anchor, so "the date you were looking at" stays in view. Today sets the anchor to today.
- **Rationale**: One small value covers all three views and meets the spec's "date stays in view" rule.

## Drag and drop

- **Decision**: Use the browser's native HTML drag and drop. The calendar entry is `draggable`, carries the task id in `dataTransfer`, and each date cell handles `dragover` and `drop`. The date under the pointer gets a drop-target style.
- **Rationale**: No dependency, works in all desktop browsers, and Playwright can drive it in Chromium.
- **Alternatives considered**: A pointer-event drag implementation (more code, more edge cases); a drag library (dependency).

## Keyboard alternative to dragging

- **Decision**: Every entry has a visible-on-focus "Move" button. Activating it starts move mode on that task: the arrow keys choose the target date (left and right by one day, up and down by one week, and the calendar follows if the target leaves the visible period), Enter drops, and Escape cancels. A live region announces the chosen date. After a drop, focus goes to the moved task's Move button in its new place.
- **Rationale**: The constitution requires the UI to be keyboard accessible, and a drag with no alternative fails the WCAG dragging-movements criterion. A button works with every assistive technology and needs no single-letter shortcut. SC-003: start (Enter on Move), direction, confirm (Enter) is 3 presses for one day or one week.
- **Alternatives considered**: A single-letter shortcut (hard to discover, conflicts with typing); a "Move to date" dialog with a date input (more key presses and a second modal); drag with the arrow keys directly on the entry (no visible control to find).

### Handling the move keys

- **Decision**: While a move is in progress the arrow keys, Enter, and Escape are handled by one `keydown` listener on the document (capture phase), not by the Move button.
- **Rationale**: Found by the day-view test. Arrowing past the visible period changes what is on screen, and the moved task's own entry (with its focused Move button) can leave the page, so a handler on the button would stop receiving keys. The document-level handler keeps working, and once the move ends focus returns to the Move button of the task in its new place.

### Testing the drag

- **Decision**: Browser tests dispatch the browser's own drag events (dragstart, dragenter, dragover, drop, dragend) built with a real `DataTransfer`, so the app's handlers run exactly as for a user.
- **Rationale**: Playwright's `dragTo` and its mouse-driven drag emulation dropped the final dragover while the page re-rendered mid-drag, so drops landed unpredictably. Stepping the real mouse by hand in Chromium does start the drag and move the task, which was checked manually. The drop-target marking, same-date and outside-date rules are also covered by component tests.

## Where move and details live

- **Decision**: Selecting an entry opens the v2 task form modal through the same `onEdit` path the list uses. Reschedules dispatch the existing `update` action with the changed `dueDate` and `updatedAt`.
- **Rationale**: One edit path, one persistence path, cross-tab sync for free (spec 001, FR-021).

## Semantics of the calendar

- **Decision**: Month and week views are `<table>`s with column headers (Mon to Sun). Each cell has the date as a `<time>` element, a list of entries, and, for today, `aria-current="date"` plus a visible marker shaped differently from other dates (a filled circle and the word "Today" for assistive technology). The day view is a single list.
- **Rationale**: A table gives screen readers row and column context without the roving-focus machinery of the ARIA grid pattern, and Tab reaches every control in date order (FR-017). Today is marked by shape and text, not only color (FR-006).
- **Alternatives considered**: ARIA `role="grid"` with arrow-key cell navigation (more code and more ways to get it wrong, and the arrow keys are already used by move mode).

## Narrow windows

- **Decision**: The month and week tables keep a minimum width and sit in their own horizontally scrollable container; the toolbar wraps and stays visible. The container is the positioning context for the visually hidden text inside the grid.
- **Rationale**: Seven readable columns need more than 375px. Without a positioning context, the hidden text (absolutely positioned) escaped the container's clipping and widened the whole page, which the layout test caught.
- **Alternatives considered**: Switching to a single-column agenda below a breakpoint (a second layout to build and test); shrinking cells until titles are unreadable.

## Many tasks in one day

- **Decision**: The month view shows at most 3 entries per day, then a "+N more" button that switches to the day view for that date. Week and day views show every task.
- **Rationale**: FR-012. Keeps cells a stable size and keeps every task reachable.

## Shared filters

- **Decision**: `App` already computes the filtered, sorted tasks for the list. The calendar receives the same filtered set (but groups it by date instead of using the list order).
- **Rationale**: FR-013, one source of truth for "which tasks are visible". The filter bar stays visible above both views.

## Ordering within a day

- **Decision**: Within a date, incomplete tasks come before completed ones, then by priority (high, medium, low), then by title.
- **Rationale**: The most actionable tasks show first, which matters most under the "+N more" cut-off.

## Performance

- **Decision**: Group tasks by date once per change (`Map<string, Task[]>`), and memoize the grid for the visible period.
- **Rationale**: SC-005. Month grids are at most 42 cells, so rendering cost is small; grouping 500 tasks is linear.

## Testing

- **Decision**: Unit tests for every date function, with leap years, month and year boundaries, and week starts. Component tests for the views and move mode. Playwright for real drag and drop, the keyboard move, focus return, shared filters, narrow layout, and the 500-task timing.
- **Rationale**: jsdom does not implement real drag and drop or layout, so those need a browser.
