# Contract: Recurring Tasks Behavior (v4)

Observable behavior, verifiable by component and end-to-end tests. IDs refer to
[spec.md](../spec.md).

## Task form: Repeat (FR-001 to FR-005)

- A group "Repeat settings" below the due date contains:
  - a select labelled "Repeat" with options "Does not repeat", "Daily", "Weekly", "Monthly", "On selected days";
  - for "On selected days", a group "Repeat on" with seven checkboxes Mon to Sun;
  - for Weekly and Monthly, a sentence that says what will happen, for example "Repeats every week on Thursday." or "Repeats on the 31st of every month, or the last day of shorter months." based on the due date in the form;
  - a date field "Repeat until (optional)", shown whenever a repeat is chosen.
- Messages sit beside their field and are linked with `aria-describedby`:
  - repeat chosen with no due date: "Choose a due date to start the repeat from." (under Due date);
  - "On selected days" with none chosen: "Choose at least one day." (under Repeat on);
  - end date before the due date: "End date cannot be earlier than the due date." (under Repeat until).
- Clearing the due date of a recurring task is not accepted: the same message appears.

## Task form: edit scope (FR-012, FR-013)

- When the task being edited belongs to a live series that has an open occurrence, a radio group "Apply changes to" appears at the top of the form with "This occurrence only" (selected by default) and "Entire series".
- With "This occurrence only", the Repeat controls are shown but disabled, with the note "Choose Entire series to change how this task repeats."
- Beside the Due date and Status fields, a note reads "Applies to this occurrence only." whenever the scope group is shown.
- Saving with "Entire series" updates the series' open occurrence and every occurrence created afterwards.

## Task form: Stop repeating (FR-015)

- A recurring task's form has a button "Stop repeating", after the Repeat group.
- It opens the confirmation "Stop repeating?" with "Keep repeating" (default focus) and "Stop repeating". Confirming turns the task into an ordinary task, closes the confirmation, and leaves the form open so the user can still save other changes.
- Choosing "Does not repeat" with "Entire series" selected and saving has the same effect.

## Completing (FR-007 to FR-011)

- The Complete button, and saving with status "completed", both create the next occurrence for a recurring task.
- A polite announcement says what happened: `Completed "<title>". Next one is due <date>.` or `Completed "<title>". That was the last occurrence.`
- Completing a task does not change any other task.
- Setting a completed occurrence back to open, when the series already has a newer open occurrence, makes it an ordinary task.

## Deleting (FR-016)

- Deleting a recurring open occurrence shows the usual confirmation with an added sentence: "This task repeats. Deleting it also ends the series."

## List (FR-006)

- A recurring task shows a badge with the rule description, for example "Repeats weekly on Thursday until Dec 31, 2026". The badge also has a repeat symbol (hidden from assistive technology).
- Completed occurrences of a live series show the same badge.

## Calendar (FR-017 to FR-020)

- A real entry for a recurring task shows a repeat symbol, and its accessible name includes "repeats": `Water plants, medium priority, repeats`.
- Upcoming dates appear as preview entries: dashed outline, italic title, the repeat symbol, and the accessible name `Water plants, medium priority, repeats, upcoming`. A preview has no Move button, is not draggable, and selecting it (click, Enter, Space) opens the series' open occurrence in the task form.
- Previews appear only on visible dates after the open occurrence's due date and after today, and never after the end date.
- Previews count toward the month view's "+N more".
- Filters that hide the open occurrence also hide its previews.
- Moving the open occurrence (drag or keyboard) moves the previews with it.

## Keyboard and themes (FR-023)

- Every control above is reachable and operable by keyboard with a visible focus indicator, and meets contrast standards in both themes.
