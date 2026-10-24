# Contract: User Interface

Observable behavior the UI must provide. Each item is verifiable by component or end-to-end tests.

## Main screen

- A task list showing, per task: title, priority, status, due date (if any), tags, and overdue/completed styling (FR-007, FR-008).
- A toolbar with: "New task" button, search box, status filter, priority filter, tag filter, sort selector, export/import menu, theme toggle.
- Empty states: no tasks at all (invites creating one) and no matches (offers "Clear filters") (FR-011).
- A live region announces the result count and errors to assistive technology.

## Task form (create and edit dialog)

- Fields: title (required), description, priority, status, due date, tags.
- Submitting with an empty title shows an inline error tied to the title field; nothing is saved (FR-003).
- Escape or Cancel closes without saving; focus returns to the control that opened it.

## Task actions

- "Complete" control on each task sets status to completed in one action (FR-005).
- "Edit" opens the form pre-filled. "Delete" opens a confirm dialog; only Confirm removes the task (FR-006).

## Keyboard (FR-015, SC-004)

- Every control is reachable with Tab and activated with Enter or Space.
- Dialogs trap focus, close with Escape, and show visible focus indicators.
- No action requires a pointing device.

## Theme (FR-014)

- Toggle switches light and dark immediately across the whole UI; choice persists; first load follows the system preference.

## Import / export (FR-018, FR-019)

- Export downloads a file per [export-file.md](export-file.md).
- Import accepts a file, shows an overwrite warning if tasks exist, and shows a clear error for invalid files without altering tasks.

## Multiple tabs (FR-021)

- A change saved in one tab appears in other open tabs without reload.
