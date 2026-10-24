# Contract: Calendar View Behavior (v3)

Observable behavior, verifiable by component and end-to-end tests. IDs refer to
[spec.md](../spec.md).

## Switching views (FR-001)

- A group named "View" holds two buttons, "List" and "Calendar". The current one has `aria-pressed="true"`.
- The filter bar stays above both views (FR-013). The list and the calendar are never shown together.

## Calendar toolbar (FR-002, FR-003)

- Buttons: "Previous", "Next", "Today".
- A heading naming the visible period, announced politely when it changes (for example "October 2026").
- A group named "Calendar view" with buttons "Month", "Week", "Day"; the current one has `aria-pressed="true"`. Month is first and is the default.

## Layout (FR-018)

| View | Structure |
|------|-----------|
| Month | A table with column headers Mon to Sun and 4 to 6 rows of 7 dates |
| Week | A table with the same headers and one row of 7 dates |
| Day | A single date with a list of its tasks (no table) |

## Dates and today (FR-006, FR-016)

- Each date is a `<time datetime="YYYY-MM-DD">`.
- Dates outside the anchor's month (month view) are muted but still accept drops.
- Today has `aria-current="date"`, a filled circle behind its number, and the visually hidden text "Today"; the marker is never color alone.

## Entries (FR-004, FR-005, FR-007)

- Each entry shows: a priority dot, the title, and completed or overdue styling like the list.
- The entry's open button has the task title in its accessible name, plus priority, completed, and overdue state, for example "Plan trip, high priority, overdue".
- Activating the open button (click, Enter, Space) opens the task form modal for that task. Closing it returns focus to that button when it still exists.
- Tasks with no due date have no entry in any view.
- Within a date: not completed first, then high to low priority, then title.

## "+N more" (FR-012)

- In the month view a date shows at most 3 entries. Extra entries are replaced by a button "+N more" (accessible name "N more tasks on <date>") that switches to the day view for that date.

## Empty states (FR-014)

- No tasks in the visible period: a message such as "Nothing due this month", "this week", or "today" (the day view says "Nothing due on <date>").
- When filters hide everything: the same message says "No tasks match your filters in this period" and offers "Clear filters".

## Dragging (FR-008 to FR-010)

- An entry is draggable. While dragging, the date cell under the pointer shows the drop-target style.
- Dropping on a different date sets the due date to it, immediately places the entry there, and saves.
- Dropping on the same date, or outside any date, changes nothing.

## Keyboard move (FR-011)

- Each entry has a "Move <title>" button, visible when the entry has focus or the pointer is over it.
- Activating it starts move mode. A polite live region (role `status`, named "Calendar announcements") announces "Moving <title>. Use the arrow keys to choose a date, Enter to drop it, Escape to cancel." and then the chosen date after each arrow key press.
- Arrow keys: Left and Right move the target by a day, Up and Down by a week; the calendar follows the target when it leaves the visible period. The target date is highlighted.
- Enter drops, Escape cancels. Both end move mode. These keys are handled for the whole page while a move is in progress, so the move keeps working even if the task's own entry leaves the screen when the period changes. Moving focus to another control also ends the move.
- After a drop, focus goes to the moved task's Move button in its new date. After Escape, focus stays on the Move button.

## Keyboard in general (FR-017)

- Every control is reachable with Tab in a logical order (toolbar, then dates left to right and top to bottom, each date's entries in order, with each entry's Move button right after its open button), with a visible focus indicator.

## Narrow windows

- Below about 700px the month and week grids scroll sideways inside their own container; the page itself never scrolls sideways and the toolbar buttons stay on screen. Long titles are cut off inside their cell with the full title in a tooltip and in the accessible name.

## Live updates (FR-015)

- Edits, completion, deletion, and changes from another tab appear on the calendar without a reload.
