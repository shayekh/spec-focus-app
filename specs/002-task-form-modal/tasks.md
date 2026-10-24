---

description: "Task list for the Task Form Modal (v2)"
---

# Tasks: Task Form Modal (v2)

**Input**: Design documents from `/specs/002-task-form-modal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED. The constitution requires tested business logic (Principle II) and independently testable features (Principle I). Write each test first and confirm it fails before implementing.

**Organization**: Tasks are grouped by user story. The project already exists, so there is no Setup phase; shared pieces that every story needs are in Phase 1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story from spec.md (US1 to US4); omitted for the foundational and polish phases
- Paths follow the single-project layout in plan.md (`src/`, `tests/` at repository root)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: The pure draft logic and the shared modal shell that every story builds on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 [P] Write failing unit tests in `tests/unit/taskDraft.test.ts` for the form draft logic: `toFormValues()` gives priority "medium", status "todo", and empty other fields; `toFormValues(task)` gives the task's values with tags joined by ", " and a null due date as ""; `toTaskInput` splits and trims tags, drops empty ones, and turns "" due date into null; `isDirty` is false for identical values, false when title/description differ only by surrounding spaces, false when tags differ only by spacing or letter-case duplicates, false when a value is changed and changed back, and true for any real difference in title, description, priority, status, due date, or tags; `validateForm` returns "Title is required." for an empty or whitespace-only title and "Due date is not a valid date." for a non-empty due date that is not a real calendar date (data-model: Validation)
- [X] T002 [P] Write failing unit tests in `tests/unit/modalStack.test.ts`: opening one modal sets the `inert` attribute on `#root` and not on the modal container; opening a second modal also sets `inert` on the first container and clears it from the second; closing the second clears `inert` from the first; closing the last removes `inert` from `#root`; the returned close function is safe to call twice (data-model: Modal stack)
- [X] T003 Implement `src/domain/taskDraft.ts` with `FormValues`, `toFormValues`, `toTaskInput`, `isDirty`, `validateForm`, and `FormErrors`, using `normalizeTags` and `isCalendarDate` from `src/domain/task.ts`, with no `as` assertions, so T001 passes (depends on T001)
- [X] T004 Implement `src/ui/modalStack.ts` exporting `openModal(container: HTMLElement): () => void` that records the container and re-applies `inert` so only the topmost modal is interactive, so T002 passes (depends on T002)
- [X] T005 [P] Write failing component tests in `tests/component/Modal.test.tsx`: the dialog renders in a portal directly under `document.body`, outside `#root`; it has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing at its heading; focus moves into it on open, to the element named by `initialFocusRef` if given; Tab from the last control wraps to the first and Shift+Tab from the first wraps to the last; Escape calls `onRequestClose` once; a click on the backdrop does not call it; `#root` is `inert` while open and not after; focus returns to the opener on unmount, or to the "New task" button when the opener no longer exists (research: Making the page underneath unavailable)
- [X] T006 Implement `src/ui/Modal.tsx` (portal, heading, optional close button named "Close" via `showClose`, focus trap, Escape, `modalStack` isolation, `useRestoreFocus` with the fallback target) and export a `useId`-based heading id, so T005 passes (depends on T004, T005)

**Checkpoint**: Draft logic and modal shell are tested and ready

---

## Phase 2: User Story 1 - Add a task in a modal (Priority: P1) MVP

**Goal**: "New task" opens an empty form in the shared modal; invalid input is explained next to the field; a valid save persists once

**Independent Test**: Select "New task", see an empty form over the list, save with an empty title and see the message, then save a real task and see it listed (spec User Story 1)

### Tests for User Story 1

- [X] T007 [P] [US1] Extend `tests/component/TaskForm.test.tsx`: the heading is "New task"; defaults are medium and todo; saving with an empty title shows "Title is required." linked by `aria-describedby` and focuses the title and clears the message when the user types; a refused save (`onSave` returning false) allows another attempt; submitting twice before closing calls `onSave` once (FR-005, FR-018); the due date message itself is covered by the `validateForm` unit tests because a browser date input cannot produce an invalid date
- [X] T008 [P] [US1] Add `tests/e2e/modal.spec.ts` with a test that "New task" opens a modal over the list with default medium and todo, shows the title error on an empty save, saves a valid task so the modal closes and the task is listed, and that submitting the form twice in the same instant creates one task (FR-001, FR-005, FR-018)

### Implementation for User Story 1

- [X] T009 [US1] Refactor `src/ui/TaskForm.tsx` to keep a `FormValues` draft, validate with `validateForm`, show each error beside its field with `aria-describedby`, focus the first invalid field, ignore submits after the first accepted one using a synchronously set ref, and render inside `Modal` (depends on T003, T006, T007)
- [X] T010 [US1] Update `src/ui/App.tsx` for the new `TaskForm` props: `onSave` receives a `TaskInput`; the create path still calls `createTask` and `dispatch` (depends on T009)

**Checkpoint**: User Story 1 works and is independently testable (MVP)

---

## Phase 3: User Story 2 - Edit a task in the same modal (Priority: P1)

**Goal**: Edit opens the same modal pre-filled; saving updates the task; a task deleted elsewhere is never silently lost

**Independent Test**: Edit a task with every field set, see every field pre-filled, change one and save; then edit a task that was deleted in another tab and see the message (spec User Story 2)

### Tests for User Story 2

- [X] T011 [P] [US2] Add `tests/component/App.modal.test.tsx`: Edit opens the dialog titled "Edit task" with all six fields pre-filled; saving updates the list; when the edited task has been removed from storage (a `storage` event after `localStorage` changes) and the user saves, the modal stays open, an alert reads "This task no longer exists, so your changes cannot be saved.", and the list is unchanged (FR-002, FR-016, FR-019)
- [X] T012 [P] [US2] Extend `tests/e2e/modal.spec.ts`: Edit shows every field pre-filled in the same dialog used for New task; changing a field and saving updates the list; with the same task open in two tabs, deleting it in one and saving in the other keeps the modal open with the "no longer exists" message (FR-002, FR-019)

### Implementation for User Story 2

- [X] T013 [US2] Add a `formError` prop to `src/ui/TaskForm.tsx` rendered as `role="alert"` above the buttons, and make `handleSave` in `src/ui/App.tsx` check that the edited task id still exists before calling `updateTask`, otherwise set `formError` to "This task no longer exists, so your changes cannot be saved." and keep the modal open (depends on T011, T010)

**Checkpoint**: User Stories 1 and 2 both work

---

## Phase 4: User Story 3 - Cancel or close without losing work by accident (Priority: P2)

**Goal**: A close button exists; closing with unsaved changes asks first; closing a clean form is immediate

**Independent Test**: Change a field, try Cancel, the close button, and Escape and see "Discard changes?" each time; with no changes each closes at once; the dimmed area never closes it (spec User Story 3)

### Tests for User Story 3

- [X] T014 [P] [US3] Extend `tests/component/ConfirmDialog.test.tsx`: a `cancelLabel` prop changes the cancel button text (default "Cancel"); default focus is on the cancel button; Escape cancels; it renders in a portal and isolates the page underneath (FR-013)
- [X] T015 [P] [US3] Extend `tests/component/TaskForm.test.tsx`: a "Close" button exists; with no changes, Cancel, Close, and Escape each call `onCancel` immediately and show no confirmation; after a change, each of the three shows a dialog titled "Discard changes?"; "Keep editing" closes only the confirmation and leaves the typed values; "Discard" calls `onCancel`; a change reverted to the original value counts as clean; a click on the backdrop does nothing (FR-004, FR-006 to FR-010)
- [X] T016 [P] [US3] Extend `tests/e2e/modal.spec.ts`: with a changed field, Cancel, the Close button, and Escape each open "Discard changes?"; "Keep editing" keeps the text; "Discard" closes both dialogs and leaves the list unchanged; a clean form closes at once by all three routes; clicking the dimmed area changes nothing (FR-006 to FR-010)

### Implementation for User Story 3

- [X] T017 [US3] Rebuild `src/ui/ConfirmDialog.tsx` on `Modal` and add the optional `cancelLabel` prop, removing its own focus-trap and focus-restore code (depends on T006, T014)
- [X] T018 [US3] In `src/ui/TaskForm.tsx` pass `showClose` to `Modal`, route Cancel, Close, and Escape through one `requestClose` that closes immediately when `isDirty(toFormValues(initial), values)` is false and otherwise shows `ConfirmDialog` titled "Discard changes?" with the buttons "Keep editing" and "Discard" (depends on T009, T015, T017)

**Checkpoint**: User Stories 1 to 3 work

---

## Phase 5: User Story 4 - Use the modal entirely with the keyboard (Priority: P2)

**Goal**: Real-browser proof that focus is trapped, the page and the form underneath are unreachable, and focus always returns

**Independent Test**: With only the keyboard, open the modal from an Edit button, tab around it, close it, and see focus back on that Edit button (spec User Story 4)

### Tests for User Story 4

- [X] T019 [P] [US4] Extend `tests/e2e/modal.spec.ts`: while the modal is open `#root` has `inert`, clicking "Export" or "New task" underneath does nothing, and 30 presses of Tab and Shift+Tab never move focus outside the dialog; with the discard confirmation open the form dialog is `inert` and Escape closes only the confirmation (FR-011 to FR-013)
- [X] T020 [P] [US4] Extend `tests/e2e/modal.spec.ts`: focus returns to the opener after each close route (Save, Cancel, Close, Escape, confirmed Discard) for both "New task" and a task's Edit button, and returns to "New task" when the opened task's Edit button no longer exists after saving (FR-014)
- [X] T021 [P] [US4] Extend `tests/e2e/modal.spec.ts` with a keyboard-only test that adds a task, edits a task, cancels with changes (choosing Keep editing, then Discard), and cancels without changes, using no pointer, asserting a visible focus indicator on each focused control (FR-015)

### Implementation for User Story 4

- [X] T022 [US4] Fix any gap that T019 to T021 expose in `src/ui/Modal.tsx`, `src/ui/modalStack.ts`, `src/ui/useRestoreFocus.ts`, or `src/ui/TaskForm.tsx` (first-field focus, focus-return fallback, Tab wrapping, Escape layering) until all three tests pass (depends on T019, T020, T021, T018)

**Checkpoint**: All four user stories work independently

---

## Phase 6: Polish and Cross-Cutting Concerns

- [X] T023 [P] Style the modal header and close button in `src/styles/app.css` using only theme tokens, keep Save and Cancel reachable when the form is taller than the window (the dialog scrolls internally), and add a case to `tests/e2e/layout.spec.ts` at 375px width and low height showing the Save button is reachable and nothing scrolls horizontally (spec Edge Cases: very long text; SC-006)
- [X] T024 [P] Keep the specifications in step: add a "Superseded in part by" pointer to `specs/001-task-management/spec.md` noting that the form's close behavior is specified in `specs/002-task-form-modal/spec.md`, and list the 002 spec and plan in the README Specification section and project structure (`Modal.tsx`, `modalStack.ts`, `taskDraft.ts`)
- [X] T025 Run every scenario in `specs/002-task-form-modal/quickstart.md`, and confirm `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build` all pass, including the existing 001 tests (SC-001 to SC-006)

---

## Dependencies and Execution Order

### Phase dependencies

- **Foundational (Phase 1)**: No dependencies; blocks all user stories
- **US1 (Phase 2)** then **US2 (Phase 3)**: US2 reuses the form and `App` changes from US1
- **US3 (Phase 4)**: Depends on the form from US1 and the modal from Phase 1
- **US4 (Phase 5)**: Depends on US3, because it verifies the full set of close routes
- **Polish (Phase 6)**: Depends on all stories

### Parallel opportunities

- Foundational: T001, T002, T005 (tests, different files)
- US1: T007 and T008; US2: T011 and T012; US3: T014, T015, T016; US4: T019, T020, T021
- Polish: T023 and T024

### Parallel example: Foundational

```text
Run together: T001 (taskDraft tests), T002 (modalStack tests), T005 (Modal tests)
Then: T003, T004 in parallel, then T006
```

## Implementation Strategy

### MVP first

1. Complete Phase 1 (draft logic and shared modal).
2. Complete Phase 2 (User Story 1) and stop to validate: add a task in the modal with field errors and a single save.

### Incremental delivery

Add US2 (edit and the deleted-task guard), then US3 (close button and discard confirmation), then US4 (real-browser keyboard and isolation proof), then polish and the final full run.
