# Contract: Subtasks UI (v5)

Behavior the user can see and operate. Exact wording below is part of the contract (tests use it).

## Task list item (FR-006)

- A task with subtasks shows a line "N of M subtasks complete" (for example "2 of 5 subtasks complete"; "0 of 1 subtask complete" for one) and, beside or under it, a bar whose filled part is `N / M` of its width. The bar is hidden from assistive technology; the text carries the meaning.
- A task with no subtasks shows neither.
- Every task has a button labelled "Subtasks" with the accessible name `Subtasks for <title>`; it opens the Subtasks dialog.

## Subtasks dialog (FR-001 to FR-005)

- A modal dialog (same behavior as the other dialogs: focus trap, Escape closes, page underneath unavailable, focus returns to the button that opened it) titled `Subtasks: <task title>`, with a Close button.
- At the top: the progress line (as in the list) in a status region, or "No subtasks yet." when there are none.
- An add row: a text field labelled "New subtask" and a button "Add subtask". Enter in the field adds. After adding, the field is cleared and keeps focus.
  - A blank title adds nothing and shows "Title is required." under the field; the message clears when the user types.
  - At 50 subtasks the add row shows "A task can have up to 50 subtasks." and adds nothing.
- The subtasks are an ordered list (accessible name "Subtasks") in the user's order. Each row has:
  - a checkbox whose accessible name is the subtask's title (checked when complete);
  - the title (wraps; struck through when complete);
  - badges: `Priority: <priority>`, `Due <date>` when set, and `Overdue` when overdue (text, not color alone);
  - the parent's tags as badges (read-only);
  - buttons with accessible names `Edit <title>`, `Delete <title>`, `Move <title> up`, `Move <title> down` (visible text "Edit", "Delete", "Up", "Down"). The first row has no Move up and the last has no Move down.
- Ticking or unticking a checkbox applies at once. Delete applies at once, without a confirmation.
- Moving a row announces `<title> moved to position <n> of <total>` and keeps focus on the same row's button in the same direction; when the row reaches an end, focus goes to its other move button.
- Status region announcements: `Added "<title>". <progress>`, `<title> marked complete. <progress>` / `<title> marked not complete. <progress>`, `Deleted "<title>". <progress>` (or `Deleted "<title>".` when none remain), and `Saved "<title>".`

## Editing a subtask (FR-003)

- Choosing Edit turns that row into fields labelled "Subtask title", "Priority" (low, medium, high), and "Due date (optional)", with buttons "Save" and "Cancel". Focus goes to the title field.
- Save with a blank title shows "Title is required." under the title field and keeps the fields open. A due date that is not a real date is not accepted by the date field; if one is entered the row shows "Due date is not a valid date."
- Cancel, and Escape inside the fields, restore the row without closing the dialog. After Save or Cancel, focus returns to that row's Edit button.

## Prompt to complete the parent (FR-007)

- When completing a subtask makes all subtasks complete and the task is not completed, a confirmation dialog titled `Complete task?` over the Subtasks dialog says `All subtasks of "<title>" are complete. Complete the task too?` with buttons "Leave open" (focused first) and "Complete task".
- "Complete task" completes the task exactly like its Complete button (including the next occurrence of a repeating task, and its announcement) and closes the prompt; the Subtasks dialog stays open and shows the completed state. "Leave open" and Escape close only the prompt.
- No prompt appears when the task is already completed, and none follows a delete, edit, un-complete, or move.

## Deleting a parent (FR-010)

- The delete confirmation for a task with subtasks adds the sentence `Its N subtasks will be deleted too.` (`Its 1 subtask will be deleted too.` for one).

## Task form

- Unchanged (subtasks are not edited there). Setting the status to completed and saving completes the subtasks (FR-008).

## Keyboard, layout, and themes (FR-015)

- Every control above is reachable and operable by keyboard with a visible focus indicator.
- The dialog and list fit a 375px-wide window with long titles and no sideways page scrolling; controls wrap instead of overflowing.
- All text and the progress bar meet the app's contrast standards in both themes.
