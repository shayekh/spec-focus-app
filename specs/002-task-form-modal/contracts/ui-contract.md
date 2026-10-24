# Contract: Task Form Modal Behavior (v2)

Observable behavior, verifiable by component and end-to-end tests. IDs refer to
[spec.md](../spec.md).

## Opening

- "New task" opens the modal titled "New task" with the defaults (medium, todo) and every other field empty (FR-001, FR-003).
- A task's "Edit" opens the same modal titled "Edit task", with every field pre-filled (FR-002, FR-016).
- Focus moves to the first field (FR-012).

## Controls

- The modal header has a close button with the accessible name "Close" (FR-004).
- The footer has "Cancel" and "Save" (FR-004).
- Tab order: title, description, priority, status, due date, tags, Cancel, Save, Close. Tab from the last control wraps to the first; Shift+Tab from the first wraps to the last (FR-012). The Close button sits in the top corner but comes last in the Tab order so the fields keep first place.

## Saving

- Invalid values keep the modal open. Each message sits next to its field, linked with `aria-describedby`, and focus moves to the first invalid field (FR-005).
- Valid values save, close the modal, and return focus to the opener (FR-005, FR-014).
- Activating Save more than once quickly saves one task (FR-018).
- Editing a task that no longer exists keeps the modal open and shows a form-level alert, "This task no longer exists, so your changes cannot be saved." (FR-019).

## Closing and discarding

| Action | No changes | Unsaved changes |
|--------|------------|-----------------|
| Cancel, Close, or Escape | closes immediately | opens the discard confirmation |
| Click on the dimmed area | nothing | nothing |

- The discard confirmation is a dialog titled "Discard changes?" with the buttons "Keep editing" (default focus) and "Discard" (FR-007, FR-009).
- "Discard" closes both dialogs and returns focus to the opener. "Keep editing" or Escape closes only the confirmation and returns focus to the form control that was focused before (FR-009, FR-013).
- A change reverted to its original value is not a change (FR-008).

## Isolation

- While any modal is open, `#root` has the `inert` attribute. While the confirmation is open, the form's container is also `inert` (FR-011).
- Escape reaches only the topmost dialog (FR-013).
- The modal and its backdrop are above all other content.

## Accessibility

- Each dialog has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing at its heading (FR-017).
- Every control has a visible focus indicator and is reachable and operable by keyboard (FR-015).
- Text and borders meet the app's contrast standards in both themes (SC-006).
