---

description: "Task list for Subtasks (v5)"
---

# Tasks: Subtasks (v5)

**Input**: Design documents from `/specs/005-subtasks/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED. The constitution requires tested business logic (Principle II) and independently testable features (Principle I). Write each test first and confirm it fails before implementing.

**Organization**: Tasks are grouped by user story. The project already exists, so there is no Setup phase; the pure domain logic every story needs is in Phase 1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story from spec.md (US1 to US4); omitted for the foundational and polish phases
- Paths follow the single-project layout in plan.md (`src/`, `tests/` at repository root)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: The pure subtask, completion, and data logic that every story builds on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 Move `PRIORITIES`, `Priority`, and `isPriority` from `src/domain/task.ts` into a new `src/domain/priority.ts` (no imports) and re-export them from `task.ts`, so every existing import and test still works; `npm run typecheck` and all existing tests MUST pass (research: Where subtasks are stored; plan: Summary)
- [X] T002 [P] Write failing unit tests in `tests/unit/subtasks.test.ts` for the operations in data-model: `addSubtask` (appends with defaults medium, no date, not done; trims the title; accepts a priority and a due date; rejects a blank title with "Title is required.", a bad date with "Due date is not a valid date.", and a 51st subtask with "A task can have up to 50 subtasks."; leaves the input task unchanged; sets `updatedAt`), `editSubtask` (replaces title, priority, due date, keeps `done` and position; same errors; "That subtask no longer exists."), `setSubtaskDone` (`offerComplete` true only when marked done, the task is not completed, and all are now done; false when unticking, when the task is completed, when others remain, and for an unknown id), `deleteSubtask` (removes it, removes the field when none remain, never offers completion), `moveSubtask` (up and down swap neighbours, return the 1-based position and total, return `null` at the ends and for an unknown id), `progress` and `describeProgress` ("2 of 5 subtasks complete", "0 of 1 subtask complete"), `isSubtaskOverdue` (not done, past due date, parent not completed; false when done, no date, today or later, or parent completed), `completeSubtasks`, `copySubtasks` (all not done, ids `prefix:1`, `prefix:2`, same titles, priorities, dates, order), `isSubtaskList` (accepts 1 to 50 valid entries; rejects empty, more than 50, duplicate ids, non-arrays, a blank title, a bad priority, a bad date, a non-boolean `done`), and `dropUnreadableSubtasks` (removes only an unreadable `subtasks`, leaves valid and absent ones and every other field exactly as they were, never changes its input) (data-model: Subtask operations, Validation)
- [X] T003 Create `src/domain/subtasks.ts` with the `Subtask` type, `MAX_SUBTASKS`, and the functions in T002, importing only from `priority.ts`, `dates.ts`, `guards.ts`, and (as types) `task.ts`, with no `as` assertions, so T002 passes (depends on T001, T002)
- [X] T004 [P] Extend `tests/unit/task.test.ts` with failing tests: `isTask` accepts a task with valid subtasks and rejects one with an unreadable list; `completeTask` marks every subtask done and keeps a task without subtasks unchanged; `updateTask` keeps `subtasks`, completes them when the status changes to completed from another status, and leaves them as they are when the task was already completed and when the status is not completed; `createTask` does not invent subtasks; a repair function `repairStoredTask` removes unreadable `recurrence` and unreadable `subtasks` together and changes nothing else (data-model: Changes to existing operations)
- [X] T005 Update `src/domain/task.ts`: add optional `subtasks` to `Task`, extend `isTask`, make `completeTask` and `updateTask` follow data-model, and add `repairStoredTask(value)` combining `dropUnreadableRecurrence` and `dropUnreadableSubtasks`, so T004 passes (depends on T003, T004)
- [X] T006 [P] Extend `tests/unit/series.test.ts` with failing tests: completing a recurring occurrence that has subtasks marks them done on the completed task and gives the new occurrence a copy with ids `<newId>:1`, ..., all not done, in the same order; an occurrence without subtasks gets none; the series ending (outcome `last`) keeps the completed task's subtasks; the tasks of a series stripped by `stopSeries` or `deleteOccurrence` keep their subtasks; saving an edit with scope "series" keeps subtasks on the open occurrence (data-model: Changes to existing operations)
- [X] T007 Update `src/domain/series.ts` so the next occurrence gets `copySubtasks(completed.subtasks, newId)`, so T006 passes (depends on T005, T006)
- [X] T008 [P] Write failing tests: extend `tests/unit/taskStore.test.ts` (a stored task with an unreadable `subtasks` loads as the same task without subtasks while the rest of the document loads; valid subtasks round-trip through save and load in order; documents without the field load unchanged) and `tests/unit/transfer.test.ts` (an export containing subtasks imports with every field and the order identical; an older file imports; a task with unreadable subtasks imports without them; any other invalid task still rejects the whole file; a round trip reproduces subtasks exactly) (FR-012, SC-005)
- [X] T009 Apply `repairStoredTask` in place of `dropUnreadableRecurrence` in `src/storage/taskStore.ts` (`loadTasks`) and `src/domain/transfer.ts` (`parseImport`) so T008 passes (depends on T005, T008)

**Checkpoint**: Subtask rules, the completion cascade, the series copy, and data handling are tested and ready

---

## Phase 2: User Story 1 - Break a task into subtasks (Priority: P1) MVP

**Goal**: Open a task's subtasks, add several, and see the task's progress in the list

**Independent Test**: Add three subtasks to a task, close the dialog, reload, see "0 of 3 subtasks complete" and the three subtasks in order (spec User Story 1)

### Tests for User Story 1

- [X] T010 [P] [US1] Write failing component tests in `tests/component/SubtasksDialog.test.tsx` (the dialog takes the live `task`, `onChange(task)`, `onOffer(task)`, and `onClose`): it is a dialog named `Subtasks: <title>` with a Close button; with none it says "No subtasks yet."; a field "New subtask" and a button "Add subtask"; typing and pressing Enter or clicking adds a subtask at the end, clears the field, and keeps focus on it so several can be added in a row; a blank title shows "Title is required." under the field and adds nothing, and typing clears the message; at 50 subtasks it shows "A task can have up to 50 subtasks." and adds nothing; the list is named "Subtasks" and shows each title in order; a status region announces `Added "<title>". <progress>` (ui-contract: Subtasks dialog)
- [X] T011 [P] [US1] Extend `tests/component/TaskItem.test.tsx` with failing tests: a task with subtasks shows "N of M subtasks complete" and a bar with the matching filled width, the bar is hidden from assistive technology, a task with none shows neither, and every task has a button named `Subtasks for <title>` that calls `onSubtasks` (ui-contract: Task list item)
- [X] T012 [P] [US1] Create `tests/component/App.subtasks.test.tsx` with failing tests: choosing `Subtasks for <title>` opens the dialog; adding subtasks updates the stored task (in order) and the list progress after closing; focus returns to the Subtasks button on close; the dialog closes if its task disappears from storage while open (cross-tab) (spec US1 scenarios 1, 2, 4, 6)
- [X] T013 [P] [US1] Create `tests/e2e/subtasks.spec.ts` with a test that opens a task's subtasks, adds three by typing and pressing Enter, closes the dialog, sees "0 of 3 subtasks complete", reloads, and finds the three subtasks in the same order (SC-001, spec US1)

### Implementation for User Story 1

- [X] T014 [US1] Build `src/ui/SubtasksDialog.tsx` (using `Modal`, the add row, the list with rows rendered by a minimal display-only `src/ui/SubtaskRow.tsx`, and the announcement region) so T010 passes (depends on T003, T010)
- [X] T015 [US1] Update `src/ui/TaskItem.tsx` (progress text and bar, Subtasks button, `onSubtasks` prop), `src/ui/TaskList.tsx` (pass it through), `src/ui/App.tsx` (open and close the dialog from the live task, dispatch `update` with the changed task), and `src/styles/app.css` (progress bar and dialog layout using tokens only), so T011, T012, and T013 pass (depends on T014, T011, T012, T013)

**Checkpoint**: Subtasks can be added and are saved, with progress in the list. This is the MVP

---

## Phase 3: User Story 2 - Complete subtasks and see progress (Priority: P1)

**Goal**: Tick subtasks off, see progress, and be asked (not forced) to complete the parent

**Independent Test**: Give a task three subtasks, complete them one at a time, see 1, 2, 3 of 3, the task still open, and a prompt after the third (spec User Story 2)

### Tests for User Story 2

- [X] T016 [P] [US2] Extend `tests/component/SubtasksDialog.test.tsx` with failing tests: each row has a checkbox named by the subtask title; ticking calls `onChange` with that subtask done and unticking with it not done; the progress line in the dialog updates; the status region announces `<title> marked complete. <progress>` and `<title> marked not complete. <progress>`; completing the last subtask of an open task calls `onOffer` with the updated task, and none of unticking, a completed task, or an earlier subtask does (ui-contract: Subtasks dialog, Prompt)
- [X] T017 [P] [US2] Extend `tests/component/ConfirmDialog.test.tsx` with a failing test that `confirmVariant="primary"` styles the confirm button as the primary action instead of the danger style, and the default is unchanged (ui-contract: Prompt)
- [X] T018 [P] [US2] Extend `tests/component/App.subtasks.test.tsx` with failing tests: completing the last subtask shows a dialog `Complete task?` with the exact message and focus on "Leave open"; the task is still not completed behind it; "Leave open" and Escape close only the prompt and change nothing; "Complete task" completes the task and its subtasks exactly as the Complete button does (including creating the next occurrence for a repeating task and announcing it); no prompt for a completed task, for unticking, or after a delete (spec US2 scenarios 4 to 7)
- [X] T019 [P] [US2] Extend `tests/e2e/subtasks.spec.ts` with a test that completes subtasks one at a time and sees progress 1, 2, 3 of 3 in the dialog and the list with the task still open, gets the prompt after the third, leaves it open, ticks and unticks to get the prompt again, and finally agrees (SC-002, SC-003)

### Implementation for User Story 2

- [X] T020 [US2] Add the checkbox, progress line in the dialog, completion announcements, and the `onOffer` call to `src/ui/SubtasksDialog.tsx` and `src/ui/SubtaskRow.tsx`; add the `confirmVariant` prop to `src/ui/ConfirmDialog.tsx`; and add the prompt and its "Complete task" action (the same path as the Complete button) to `src/ui/App.tsx`, so T016, T017, T018, and T019 pass (depends on T015, T016, T017, T018, T019)

**Checkpoint**: Progress and the complete-the-parent prompt work

---

## Phase 4: User Story 3 - Completing the parent completes its subtasks (Priority: P1)

**Goal**: A parent completed by any route leaves no unfinished subtask; deleting a parent says what else goes

**Independent Test**: Give a task four subtasks, complete one, complete the task, and see all four complete (spec User Story 3)

### Tests for User Story 3

- [X] T021 [P] [US3] Extend `tests/component/App.subtasks.test.tsx` with failing tests: the Complete button completes every subtask; saving the task form with status completed completes every subtask; setting the status back to todo leaves them complete; completing a repeating parent gives the stored next occurrence the same subtasks, none complete; the delete confirmation for a task with subtasks adds "Its N subtasks will be deleted too." (and the singular for one) and confirming removes the task; a task without subtasks has the original message (spec US3 scenarios 1 to 5)
- [X] T022 [P] [US3] Extend `tests/e2e/subtasks.spec.ts` with a test for the Complete button, the form status route, reopening, a weekly repeating task with two subtasks (completed occurrence all complete, next occurrence has both, none complete), and the delete message (SC-004)

### Implementation for User Story 3

- [X] T023 [US3] Update `src/ui/App.tsx` so the delete confirmation names the number of subtasks that will be deleted too (the completion cascade itself is in `task.ts` and `series.ts`, done in Phase 1), so T021 and T022 pass (depends on T015, T021, T022)

**Checkpoint**: Completion is consistent on every route

---

## Phase 5: User Story 4 - Edit, reorder, and delete subtasks (Priority: P2)

**Goal**: Rename a subtask, give it a priority and due date, reorder, and delete

**Independent Test**: With three subtasks, edit the second, move the third to the top, delete the first, and see the right order, details, and progress, kept after a reload (spec User Story 4)

### Tests for User Story 4

- [X] T024 [P] [US4] Extend `tests/component/SubtasksDialog.test.tsx` with failing tests: each row shows `Priority: <priority>`, `Due <date>`, `Overdue` per `isSubtaskOverdue`, and the parent's tags (and follows a tag change on rerender); Edit turns the row into fields "Subtask title", "Priority", "Due date (optional)" with Save and Cancel and focus on the title; Save with a blank title shows "Title is required." and keeps the fields; Save calls `onChange` with the new values and announces `Saved "<title>".`; Cancel and Escape inside the fields restore the row without closing the dialog, and focus returns to that row's Edit button; Delete removes at once and announces `Deleted "<title>". <progress>` and focus moves to the add field; Move up and Move down reorder, are absent on the first and last rows, announce `<title> moved to position <n> of <total>`, and keep focus on the moved row's button in the same direction (or its other move button at an end); none of edit, delete, or move offers to complete the parent (ui-contract: Subtasks dialog, Editing a subtask)
- [X] T025 [P] [US4] Extend `tests/e2e/subtasks.spec.ts` with a test for edit, cancel, reorder with the buttons, delete, tags following the parent, and a reload; and a keyboard-only test that opens the dialog, adds, edits, completes, reorders, deletes, and answers the prompt using no pointer, checking a visible focus indicator (SC-007)

### Implementation for User Story 4

- [X] T026 [US4] Complete `src/ui/SubtaskRow.tsx` (badges, parent tags, edit mode, delete, move buttons and focus handling) and `src/ui/SubtasksDialog.tsx` (announcements, focus management), so T024 and T025 pass (depends on T020, T024, T025)

**Checkpoint**: All four stories work independently and together

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T027 [P] Add a timing test in `tests/e2e/subtasks.spec.ts` with 500 tasks, 100 of them with 10 subtasks each: the list renders and filtering by search text updates in under 1 second (SC-006)
- [X] T028 [P] Add the progress bar color pairs (fill against track in both themes) to `tests/unit/contrast.test.ts` first, then any new tokens to `src/styles/tokens.css` so they pass; add narrow-window cases to `tests/e2e/layout.spec.ts` showing the list item and the Subtasks dialog (long titles, edit mode, the prompt) fit 375px without sideways scrolling (SC-008)
- [X] T029 [P] Keep the specifications in step: add the 005 spec to the README features list, Specification table, and project structure; add "Extended by" pointers to the 001, 002, and 004 specs; note in `specs/001-task-management/contracts/export-file.md` and `specs/004-recurring-tasks/spec.md` (Assumptions: subtasks arrive later) that subtasks are delivered in 005
- [X] T030 Run every scenario in `specs/005-subtasks/quickstart.md`, and confirm `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build` all pass, including all earlier tests (SC-001 to SC-008); set the 005 spec Status to Implemented

---

## Dependencies & Execution Order

### Phase dependencies

- **Foundational (Phase 1)**: No dependencies; blocks all user stories
- **US1 (Phase 2)**: Depends on Phase 1; delivers the MVP
- **US2 (Phase 3)**: Depends on US1 (the dialog and its wiring exist)
- **US3 (Phase 4)**: Depends on Phase 1 (the cascade) and US1 (the list and App wiring)
- **US4 (Phase 5)**: Depends on US2 (the row and dialog are completed)
- **Polish (Phase 6)**: Depends on all stories

### Parallel opportunities

- Foundational: T002, T004, T006, T008 (test files, different files); then T003, T005, T007, T009 in order
- US1 tests: T010 to T013; US2 tests: T016 to T019; US3 tests: T021 and T022; US4 tests: T024 and T025
- Polish: T027 to T029

## Implementation Strategy

### MVP first

1. Complete Phase 1 (subtask rules, cascade, copy, and data handling, fully tested).
2. Complete Phase 2 (User Story 1) and stop to validate: subtasks can be added, are saved, and show progress.
3. Add Phase 3 and Phase 4 so subtasks can be completed and the parent stays consistent; then Phase 5 for editing, ordering, and deleting.

### Notes

- Write each test first and watch it fail for the right reason before implementing.
- Mark each task `[X]` when done; keep this file in step with the code.
