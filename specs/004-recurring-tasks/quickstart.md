# Quickstart: Validating Recurring Tasks (v4)

Prerequisites and commands are the same as the [001 quickstart](../001-task-management/quickstart.md)
(Node.js 22.12 or newer, `npm install`, `npm run dev`). Behavior details live in
[contracts/ui-contract.md](contracts/ui-contract.md), the rules in [data-model.md](data-model.md).

## Automated checks

```bash
npm run typecheck
npm test            # rule math, series operations, form, list, calendar, and app tests
npm run test:e2e    # includes tests/e2e/recurring.spec.ts
```

Expected: everything passes.

## Manual scenarios

1. **Set a repeat**: Create a task due on a Thursday. In the form choose Repeat, then Weekly. Expected: a sentence says it repeats every week on Thursday; set "Repeat until" a few weeks ahead; save. The list shows "Repeats weekly on Thursday until ...".
2. **Needs a due date**: Open a task with no due date and choose a repeat. Expected: the message under Due date; saving is refused.
3. **Selected days**: Choose "On selected days", tick Monday, Wednesday, Friday, save. Expected: the label reads "Repeats Mon, Wed, Fri". With no day ticked, saving is refused.
4. **Complete it**: Click Complete on the recurring task. Expected: it shows as completed, a new open one appears with the next date, and the announcement names the date. Nothing else changes.
5. **Late completion**: Complete a daily task that was due a week ago. Expected: the next one is due the day after the old due date (and is overdue), not tomorrow.
6. **Month ends**: Make a task repeat monthly on the 31st and complete it in turn. Expected: 31 Jan, 28 (or 29) Feb, 31 Mar, 30 Apr.
7. **The end**: Complete the occurrence whose next date would pass the end date. Expected: no new occurrence, a note that this was the last one, and the task shows no repeat label.
8. **Edit one or all**: Edit the open occurrence's title with "This occurrence only", then complete it: the next one has the old title. Repeat with "Entire series": the next one has the new title and earlier completed ones keep theirs. Note that due date and status always apply to one occurrence.
9. **Stop**: Use "Stop repeating" and confirm. Expected: the task is ordinary, completing it creates nothing, and completed occurrences remain.
10. **Delete**: Delete a recurring task. Expected: the confirmation mentions the series; afterwards nothing new appears.
11. **Calendar**: Open the calendar on a weekly series with an end date. Expected: the open occurrence and completed ones are entries with the repeat symbol; later weeks show dashed "upcoming" previews up to the end date and none after. Select a preview: the open occurrence's form opens. Previews cannot be dragged and have no Move button.
12. **Move the open one**: Drag the open occurrence a few days. Expected: the previews follow the rule from the new date; completing it creates the next one from there.
13. **Filters**: Filter so the open occurrence is hidden. Expected: its previews disappear too.
14. **Backup**: Export, clear site data, import. Expected: rules, end dates, and series come back; the calendar previews are the same.
15. **Keyboard and themes**: Do scenarios 1, 3, 4, 8, and 9 using only the keyboard, in both themes.
