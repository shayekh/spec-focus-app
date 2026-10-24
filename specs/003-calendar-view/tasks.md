---

description: "Task list for the Calendar View (v3)"
---

# Tasks: Calendar View (v3)

**Input**: Design documents from `/specs/003-calendar-view/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED. The constitution requires tested business logic (Principle II) and independently testable features (Principle I). Write each test first and confirm it fails before implementing.

**Organization**: Tasks are grouped by user story. The project already exists, so there is no Setup phase; the pure date logic every story needs is in Phase 1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story from spec.md (US1 to US4); omitted for the foundational and polish phases
- Paths follow the single-project layout in plan.md (`src/`, `tests/` at repository root)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: The pure date and grouping logic, and the calendar's color tokens

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 [P] Write failing unit tests in `tests/unit/calendar.test.ts` for the date logic, all on `YYYY-MM-DD` strings: `addDays` across month and year ends and in leap years (2024-02-29); weekday index with Monday as 0 (2026-10-24 is Saturday, 2026-10-25 Sunday); `startOfWeek`; `daysInMonth` (29 for Feb 2024, 28 for Feb 2026, 28 for Feb 2100); `addMonths` clamping (2026-01-31 plus 1 is 2026-02-28; 2024-01-31 plus 1 is 2024-02-29; December rolls to January of the next year); `monthGrid` rows of 7 starting Monday (October 2026 is 2026-09-28 to 2026-11-01, 35 dates; February 2027 is exactly 28 dates, 4 rows; August 2026 is 42 dates, 6 rows); `visibleDates` for month, week (Monday to Sunday), and day; `shift` by month, 7 days, and 1 day in both directions; `setView` keeps the anchor; `heading` text for each view; `entriesByDate` leaves out tasks with no due date and orders each date's tasks not-completed first, then high, medium, low priority, then title ignoring case; `rescheduleTask` returns the same object for the same date or an invalid date and otherwise a task with the new `dueDate` and a new `updatedAt`; `moveTarget` for ArrowLeft/Right (±1 day) and ArrowUp/Down (±7 days) and `null` for other keys (data-model: CalendarState, CalendarEntry, Rescheduling, MoveState)
- [X] T002 [P] Extend `tests/unit/contrast.test.ts` with the calendar's color pairs at 4.5:1 for text and 3:1 for indicators, in both themes: `today-text` on `today-bg`, `text` on `drop-bg`, `text` and `text-muted` on `cell-outside-bg`, and `today-bg` on `surface` (3:1) (spec: FR-017, SC-007)
- [X] T003 Implement `src/domain/calendar.ts` with `CalendarView`, `CalendarState`, `addDays`, `addMonths`, `weekdayIndex`, `startOfWeek`, `daysInMonth`, `monthGrid`, `visibleDates`, `shift`, `setView`, `goToDate`, `heading`, `entriesByDate`, `rescheduleTask`, and `moveTarget`; do all date arithmetic with `Date.UTC` and `getUTC*` on whole days, with no `as` assertions, so T001 passes (depends on T001)
- [X] T004 Add the calendar tokens to `src/styles/tokens.css` for both themes (`--today-bg`, `--today-text`, `--drop-bg`, `--cell-outside-bg`) so T002 passes (depends on T002)

**Checkpoint**: Date logic and tokens are tested and ready

---

## Phase 2: User Story 1 - See my tasks on a month calendar (Priority: P1) MVP

**Goal**: Switch from the list to a month calendar showing each dated task on its date, today marked, with Previous, Next, and Today

**Independent Test**: With dated and undated tasks, switch to the calendar, see each dated task on its date and no undated ones, today marked, navigate months and back to today, and switch back to the unchanged list (spec User Story 1)

### Tests for User Story 1

- [X] T005 [P] [US1] Write failing component tests in `tests/component/ViewSwitch.test.tsx`: a group named "View" has buttons "List" and "Calendar"; the current one has `aria-pressed="true"`; activating the other calls `onChange` with its value; both work by keyboard (FR-001)
- [X] T006 [P] [US1] Write failing component tests in `tests/component/Calendar.test.tsx` for the month view: a table with column headers Mon to Sun and whole rows of 7 dates; each date is a `<time>` with the right `datetime`; each dated task appears in its date's cell with its title and a priority cue; tasks without a due date do not appear; today has `aria-current="date"`, a marker, and the hidden text "Today"; dates outside the month are present and marked as outside; Previous, Next, and Today change the heading and dates as in the contract; the toolbar groups are named "Calendar view" with Month pressed by default; a date with more than 3 tasks shows 3 and a "+N more" button naming N and the date; with no tasks in the period the message "Nothing due this month" appears; completed and overdue tasks carry their styling (FR-002 to FR-006, FR-012, FR-014, FR-018)
- [X] T007 [P] [US1] Write failing component tests in `tests/component/App.calendar.test.tsx`: choosing "Calendar" replaces the list with the calendar and "List" brings the list back with the same tasks; a status or tag filter set in the filter bar changes which tasks the calendar shows, and the same tasks the list shows; "Clear filters" works from the calendar's no-match message; switching away and back keeps the calendar's month (FR-001, FR-013)
- [X] T008 [P] [US1] Create `tests/e2e/calendar.spec.ts` with a test that seeds tasks due today, in a few days, next month, overdue, completed, and with no due date; switches to the calendar; checks each dated task is on its date, the undated task is absent, today is marked, and Next, Previous, and Today work; and that switching back restores the list (FR-001 to FR-006)

### Implementation for User Story 1

- [X] T009 [P] [US1] Build `src/ui/ViewSwitch.tsx` so T005 passes (depends on T005)
- [X] T010 [P] [US1] Build `src/ui/CalendarEntry.tsx`: a list item with a priority dot, an open button whose accessible name is the title plus priority, completed, and overdue state, and completed and overdue styling matching the list (depends on T006)
- [X] T011 [US1] Build `src/ui/CalendarDay.tsx`: one date cell with a `<time>`, the today marker (`aria-current="date"`, a filled circle, and the hidden text "Today"), muted styling outside the month, up to 3 entries, and a "+N more" button (depends on T006, T010)
- [X] T012 [US1] Build `src/ui/Calendar.tsx` with the toolbar (Previous, Next, Today, the period heading in a polite live region, and the Month, Week, Day group) and the month table, and the empty-period message (depends on T003, T011)
- [X] T013 [US1] Add `src/styles/calendar.css` (month table, cells, today marker, outside-month muting, entries, toolbar) using only theme tokens, and import it in `src/main.tsx` (depends on T004)
- [X] T014 [US1] Update `src/ui/App.tsx`: hold the list or calendar choice and the `CalendarState`, render `ViewSwitch` beside the other toolbar controls, and render `Calendar` instead of `TaskList` with the same filtered tasks and the same `FilterBar`, so T007 passes (depends on T009, T012, T013, T007)

**Checkpoint**: User Story 1 works and is independently testable (MVP)

---

## Phase 3: User Story 2 - Look at a week or a single day (Priority: P2)

**Goal**: Week and day views with stepping, keeping the date in view when switching

**Independent Test**: Switch among Month, Week, and Day, see the right dates with tasks on the right days, step by a week and a day, and see the "+N more" button open the day (spec User Story 2)

### Tests for User Story 2

- [X] T015 [P] [US2] Extend `tests/component/Calendar.test.tsx`: Week shows Monday to Sunday of the anchor's week with every task on its date (no "+N more"); Day shows one date and every task due that day; Previous, Next, and Today step by a week or a day; switching Month, Week, and Day keeps the anchor in view; the day view's empty message reads "Nothing due on" plus the date; "+N more" in the month switches to that date's day view (FR-002, FR-003, FR-012, FR-014)
- [X] T016 [P] [US2] Extend `tests/e2e/calendar.spec.ts`: switch to Week and Day, see the right dates and tasks, step with Previous and Next, switch views and see the date stay in view, and use "+N more" on a crowded day (spec User Story 2)

### Implementation for User Story 2

- [X] T017 [US2] Add the week table and the day list to `src/ui/Calendar.tsx`, wire the Month, Week, and Day buttons and the "+N more" action to `setView` and `goToDate`, and add the week and day empty messages (depends on T015, T012)

**Checkpoint**: User Stories 1 and 2 both work

---

## Phase 4: User Story 3 - Open a task from the calendar (Priority: P2)

**Goal**: Selecting a calendar task opens its details in the v2 modal and returns to the calendar

**Independent Test**: Click a calendar task, see all its fields, change its due date, save, and see it move; close the modal and see focus return to the task (spec User Story 3)

### Tests for User Story 3

- [X] T018 [P] [US3] Extend `tests/component/App.calendar.test.tsx`: clicking an entry opens the "Edit task" dialog with every field filled in; pressing Enter on a focused entry does the same; saving a changed due date moves the entry to its new date; closing the dialog without changes returns focus to that entry (FR-007)
- [X] T019 [P] [US3] Extend `tests/e2e/calendar.spec.ts`: click a task and see the Edit task modal pre-filled; change the due date and save and see the task on its new date; open by keyboard and close with Escape and see focus return to the same task (FR-007)

### Implementation for User Story 3

- [X] T020 [US3] Pass the existing edit handler from `src/ui/App.tsx` to `Calendar` as `onOpen` and call it from the entry's open button in `src/ui/CalendarEntry.tsx` (depends on T018, T014)

**Checkpoint**: User Stories 1 to 3 work

---

## Phase 5: User Story 4 - Reschedule by moving a task to another date (Priority: P3)

**Goal**: Drag a task to another date, or do the same by keyboard, with the change saved

**Independent Test**: Drag a task to another date and see its due date change and persist; do the same by keyboard; cancel a move; move a task into the past and see it overdue (spec User Story 4)

### Tests for User Story 4

- [X] T021 [P] [US4] Extend `tests/component/Calendar.test.tsx` with drag and drop using drag events: an entry is draggable; dragging over a date marks it as the drop target and leaving unmarks it; dropping on another date calls `onReschedule(taskId, date)`; dropping on the same date calls nothing; dropping outside any date calls nothing; dates outside the month accept drops (FR-008 to FR-010)
- [X] T022 [P] [US4] Extend `tests/component/Calendar.test.tsx` with the keyboard move: each entry has a "Move <title>" button; activating it announces the instructions in a polite live region; ArrowRight, ArrowLeft, ArrowDown, and ArrowUp change the highlighted target by a day or a week and announce it; Enter calls `onReschedule` with the target and moves focus to that task's Move button in its new date; Escape ends the move without calling it and keeps focus; moving the target past the end of the visible period brings the new period into view (FR-011, SC-003)
- [X] T023 [P] [US4] Extend `tests/e2e/calendar.spec.ts` with real-browser tests: `dragTo` moves a task to another date, the drop-target style shows during the drag, the change survives a reload, dropping on its own date changes nothing, a move to a past date shows the task as overdue, a drag in the week view works, and the keyboard move works with Move, an arrow key, and Enter (3 key presses for one day or one week) and with Escape to cancel (FR-008 to FR-011, SC-003, SC-004)
- [X] T024 [P] [US4] Extend `tests/e2e/calendar.spec.ts` with a two-tab test: moving a task in one tab shows it on the new date in the other tab's calendar without a reload (FR-015)

### Implementation for User Story 4

- [X] T025 [US4] Make `src/ui/CalendarEntry.tsx` draggable (carrying the task id) and add the "Move <title>" button shown when the entry has focus or the pointer is over it, and make `src/ui/CalendarDay.tsx` a drop target with the drop-target style (depends on T021, T022)
- [X] T026 [US4] Add the move mode to `src/ui/Calendar.tsx` (state, arrow keys, highlighted target, polite announcements, Enter and Escape, following the target into other periods, and focus handling after a drop) and add `onReschedule` as a prop (depends on T022, T025, T017)
- [X] T027 [US4] Handle `onReschedule` in `src/ui/App.tsx` by calling `rescheduleTask` and dispatching the existing `update` action only when the task changed (depends on T026, T020)

**Checkpoint**: All four user stories work independently

---

## Phase 6: Polish and Cross-Cutting Concerns

- [X] T028 [P] Add a narrow-window layout for the calendar in `src/styles/calendar.css` (the month grid scrolls sideways inside its own container or compacts, navigation never hidden, page never scrolls sideways) and a case in `tests/e2e/layout.spec.ts` at 375px with long task titles (spec Edge Cases: long titles, very small windows)
- [X] T029 [P] Add a keyboard-only end-to-end test in `tests/e2e/calendar.spec.ts` that switches to the calendar, changes view and period, opens a task and closes it, and moves a task, using no pointer and checking a visible focus indicator on each control (FR-017, SC-006)
- [X] T030 [P] Add a timing test in `tests/e2e/calendar.spec.ts` with 500 tasks: switching views and moving to another month each update the screen in under 1 second (SC-005)
- [X] T031 [P] Keep the specifications in step: add the 003 spec to the README Specification table and project structure, add "Extended by" pointers to the 001 and 002 specs, and note in the 002 spec that the task form is also opened from the calendar
- [X] T032 Run every scenario in `specs/003-calendar-view/quickstart.md`, and confirm `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build` all pass, including all earlier tests (SC-001 to SC-007)

---

## Dependencies and Execution Order

### Phase dependencies

- **Foundational (Phase 1)**: No dependencies; blocks all user stories
- **US1 (Phase 2)**: Depends on Phase 1; delivers the MVP
- **US2 (Phase 3)**: Extends the `Calendar` component from US1
- **US3 (Phase 4)**: Depends on US1 (entries) and the v2 modal
- **US4 (Phase 5)**: Depends on US2 (week and day views have drop targets) and US3
- **Polish (Phase 6)**: Depends on all stories

### Parallel opportunities

- Foundational: T001 and T002
- US1 tests: T005 to T008; implementation T009 and T010
- US2: T015 and T016; US3: T018 and T019
- US4 tests: T021 to T024
- Polish: T028 to T031

### Parallel example: User Story 1

```text
Run together: T005 (ViewSwitch tests), T006 (Calendar tests), T007 (App tests), T008 (e2e)
Then together: T009 (ViewSwitch.tsx) and T010 (CalendarEntry.tsx)
```

## Implementation Strategy

### MVP first

1. Complete Phase 1 (date logic and tokens).
2. Complete Phase 2 (User Story 1) and stop to validate: switch to a month calendar that shows dated tasks, marks today, and navigates.

### Incremental delivery

Add US2 (week and day), then US3 (open a task), then US4 (drag and keyboard move), then polish and the final full run.
