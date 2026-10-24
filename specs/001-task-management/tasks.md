---

description: "Task list for Focus App Task Management"
---

# Tasks: Focus App Task Management

**Input**: Design documents from `/specs/001-task-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED. The constitution (Principle II) requires business logic to be tested, and Principle I requires independently testable features. Write each test first and confirm it fails before implementing.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story from spec.md (US1 to US4); omitted for Setup, Foundational, and final phases
- Paths follow the single-project layout in plan.md (`src/`, `tests/` at repository root)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization

- [X] T001 Initialize a Vite + React 18 + TypeScript project: `package.json` (scripts `dev`, `build`, `typecheck` = `tsc --noEmit`, `test`, `test:e2e`), `index.html`, `vite.config.ts`, `src/main.tsx`
- [X] T002 Configure `tsconfig.json` with `"strict": true` and `"noUncheckedIndexedAccess": true`; `npm run typecheck` MUST pass
- [X] T003 [P] Configure Vitest and React Testing Library in `vitest.config.ts` and `tests/setup.ts` (jsdom environment)
- [X] T004 [P] Configure Playwright in `playwright.config.ts` with a web server pointing at the Vite dev server
- [X] T005 [P] Add `.gitignore` (node_modules, dist, test-results, playwright-report) and create folders `src/domain`, `src/storage`, `src/state`, `src/ui`, `src/styles`, `tests/unit`, `tests/component`, `tests/e2e`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, storage, state, and app shell that every user story depends on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 [P] Define types in `src/domain/task.ts`: `Priority = "low" | "medium" | "high"`, `Status = "todo" | "in-progress" | "completed"`, and `Task` with fields `id` (string UUID, immutable), `title` (string, required, trimmed, non-empty), `description` (string, default empty), `priority` (default "medium"), `status` (default "todo"), `dueDate` (`YYYY-MM-DD` string or null), `tags` (string[]), `createdAt` and `updatedAt` (ISO 8601 strings)
- [X] T007 [P] Add light and dark CSS variables (`:root` and `:root[data-theme="dark"]`) in `src/styles/tokens.css` and base layout styles (desktop-first, usable at narrow widths) in `src/styles/app.css`; import both in `src/main.tsx`
- [X] T008 [P] Write failing tests in `tests/unit/taskStore.test.ts`: save then load returns identical tasks; missing key returns empty list; invalid JSON, wrong `version`, or non-array `tasks` return an empty list plus a notice flag and never throw (FR-017)
- [X] T009 Implement `src/storage/taskStore.ts`: `loadTasks()` and `saveTasks()` using key `focus-app:tasks` and document `{ "version": 1, "tasks": [...] }`, with corruption handling per T008 (depends on T006)
- [X] T010 Implement `src/state/useTasks.ts`: reducer-based hook exposing `tasks`, `notice`, and `dispatch`, loading from `taskStore` on start and saving after every change (depends on T009)
- [X] T011 Create the app shell in `src/ui/App.tsx` (header, toolbar region, main task region, a polite ARIA live region for announcements and errors) and render it from `src/main.tsx`; show `notice` from T010 when stored data was unreadable (depends on T010)

**Checkpoint**: Foundation ready; user stories can begin

---

## Phase 3: User Story 1 - Create and view tasks (Priority: P1) MVP

**Goal**: Create tasks, see them in a list, and keep them across restarts

**Independent Test**: Create tasks with varied fields, reload, and confirm every task appears unchanged (spec User Story 1)

### Tests for User Story 1

> Write these first and confirm they FAIL before implementation

- [X] T012 [P] [US1] Unit tests in `tests/unit/task.test.ts`: `createTask` applies defaults (priority "medium", status "todo"), trims title, rejects empty or whitespace-only title (FR-002, FR-003), trims tags, drops empty tags, and de-duplicates tags ignoring case keeping the first spelling
- [X] T013 [P] [US1] Unit tests in `tests/unit/overdue.test.ts`: overdue is true only when `dueDate` is earlier than today's local date and status is not "completed"; false when no due date; false when due today
- [X] T014 [P] [US1] Component tests in `tests/component/TaskForm.test.tsx`: empty title shows an inline error linked to the title field and does not submit; valid submit calls `onSave` with entered values
- [X] T015 [P] [US1] Component tests in `tests/component/TaskList.test.tsx`: renders title, priority, status, due date, and tags per task; shows empty state when there are no tasks; marks overdue tasks
- [X] T016 [P] [US1] E2E test in `tests/e2e/persistence.spec.ts`: create tasks (one title-only, one with all fields), reload the page, assert both are present with the same details

### Implementation for User Story 1

- [X] T017 [US1] Implement `createTask`, `normalizeTitle`, and `normalizeTags` in `src/domain/task.ts` (id via `crypto.randomUUID()`, timestamps via ISO strings) (depends on T012)
- [X] T018 [P] [US1] Implement `isOverdue(task, today)` in `src/domain/overdue.ts` using `YYYY-MM-DD` string comparison (depends on T013)
- [X] T019 [US1] Add the `add` action to the reducer in `src/state/useTasks.ts` (depends on T017)
- [X] T020 [P] [US1] Build `src/ui/TaskForm.tsx`: modal dialog with title, description, priority, status, due date, and tags inputs; inline title error; Escape or Cancel closes; focus returns to the opener (depends on T014)
- [X] T021 [P] [US1] Build `src/ui/TaskItem.tsx` and `src/ui/TaskList.tsx`: show title, priority, status, due date, tags; overdue and completed styling; empty state with a prompt to create a task (depends on T015, T018)
- [X] T022 [US1] Wire "New task" button, `TaskForm`, and `TaskList` into `src/ui/App.tsx` (depends on T019, T020, T021)

**Checkpoint**: User Story 1 works and is independently testable (MVP)

---

## Phase 4: User Story 2 - Edit, complete, and delete tasks (Priority: P2)

**Goal**: Change task details, move tasks through statuses, complete in one action, and delete with confirmation

**Independent Test**: Edit one task, complete another, delete a third, reload, and confirm changes persist (spec User Story 2)

### Tests for User Story 2

- [X] T023 [P] [US2] Unit tests in `tests/unit/task.test.ts`: `updateTask` changes fields, keeps `id` and `createdAt`, refreshes `updatedAt`, rejects an empty title; `completeTask` sets status "completed"; changing status away from "completed" is allowed
- [X] T024 [P] [US2] Unit tests in `tests/unit/useTasks.test.ts`: reducer `update`, `complete`, and `delete` actions modify only the targeted task and persist through `taskStore`
- [X] T025 [P] [US2] Component tests in `tests/component/ConfirmDialog.test.tsx` and `tests/component/TaskItem.test.tsx`: Delete opens the confirm dialog; Confirm removes; Cancel keeps; Complete button sets status completed; Edit opens a pre-filled form
- [X] T026 [P] [US2] E2E test in `tests/e2e/lifecycle.spec.ts`: edit, complete, delete (including cancelled delete), reload, assert persistence

### Implementation for User Story 2

- [X] T027 [US2] Implement `updateTask` and `completeTask` in `src/domain/task.ts` (depends on T023)
- [X] T028 [US2] Add `update`, `complete`, and `delete` actions to `src/state/useTasks.ts` (depends on T024, T027)
- [X] T029 [P] [US2] Build `src/ui/ConfirmDialog.tsx`: focus-trapped dialog, Escape cancels, returns focus to the opener (depends on T025)
- [X] T030 [US2] Add Edit, Complete, and Delete controls to `src/ui/TaskItem.tsx` and an edit mode (pre-filled) to `src/ui/TaskForm.tsx` (depends on T025, T028, T029)
- [X] T031 [US2] Wire edit, complete, and delete handlers in `src/ui/App.tsx` and announce results in the live region (depends on T030)

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - Filter, search, and sort tasks (Priority: P3)

**Goal**: Narrow the list by status, priority, and tag; search title and description; sort

**Independent Test**: With mixed tasks, apply each filter, combine them, search, and sort; only matching tasks appear in the right order (spec User Story 3)

### Tests for User Story 3

- [X] T032 [P] [US3] Unit tests in `tests/unit/query.test.ts`: filters by status, priority, and tag; filters combine with AND; search matches title or description case-insensitively; tag options are derived from tasks, case-insensitive and sorted; sort "created" is newest first; sort "dueDate" is earliest first with undated tasks last; sort "priority" is high, medium, low with ties newest first (FR-009, FR-010, FR-020)
- [X] T033 [P] [US3] Component tests in `tests/component/FilterBar.test.tsx`: each control updates the query; "no matches" message with a working "Clear filters" button; result count announced in the live region
- [X] T034 [P] [US3] E2E test in `tests/e2e/filter.spec.ts`: load mixed tasks, apply each filter, combine, search, sort

### Implementation for User Story 3

- [X] T035 [US3] Implement `filterTasks`, `searchTasks`, `sortTasks`, `deriveTags`, and the `Query` type (`status`, `priority`, `tag` each a value or "all"; `search`; `sort` = "created" | "dueDate" | "priority") in `src/domain/query.ts` (depends on T032)
- [X] T036 [US3] Build `src/ui/FilterBar.tsx`: status, priority, and tag selects, search box, sort selector, Clear filters (depends on T033, T035)
- [X] T055 [P] [US3] Write failing tests in `tests/unit/query.test.ts` and `tests/component/FilterBar.test.tsx`: when the selected tag no longer exists on any task (last task with it edited or deleted), the tag filter resets to "all" and the list shows all tasks matching the remaining filters
- [X] T037 [US3] Integrate query state and `FilterBar` into `src/ui/App.tsx` and add the "no matches" state to `src/ui/TaskList.tsx`; reset the tag filter to "all" whenever the selected tag disappears from `deriveTags` (depends on T036, T055)

**Checkpoint**: User Stories 1 to 3 work independently

---

## Phase 6: User Story 4 - Dark and light themes (Priority: P4)

**Goal**: Switch themes, remember the choice, default to the system preference

**Independent Test**: Toggle theme, confirm the whole UI changes, reload, confirm it persists (spec User Story 4)

### Tests for User Story 4

- [X] T038 [P] [US4] Unit tests in `tests/unit/preferences.test.ts`: `loadTheme` returns null when nothing saved; save then load round-trips "light" and "dark"; invalid stored values are ignored; `resolveTheme` falls back to the system preference when null
- [X] T039 [P] [US4] Component tests in `tests/component/ThemeToggle.test.tsx`: toggling sets `data-theme` on the document and saves the choice; control is keyboard operable and has an accessible name and state

### Implementation for User Story 4

- [X] T040 [US4] Implement `loadTheme`, `saveTheme`, and `resolveTheme` in `src/storage/preferences.ts` using key `focus-app:theme` (depends on T038)
- [X] T041 [US4] Build `src/ui/ThemeToggle.tsx` and apply `data-theme` on startup in `src/main.tsx` before first render (depends on T039, T040)
- [X] T042 [US4] Add the toggle to the toolbar in `src/ui/App.tsx` and verify all components use only the CSS variables from `src/styles/tokens.css` (depends on T041)

**Checkpoint**: All four user stories work independently

---

## Phase 7: Backup and Multi-Tab Consistency (FR-018, FR-019, FR-021)

**Purpose**: Requirements from the clarifications that span the whole app

- [X] T043 [P] Unit tests in `tests/unit/transfer.test.ts`: export then import round-trips every field exactly (SC-007); rejects non-JSON, wrong `app` or unsupported `version`, invalid enum values, bad dates, missing title, duplicate ids; rejection leaves existing tasks unchanged; export document matches `contracts/export-file.md`
- [X] T044 [P] Unit tests in `tests/unit/crossTab.test.ts`: a `storage` event for `focus-app:tasks` triggers a reload of tasks; unrelated keys are ignored
- [X] T045 Implement `serializeExport` and `parseImport` (hand-written type guard) in `src/domain/transfer.ts` per `contracts/export-file.md` (depends on T043)
- [X] T046 Implement `subscribeToTaskChanges` in `src/storage/crossTab.ts` and a `replaceAll` action plus subscription in `src/state/useTasks.ts` (last write wins) (depends on T044)
- [X] T047 Build `src/ui/TransferMenu.tsx`: Export downloads `focus-app-tasks-YYYY-MM-DD.json`; Import reads a file, shows an overwrite warning via `ConfirmDialog` when tasks exist, and shows a clear error for invalid files; add it to the toolbar in `src/ui/App.tsx` (depends on T029, T045, T046)
- [X] T048 [P] Component tests in `tests/component/TransferMenu.test.tsx`: overwrite warning appears when tasks exist; invalid file shows an error and changes nothing
- [X] T049 [P] E2E test in `tests/e2e/multitab.spec.ts`: a task added in one tab appears in a second tab without reload

---

## Phase 8: Polish and Cross-Cutting Concerns

- [X] T050 [P] E2E keyboard-only test in `tests/e2e/keyboard.spec.ts`: create, edit, complete, delete, filter, search, sort, toggle theme, and export using only the keyboard, with a visible focus indicator at each step (SC-004)
- [X] T051 [P] Performance test in `tests/unit/performance.test.ts`: with 500 tasks, filter, search, and sort each complete in under 1 second (SC-003)
- [X] T052 [P] Verify text contrast in both themes against WCAG AA and adjust variables in `src/styles/tokens.css` (SC-005)
- [X] T053 [P] Handle long titles, descriptions, and many tags without breaking the layout in `src/styles/app.css`
- [X] T054 Run every scenario in `specs/001-task-management/quickstart.md`; confirm `npm run typecheck`, `npm test`, and `npm run test:e2e` all pass

---

## Dependencies and Execution Order

### Phase dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories
- **User Stories (Phases 3 to 6)**: Depend on Foundational; independent of each other, though US2 reuses the `TaskItem` and `TaskForm` built in US1, so run US1 first
- **Backup and Multi-Tab (Phase 7)**: Depends on US2 (uses `ConfirmDialog`) and Foundational state
- **Polish (Phase 8)**: Depends on all earlier phases

### Within each story

Tests first (must fail), then domain logic, then state, then UI, then wiring in `App.tsx`.

### Parallel opportunities

- Setup: T003, T004, T005
- Foundational: T006, T007, T008
- US1 tests: T012 to T016; implementation T018, T020, T021
- US2 tests: T023 to T026
- US3 tests: T032 to T034
- US4 tests: T038, T039
- Phase 7 tests: T043, T044, T048, T049
- Polish: T050 to T053

### Parallel example: User Story 1

```text
Run together: T012, T013, T014, T015, T016   (all test files, no shared code)
Then together: T018 (overdue.ts), T020 (TaskForm.tsx), T021 (TaskItem/TaskList.tsx)
```

## Implementation Strategy

### MVP first

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (User Story 1) and stop to validate: tasks can be created, listed, and survive reload.
3. Deploy or demo the MVP.

### Incremental delivery

Add US2, then US3, then US4, validating each at its checkpoint. Add Phase 7 (backup and multi-tab) before calling the feature complete, then finish with Phase 8.
