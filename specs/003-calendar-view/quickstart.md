# Quickstart: Validating the Calendar View (v3)

Prerequisites and commands are the same as the [001 quickstart](../001-task-management/quickstart.md)
(Node.js 22.12 or newer, `npm install`, `npm run dev`). Behavior details live in
[contracts/ui-contract.md](contracts/ui-contract.md) and the date rules in
[data-model.md](data-model.md).

## Automated checks

```bash
npm run typecheck
npm test            # includes the calendar date logic and component tests
npm run test:e2e    # includes tests/e2e/calendar.spec.ts
```

Expected: everything passes.

## Manual scenarios

Set up some tasks first: one due today, one in a few days, one next month, one overdue, one with
no due date, and one completed.

1. **Switch views**: Choose "Calendar". Expected: a month calendar for the current month replaces the list; "List" brings the list back unchanged.
2. **Month contents**: Check each dated task is on its date, the undated task is nowhere, and today has a circle around its number (and is announced as "Today" by a screen reader).
3. **Navigate**: Use Next, Previous, and Today. Expected: the heading changes; Today returns to this month.
4. **Week and day**: Choose Week, then Day. Expected: the date you were looking at stays in view; Previous and Next move by a week, then a day.
5. **Open a task**: Click a task. Expected: the task form modal opens with all fields; close it and focus returns to that task.
6. **Reschedule by dragging**: Drag a task onto another date. Expected: the date is highlighted while you drag; on release the task moves there and stays after a reload. Drop it on its own date or outside the grid: nothing changes.
7. **Reschedule by keyboard**: Tab to a task's "Move" button and press Enter, then press the arrow keys (Right is a day, Down is a week) and Enter. Expected: the task moves, focus lands on it in its new place, and a screen reader announces each chosen date. Repeat and press Escape: nothing changes.
8. **Past dates**: Move a task to a date before today. Expected: it shows as overdue.
9. **Crowded day**: Give one day five tasks. Expected: the month view shows three and a "+2 more" button that opens that day.
10. **Filters**: Filter by a tag. Expected: the calendar shows only matching tasks; switching to the list shows the same ones.
11. **Two tabs**: Open the app in two tabs and move a task in one. Expected: the other tab's calendar updates without a reload.
12. **Keyboard only and themes**: Complete scenarios 1 to 7 without a mouse, in both light and dark themes.
13. **Month edges**: Look at February in a leap year, and December to January. Expected: the right number of days and the right weekday for the 1st.
