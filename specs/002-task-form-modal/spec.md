# Feature Specification: Task Form Modal (v2)

**Feature Branch**: `002-task-form-modal`

**Created**: 2026-10-25

**Status**: Implemented

**Extends**: [001-task-management](../001-task-management/spec.md)

**Extended by**: [005-subtasks](../005-subtasks/spec.md) (reuses this dialog shell for the Subtasks dialog), [004-recurring-tasks](../004-recurring-tasks/spec.md) (adds the Repeat settings, edit scope and Stop repeating to this form) and [003-calendar-view](../003-calendar-view/spec.md), which opens this same task form from a calendar task and relies on its focus-return and unsaved-changes behavior

**Input**: User description: "Update the task creation and editing experience in Focus App. The Add Task and Edit Task forms are presented in a modal dialog rather than as inline or dedicated-page forms. Add opens an empty form; edit opens the same form populated with the task's current values. The modal contains title, description, priority, status, due date, and tags, with Save, Cancel, and close buttons. Saving validates and persists. Canceling or closing discards unsaved changes, and if there are unsaved changes the app asks for confirmation first. The modal appears above the current view, prevents interaction with the page underneath, traps keyboard focus, closes with Escape, returns focus to the control that opened it, and is fully usable by keyboard. The same modal component and form are reused for both creating and editing."

## Clarifications

### Session 2026-10-25

- Q: Does clicking the dimmed area outside the modal close it? → A: No. Only Cancel, the close button, and Escape close it, so a stray click never discards work.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a task in a modal (Priority: P1)

A user selects "New task" and a modal opens above the task list with an empty form. They fill it in and save, the modal closes, and the new task appears in the list.

**Why this priority**: Creating tasks is the entry point to the whole app, and the modal is the way v2 delivers it.

**Independent Test**: Select "New task", confirm an empty form appears in a modal over the list, enter a title, save, and confirm the modal closes and the task is listed.

**Acceptance Scenarios**:

1. **Given** the task list is showing, **When** the user selects "New task", **Then** a modal opens above the list with an empty form containing title, description, priority, status, due date, and tags.
2. **Given** the new-task modal is open, **When** the user enters a title and saves, **Then** the task is persisted, the modal closes, and the task appears in the list.
3. **Given** the new-task modal is open, **When** the user saves with an empty title, **Then** the modal stays open, a clear message explains that a title is required, and nothing is saved.
4. **Given** the new-task modal is open, **When** the user looks at the form, **Then** priority shows "medium" and status shows "todo" by default.

---

### User Story 2 - Edit a task in the same modal (Priority: P1)

A user selects an existing task to edit. The same modal opens, pre-filled with that task's current values. They change something, save, and see the update in the list.

**Why this priority**: Editing is half of the feature, and reusing one form keeps add and edit behavior identical.

**Independent Test**: Edit an existing task, confirm every field shows its current value, change one, save, and confirm the list shows the change.

**Acceptance Scenarios**:

1. **Given** a task with values in every field, **When** the user selects it to edit, **Then** the modal opens with title, description, priority, status, due date, and tags pre-filled with its current values.
2. **Given** the edit modal is open, **When** the user changes a field and saves, **Then** the change is persisted, the modal closes, and the list shows the updated task.
3. **Given** the add and edit modals, **When** the user compares them, **Then** they look and behave the same apart from the heading and the initial values.

---

### User Story 3 - Cancel or close without losing work by accident (Priority: P2)

A user changes their mind and closes the modal. If they changed nothing, it just closes. If they changed something, the app asks before throwing the changes away.

**Why this priority**: It protects against accidental data loss, but it only matters after the form works.

**Independent Test**: Open the modal, type in a field, try to close it by each route, and confirm a confirmation appears; then open it, change nothing, close it, and confirm no confirmation appears.

**Acceptance Scenarios**:

1. **Given** the modal is open with no changes, **When** the user selects Cancel, selects the close button, or presses Escape, **Then** the modal closes immediately with no confirmation.
2. **Given** the user has changed at least one field, **When** they select Cancel, select the close button, or press Escape, **Then** the app asks them to confirm discarding their changes before closing.
3. **Given** the discard confirmation is showing, **When** the user confirms, **Then** the modal closes and the changes are discarded, with the task list unchanged.
4. **Given** the discard confirmation is showing, **When** the user declines or presses Escape, **Then** the confirmation closes and the form is still open with their changes intact.
5. **Given** the user changed a field and then changed it back to its original value, **When** they close the modal, **Then** it closes without a confirmation, because nothing differs from what was saved.
6. **Given** the modal is open, **When** the user clicks the dimmed area outside it, **Then** nothing happens and the modal stays open.

---

### User Story 4 - Use the modal entirely with the keyboard (Priority: P2)

A keyboard user opens the modal, moves through every field and button with Tab, saves or cancels, and ends up back on the control they started from.

**Why this priority**: The constitution requires keyboard accessibility, and a modal that leaks focus or loses its place is unusable without a mouse.

**Independent Test**: With only the keyboard, open the modal from a task's Edit button, tab around the whole form, close it with Escape, and confirm focus is back on that Edit button.

**Acceptance Scenarios**:

1. **Given** the modal is opening, **When** it appears, **Then** keyboard focus moves into it, onto the first field.
2. **Given** focus is on the last control in the modal, **When** the user presses Tab, **Then** focus moves to the first control in the modal, and Shift+Tab from the first control moves to the last, so focus never reaches the page underneath.
3. **Given** the modal is open, **When** the user tries to interact with the page underneath by pointer or keyboard, **Then** nothing underneath responds and assistive technology treats the underlying page as unavailable.
4. **Given** the modal was opened from a control (for example "New task" or a task's Edit button), **When** it closes by any route (save, cancel, close button, Escape, or confirmed discard), **Then** focus returns to that control, or to a sensible nearby control if it no longer exists.
5. **Given** a keyboard-only user, **When** they add a task, edit a task, and cancel with and without changes, **Then** every step is possible without a pointing device, with a visible focus indicator throughout.

---

### Edge Cases

- **Escape inside the discard confirmation**: closes only the confirmation and returns to the form, not the form itself.
- **Escape with no changes**: the modal closes at once, and focus returns to the opener.
- **Saving an edit when the task no longer exists** (for example it was deleted in another browser tab): the modal stays open and shows a clear message that the task no longer exists, so the user can copy their text before closing.
- **Validation errors on save**: the modal stays open, the error is attached to the field, and focus moves to the first invalid field.
- **Very long text in any field**: the modal scrolls internally and stays usable on small windows, and the Save and Cancel buttons stay reachable.
- **Opening the modal for a task, then another tab changes that task**: the form keeps the user's in-progress values and does not overwrite them.
- **Double-activating Save**: the task is saved once.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Add Task form MUST open in a modal dialog above the current view, not inline or on a separate page.
- **FR-002**: The Edit Task form MUST open in a modal dialog above the current view, pre-filled with the task's current title, description, priority, status, due date, and tags.
- **FR-003**: The modal MUST contain fields for title, description, priority, status, due date, and tags.
- **FR-004**: The modal MUST provide a Save button, a Cancel button, and a close button.
- **FR-005**: Saving MUST validate the form (title required) and, when valid, persist the task and close the modal; when invalid, the modal MUST stay open with a clear message attached to the offending field.
- **FR-006**: Canceling or closing the modal MUST discard unsaved changes.
- **FR-007**: If the user closes the modal (Cancel, close button, or Escape) while any field differs from its initial value, the app MUST ask for confirmation before discarding the changes.
- **FR-008**: If the user closes the modal while no field differs from its initial value, it MUST close without any confirmation.
- **FR-009**: Declining the discard confirmation MUST return the user to the form with all their changes intact.
- **FR-010**: Clicking the area outside the modal MUST NOT close it.
- **FR-011**: While the modal is open, the page underneath MUST NOT respond to pointer or keyboard input and MUST be hidden from assistive technology as unavailable.
- **FR-012**: Keyboard focus MUST move into the modal when it opens and MUST stay trapped inside it, wrapping from last to first control and from first to last with Shift+Tab.
- **FR-013**: The Escape key MUST close the modal, subject to the unsaved-changes confirmation, and MUST close only the topmost dialog when two are showing.
- **FR-014**: When the modal closes by any route, keyboard focus MUST return to the control that opened it.
- **FR-015**: Every action in the modal (filling fields, saving, canceling, closing, confirming or declining discard) MUST be possible by keyboard alone, with a visible focus indicator.
- **FR-016**: Adding and editing MUST use the same modal and the same form implementation, so their layout, validation, and keyboard behavior are identical.
- **FR-017**: The modal MUST expose an accessible name and dialog semantics so assistive technology announces it as a modal dialog with its heading ("New task" or "Edit task").
- **FR-018**: Saving MUST happen once even if the user activates Save more than once in quick succession.
- **FR-019**: If the task being edited no longer exists when the user saves, the modal MUST stay open and show a clear message instead of silently creating or losing the task.

### Key Entities

- **Task**: The existing task (title, description, priority, status, due date, tags) defined in the baseline specification. This feature does not change it.
- **Form draft**: The user's in-progress, unsaved values for one add or edit session. It exists only while the modal is open, starts from the task's saved values (or the defaults for a new task), and is discarded on cancel, close, or after a successful save.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open the form, add a task with a title, and see it in the list within 20 seconds, with the form never leaving the current screen.
- **SC-002**: 100% of attempts to close the modal with unsaved changes ask for confirmation, and 0% of attempts to close it with no changes do.
- **SC-003**: After the modal closes by any route, keyboard focus is back on the control that opened it in 100% of cases where that control still exists.
- **SC-004**: With the modal open, 0 interactions with the page underneath succeed by pointer or keyboard.
- **SC-005**: Adding, editing, canceling with changes, and canceling without changes can each be completed using only the keyboard.
- **SC-006**: Text and borders in the modal meet the same contrast standards as the rest of the app in both themes.

## Assumptions

- This feature changes how the existing task form is presented and how it handles closing; it does not add or change task fields, the task model, or how tasks are stored.
- The app already opens the form in a modal with focus handling and Escape support. This specification states the full required behavior so that gaps, such as the close button, the unsaved-changes confirmation, and the underlying-page isolation, can be found and closed.
- "Unsaved changes" means any field whose current value differs from its value when the modal opened (compared after trimming surrounding spaces and normalizing tags), so changing a value and changing it back is not a change.
- The discard confirmation is a second, smaller modal shown above the form, and it follows the same keyboard and focus rules.
- Backdrop clicks do not close the modal, to avoid accidental loss of work.
- The baseline defaults remain: a new task starts with medium priority and todo status.
- The same form is also opened from the calendar (spec 003); its behavior is identical wherever it is opened from.
- Desktop browsers are the target; touch-specific behavior is out of scope.
- The constitution applies: keyboard accessible, responsive, independently testable, and local-first with no backend.
