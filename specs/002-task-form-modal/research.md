# Research: Task Form Modal (v2)

No `NEEDS CLARIFICATION` remains.

## Gap analysis against the current code

| Spec requirement | Current state |
|------------------|---------------|
| FR-001 to FR-003 modal with all fields | Done in v1 |
| FR-004 close button | **Missing** (only Cancel) |
| FR-005 validation message attached to the field | **Partial**: only the title is validated in the form; other errors (for example an invalid due date from `createTask`) are announced to screen readers but not shown |
| FR-006 to FR-009 discard confirmation | **Missing**: Cancel and Escape always close without asking |
| FR-010 backdrop click does not close | Done (no handler) |
| FR-011 page underneath unavailable | **Partial**: the backdrop blocks the pointer and Tab is trapped, but the page is not `inert`, so assistive technology can still reach it, and the form is not isolated while a confirmation is open |
| FR-012 focus trap | Done, but duplicated in two components |
| FR-013 Escape closes only the topmost dialog | Works by `stopPropagation`; fragile |
| FR-014 focus return | Done via `useRestoreFocus` |
| FR-016 one component for add and edit | Done (`TaskForm`); the dialog shell is duplicated with `ConfirmDialog` |
| FR-017 dialog semantics | Done |
| FR-018 save once | **Missing**: two quick submits create two tasks |
| FR-019 task no longer exists on save | **Missing**: the update silently does nothing and the modal closes |

## Making the page underneath unavailable

- **Decision**: Set the `inert` attribute on `#root` (and on any lower modal) while a modal is open.
- **Rationale**: `inert` blocks pointer events, removes the subtree from the Tab order, and hides it from assistive technology in one step, which is exactly FR-011. It is supported in all current desktop browsers.
- **Alternatives considered**: `aria-hidden` on `#root` plus the existing Tab trap (does not stop pointer or programmatic focus, and `aria-hidden` on a focusable region is an accessibility error); the native `<dialog>` element with `showModal()` (also gives inertness, but changes focus and Escape handling and is awkward to test in jsdom); a focus-trap library (a new dependency for something small).

## Remembering the control that opened the modal

- **Decision**: `Modal` records the focused element once per dialog instance, in a layout effect, before the page is made inert, and restores focus to it in a microtask after the modal leaves the stack.
- **Rationale**: Three things interact. Making the page inert blurs the focused control, so the opener must be read first. React's development-mode double run of effects would otherwise read the already-blurred page the second time and remember `body`; keeping the value in a ref makes it once per dialog. And when two dialogs close in one update (the form plus its discard confirmation), focus must move only after both have left the stack, or the inert page rejects it.
- **Found by**: the real-browser focus-return tests (`tests/e2e/modal.spec.ts`), which failed before this fix. jsdom cannot reproduce it because it does not blur inert elements.
- **Fallback**: if the opener no longer exists (for example a saved task that a filter now hides), focus goes to the element marked `data-modal-fallback`, the "New task" button, unless something else already has focus.

## Stacked dialogs

- **Decision**: A module-level `modalStack` records open modals in order. Whenever it changes, only the topmost modal is interactive: `#root` and every lower modal container get `inert`.
- **Rationale**: Satisfies FR-011 and FR-013 together. The form is inert while the discard confirmation is open, and Escape inside the confirmation can only reach the confirmation.
- **Alternatives considered**: Passing an "isBlocked" prop through the tree (spreads coupling through the components); rendering the confirmation inside the form's dialog (breaks the focus-return and Escape layering).

## Rendering location

- **Decision**: `Modal` renders through a React portal into its own container appended to `document.body`, so `#root` can be made inert without affecting the modal.
- **Alternatives considered**: Rendering inside `#root` and making siblings inert (the modal would sit inside the inert subtree).

## What counts as an unsaved change

- **Decision**: A pure `isDirty(initial, current)` compares normalized values: title and description trimmed, tags normalized (trimmed, de-duplicated ignoring case), empty due date equal to none. Changing a value and changing it back is not dirty.
- **Rationale**: Matches the spec assumption; keeps the rule testable with no UI.
- **Alternatives considered**: A "touched" flag set on first keystroke (wrongly asks to confirm after type-then-delete); deep-equal on raw strings (asks to confirm for trailing-space-only differences).

## Validation

- **Decision**: A pure `validateForm(values)` returns an error per field (`title`, `dueDate`); the form shows each next to its field, links it with `aria-describedby`, and focuses the first invalid field.
- **Rationale**: Closes FR-005 and keeps business rules in `src/domain/`, not in the component. `createTask` and `updateTask` keep their own checks as the last line of defense.

## Saving once

- **Decision**: The form ignores any submit after the first accepted one, using a ref that is set synchronously.
- **Rationale**: Two Enter presses can arrive before React re-renders and unmounts the form, so state alone is too late.

## Task deleted while editing

- **Decision**: On save of an edit, `App` checks that the task id still exists in the current list. If it does not, the modal stays open and shows a form-level error ("This task no longer exists, so your changes cannot be saved.").
- **Rationale**: FR-019. Other tabs can delete the task (spec 001, FR-021), and a silent no-op would lose the user's text.

## Backdrop clicks

- **Decision**: No click handler on the backdrop. The backdrop only dims and blocks.
- **Rationale**: The spec's clarification: a stray click must never discard work.

## Testing

- **Decision**: Unit tests for `taskDraft` and `modalStack`; component tests for `Modal`, `TaskForm`, `ConfirmDialog`, and the `App` save-missing-task path; Playwright for real-browser `inert`, Tab wrapping, Escape layering, and focus return.
- **Rationale**: jsdom does not enforce `inert`, so real-browser behavior needs Playwright; everything else is faster to test in isolation.
