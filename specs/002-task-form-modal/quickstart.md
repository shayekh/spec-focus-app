# Quickstart: Validating the Task Form Modal (v2)

Prerequisites and commands are the same as [001 quickstart](../001-task-management/quickstart.md)
(Node.js 22.12 or newer, `npm install`, `npm run dev`). Behavior details live in
[contracts/ui-contract.md](contracts/ui-contract.md) and the draft rules in
[data-model.md](data-model.md).

## Automated checks

```bash
npm run typecheck
npm test            # includes taskDraft, modalStack, Modal, TaskForm, and App modal tests
npm run test:e2e    # includes tests/e2e/modal.spec.ts
```

Expected: everything passes.

## Manual scenarios

1. **Add in a modal**: Select "New task". Expected: a modal opens over the list with defaults medium and todo; the list underneath is dimmed.
2. **Edit in the same modal**: Select Edit on a task with every field filled in. Expected: the same modal, titled "Edit task", pre-filled.
3. **Required title**: Save with an empty title. Expected: the modal stays open, the message sits under Title, and focus is on Title.
4. **Close without changes**: Open the modal and press Escape, then repeat with Cancel and with the close button. Expected: each closes immediately; focus returns to the button you opened it from.
5. **Close with changes**: Type in any field, then press Escape. Expected: "Discard changes?" appears with "Keep editing" focused. Choose "Keep editing": the form is still open with your text. Repeat and choose "Discard": both dialogs close and the list is unchanged.
6. **Revert a change**: Type a character, delete it, close. Expected: no confirmation.
7. **Backdrop click**: Click the dimmed area. Expected: nothing happens.
8. **Page underneath is unavailable**: With the modal open, try clicking the page, pressing Tab repeatedly, and (with a screen reader) browsing. Expected: nothing underneath responds, Tab wraps inside the modal, and the page is not announced.
9. **Stacked dialogs**: Open the discard confirmation. Expected: the form is not reachable until the confirmation closes, and Escape closes only the confirmation.
10. **Double save**: Fill in a title and press Enter twice quickly. Expected: one task is created.
11. **Task deleted elsewhere**: Open Edit on a task, delete that task in a second browser tab, then Save. Expected: the modal stays open with a message that the task no longer exists.
12. **Keyboard only**: Complete scenarios 1 to 6 without a mouse. Expected: every control is reachable with a visible focus indicator.
