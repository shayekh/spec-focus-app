# Quickstart: Validating Subtasks (v5)

Prerequisites and commands are the same as the [001 quickstart](../001-task-management/quickstart.md)
(Node.js 22.12 or newer, `npm install`, `npm run dev`). Behavior details live in
[contracts/ui-contract.md](contracts/ui-contract.md), the rules in [data-model.md](data-model.md).

## Automated checks

```bash
npm run typecheck
npm test            # subtask rules, cascade, series copy, dialog, list, and app tests
npm run test:e2e    # includes tests/e2e/subtasks.spec.ts
```

Expected: everything passes.

## Manual scenarios

1. **Add subtasks**: On a task, choose Subtasks. Type "Draft", press Enter, type "Review", press Enter. Expected: both appear in order, the field keeps focus, and the list shows "0 of 2 subtasks complete".
2. **Blank and limit**: Press Enter on an empty field. Expected: "Title is required." and nothing added. (Optional) add 50 and try a 51st: "A task can have up to 50 subtasks."
3. **Progress**: Tick "Draft". Expected: "1 of 2 subtasks complete" and the bar half full, in the dialog and in the list. Untick it: back to 0 of 2.
4. **The prompt**: Tick both. Expected: a prompt "Complete task?" appears; the task is still open behind it. Choose "Leave open": nothing changes. Untick and tick one again to see the prompt return. Choose "Complete task": the task and its subtasks are complete.
5. **Parent completes subtasks**: On a task with three subtasks, tick one, close the dialog, click Complete on the task. Expected: reopening shows all three complete and "3 of 3".
6. **Form status**: Do the same by setting the status to completed in the task form. Expected: the same result.
7. **Reopen**: Set the completed task back to "todo". Expected: its subtasks stay complete.
8. **Edit**: Choose Edit on a subtask, change its title, priority, and add a due date in the past, Save. Expected: new title, priority and due badges, and an "Overdue" badge. Cancel and Escape inside the fields discard changes without closing the dialog.
9. **Reorder**: Use "Down" on the first subtask, then "Up" on the last. Expected: the order changes, focus stays on a move button of the moved row, and the position is announced. The first row has no Up and the last no Down.
10. **Delete**: Delete a subtask. Expected: it disappears immediately and the progress updates; deleting the last one shows "No subtasks yet." and removes the progress from the list.
11. **Tags**: Give the task tags, open Subtasks. Expected: each subtask shows the tags. Change the task's tags: the subtasks show the new ones.
12. **Repeating task**: Make a task repeat weekly with two subtasks, tick one, then click Complete on the task. Expected: the completed occurrence has both subtasks complete; the new occurrence has the same two subtasks, none complete.
13. **Delete a parent**: Delete a task with subtasks. Expected: the confirmation says how many subtasks will be deleted too.
14. **Backup**: Export, clear site data, import. Expected: subtasks, their order, priorities, due dates, and completion come back.
15. **Keyboard, narrow, themes**: Do scenarios 1, 3, 4, 8, 9, and 10 using only the keyboard, in both themes, and in a 375px-wide window with a very long subtask title: nothing scrolls sideways.
