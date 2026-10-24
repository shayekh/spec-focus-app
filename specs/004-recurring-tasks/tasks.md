---

description: "Task list for Recurring Tasks (v4)"
---

# Tasks: Recurring Tasks (v4)

**Input**: Design documents from `/specs/004-recurring-tasks/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUDED. The constitution requires tested business logic (Principle II) and independently testable features (Principle I). Write each test first and confirm it fails before implementing.

**Organization**: Tasks are grouped by user story. The project already exists, so there is no Setup phase; the pure domain logic every story needs is in Phase 1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story from spec.md (US1 to US4); omitted for the foundational and polish phases
- Paths follow the single-project layout in plan.md (`src/`, `tests/` at repository root)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: The pure rule, series, and data logic that every story builds on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 [P] Write failing unit tests in `tests/unit/dates.test.ts` for the date functions in their new home `src/domain/dates.ts`: `addDays`, `addMonths`, `weekdayIndex`, `startOfWeek`, `daysInMonth`, `isSameMonth`, and `isCalendarDate` (a real calendar date written as `YYYY-MM-DD`, rejecting 2026-02-30 and malformed text); and that `src/domain/calendar.ts` and `src/domain/task.ts` still export the same functions so existing imports keep working (research: Moving date math into dates.ts)
- [X] T002 [P] Write failing unit tests in `tests/unit/recurrence.test.ts`: `nextDate` for daily, weekly, monthly, and selected-days rules (the day after; the next matching weekday strictly after the given date; the anchor day clamped to short months, 2026-01-31 gives 2026-02-28 then 2026-03-31, 2024-01-31 gives 2024-02-29, and a monthly 29 February rule); `null` when the next date is after the end date and a date equal to the end date is allowed; a simulation of 24 months of completions for every kind that checks each date against an independent calculation; `datesBetween` returns only dates in the range, starts from `max(after, from - 1 day)` so an old series costs only the range, and stops at 400 dates; `describeRecurrence` texts from data-model (including "Repeats weekly on Thursday", "Repeats monthly on the 31st", "Repeats Mon, Wed, Fri", and the " until Dec 31, 2026" suffix); `validateRecurrence` messages (no due date, no day chosen, end date not a real date, end date before the due date); `buildRule` takes the weekday or day of month from the due date, sorts and de-duplicates chosen days, and keeps a stored anchor when kind and days are unchanged; `isRecurrence` accepts valid rules and rejects wrong kinds, out-of-range weekdays or days of month, a weekly rule without exactly one weekday, a days rule with none, a monthly rule without a day, and a bad end date (data-model: Recurrence)
- [X] T003 Create `src/domain/dates.ts` by moving the date functions out of `src/domain/calendar.ts` and `isCalendarDate` out of `src/domain/task.ts` (no imports in the new file), and re-export them from both so every existing import and test still works; `npm run typecheck` and all existing tests MUST pass (depends on T001)
- [X] T004 Implement `src/domain/recurrence.ts` with the `Recurrence` and `RecurrenceKind` types, `isRecurrence`, `nextDate`, `datesBetween`, `describeRecurrence`, `validateRecurrence`, and `buildRule`, importing only from `dates.ts`, with no `as` assertions, so T002 passes (depends on T002, T003)
- [X] T005 [P] Extend `tests/unit/task.test.ts` with failing tests: `isTask` accepts a task with a valid `recurrence` and `seriesId` and a due date; rejects an invalid rule, a `seriesId` without a rule, a rule without a `seriesId`, and a rule on a task with no due date; `dropUnreadableRecurrence` removes `recurrence` and `seriesId` from any record where either is unreadable or inconsistent and leaves everything else (including valid recurring tasks and non-recurring tasks) exactly as it was; `createTask` and `updateTask` carry `input.recurrence` (a rule sets it, `null` clears it together with `seriesId`, undefined keeps it) and refuse a rule on a task with no due date with the message "Choose a due date to start the repeat from." (data-model: Task additions, Invariants)
- [X] T006 Update `src/domain/task.ts`: add optional `recurrence` and `seriesId` to `Task`, `recurrence` (a rule or `null`) to `TaskInput`, extend `isTask`, add `dropUnreadableRecurrence(value: unknown): unknown`, and extend `createTask`/`updateTask`, so T005 passes (depends on T004, T005)
- [X] T007 [P] Write failing unit tests in `tests/unit/series.test.ts` (series operations are pure and take ids and the clock as arguments): `completeOccurrence` marks the task completed and adds the next occurrence with the same title, description, priority, tags, rule, and series, status "todo", the next date, a new id, and new timestamps (outcome `next`); the next date comes from the due date, not the completion day; no date left before the end date ends the series, stripping `recurrence` and `seriesId` from every task in it (outcome `last`); a non-recurring task has outcome `done` and no new task; no other task changes; `saveOccurrence` for all four cases in data-model (ordinary update; joining a new series with the built rule, including completing at the same time; scope "occurrence" changing only title, description, priority, tags, due date, and status and ignoring the rule; scope "series" applying title, description, priority, tags, rule, and end date to the open occurrence and leaving a completed edited occurrence untouched; `null` rule with scope "series" stopping the series; completing through a form save creating the next occurrence once; reopening a completed occurrence while a newer open one exists stripping its rule and series; reopening when no open one exists keeping them); `stopSeries`; `deleteOccurrence` (an open recurring task ends the series for the rest, a completed or ordinary task is just removed); `openOccurrence`; `previewsFor` (only open recurring tasks; only dates after the due date and after today; within the range; none after the end date; several series; a series whose open occurrence is not in the input produces nothing); and the invariant that after every operation a series has at most one open occurrence (data-model: Series operations)
- [X] T008 Implement `src/domain/series.ts` with `completeOccurrence`, `saveOccurrence`, `stopSeries`, `deleteOccurrence`, `openOccurrence`, `previewsFor`, and the `ChangeSet` and `EditScope` types, using `recurrence.ts`, `task.ts`, and `dates.ts`, with no `as` assertions, so T007 passes (depends on T006, T007)
- [X] T009 [P] Write failing tests: extend `tests/unit/taskStore.test.ts` (a stored task with an unreadable rule loads as an ordinary task while the rest of the document loads normally; a valid recurring task round-trips through save and load; documents without the new fields load unchanged), extend `tests/unit/transfer.test.ts` (an export containing recurring tasks imports with every field identical; an older file with no recurrence fields imports; a task with an unreadable rule imports as an ordinary task; any other invalid task still rejects the whole file; a round trip reproduces `recurrence` and `seriesId` exactly), and extend `tests/unit/useTasks.test.ts` for a new `change` action that replaces tasks by id, adds unknown ids at the front, removes ids, applies all of it in one update, and saves once (FR-021, FR-022, SC-007)
- [X] T010 Apply `dropUnreadableRecurrence` before validation in `src/storage/taskStore.ts` (`loadTasks`) and `src/domain/transfer.ts` (`parseImport`), and add the `change` action to `src/state/useTasks.ts` so T009 passes (depends on T006, T009)
- [X] T011 [P] Extend `tests/unit/taskDraft.test.ts` with failing tests: `toFormValues` includes the repeat kind, chosen days, and end date from a task's rule (and "Does not repeat" for none); `toTaskInput` builds the rule through `buildRule` and keeps a stored anchor when the kind and days are unchanged; `isDirty` treats repeat kind, days, and end date as changes but not the edit scope; `validateForm` reports "Choose a due date to start the repeat from." under due date when a repeat is chosen with none, "Choose at least one day." for selected days with none, and the two end-date messages (data-model: Validation)
- [X] T012 Update `src/domain/taskDraft.ts` (`FormValues`, `FormErrors`, `toFormValues`, `toTaskInput`, `isDirty`, `validateForm`) so T011 passes and the existing draft tests still pass (depends on T004, T011)

**Checkpoint**: Rules, series operations, validation, and data handling are tested and ready

---

## Phase 2: User Story 1 - Make a task repeat (Priority: P1) MVP

**Goal**: Choose a repeat and end date in the task form, save it, and see the task labelled as repeating

**Independent Test**: Set each kind of repeat on a task with a due date, save, reopen it, and see the rule and end date kept and the list label (spec User Story 1)

### Tests for User Story 1

- [X] T013 [P] [US1] Write failing component tests in `tests/component/RepeatFields.test.tsx`: a "Repeat" select with the five options; choosing "On selected days" shows a "Repeat on" group of seven checkboxes Mon to Sun; choosing Weekly or Monthly shows the explanatory sentence from the contract based on the due date; "Repeat until (optional)" appears whenever a repeat is chosen; each message is shown beside its field and linked with `aria-describedby`; the whole group can be shown disabled with the note "Choose Entire series to change how this task repeats."; everything works by keyboard (FR-001, FR-002, FR-004)
- [X] T014 [P] [US1] Extend `tests/component/TaskForm.test.tsx` with failing tests: choosing Weekly and saving calls `onSave` with a rule built from the due date; selected days and an end date are passed through; a repeat with no due date shows the due-date message and does not save; selected days with none chosen shows "Choose at least one day."; an end date before the due date shows its message; clearing the due date of a recurring task is refused; changing only the repeat counts as an unsaved change; existing tests are updated for the new `onSave` signature `(input, scope)` (FR-001 to FR-004)
- [X] T015 [P] [US1] Extend `tests/component/TaskItem.test.tsx` with failing tests: a recurring task shows a badge with its rule description and an end date, the repeat symbol is hidden from assistive technology, and an ordinary task shows no badge (FR-006)
- [X] T016 [P] [US1] Create `tests/e2e/recurring.spec.ts` with a fixed-clock test that sets a weekly repeat with an end date through the form, sees the list label, reopens the task and finds the rule kept, sets "On selected days" with Monday, Wednesday, and Friday, and checks the three validation messages (needs a due date, needs a day, end before due date) (spec User Story 1)

### Implementation for User Story 1

- [X] T017 [US1] Build `src/ui/RepeatFields.tsx` (the Repeat select, "Repeat on" checkboxes, sentences, "Repeat until", messages, and a disabled mode) with tokens-only styles in `src/styles/app.css`, so T013 passes (depends on T012, T013)
- [X] T018 [US1] Add `RepeatFields` to `src/ui/TaskForm.tsx` below the due date, pass the rule and `scope` ("occurrence" for now) through `onSave(input, scope)`, show the due-date message, and update `src/ui/App.tsx` so a save goes through `saveOccurrence` and dispatches the change set, so T014 passes (depends on T008, T010, T017, T014)
- [X] T019 [US1] Show the rule description as a badge with a hidden repeat symbol in `src/ui/TaskItem.tsx`, so T015 and T016 pass (depends on T015, T018)

**Checkpoint**: User Story 1 works and is independently testable (MVP)

---

## Phase 3: User Story 2 - Completing an occurrence creates the next (Priority: P1)

**Goal**: Completing a recurring task by any route creates exactly one next occurrence, leaves everything else alone, and ends the series at its end date

**Independent Test**: Complete a series repeatedly for each kind of repeat and see each new occurrence due on the right date, open, with earlier ones still completed (spec User Story 2)

### Tests for User Story 2

- [X] T020 [P] [US2] Create `tests/component/App.recurring.test.tsx` with failing tests using a faked clock: the Complete button on a recurring task completes it and adds the next occurrence; the polite announcement names the next date, or says "That was the last occurrence."; setting status to "completed" in the form creates the next occurrence exactly once; a series past its end date creates nothing and its task shows no repeat label; completing does not change other tasks or earlier completed occurrences; reopening a completed occurrence while a newer open one exists makes it an ordinary task (FR-007 to FR-011)
- [X] T021 [P] [US2] Extend `tests/e2e/recurring.spec.ts` with fixed-clock tests that complete a daily, weekly, monthly (on the 31st through February), and selected-days series several times and check each new date; complete a task a week late and see the next date follows the schedule; complete the occurrence before the end date and see the series end; and complete the same series through the form's status field (SC-002, SC-003)

### Implementation for User Story 2

- [X] T022 [US2] Route the Complete button in `src/ui/App.tsx` through `completeOccurrence` and dispatch its change set, announce the outcome in the live region, and make the status path of `saveOccurrence` create the next occurrence, so T020 and T021 pass (depends on T018, T020)

**Checkpoint**: User Stories 1 and 2 both work

---

## Phase 4: User Story 3 - Edit one occurrence or the whole series, and stop a series (Priority: P2)

**Goal**: Choose between this occurrence and the entire series when editing, stop a series, and delete one with a clear warning

**Independent Test**: Edit a recurring task for this occurrence and for the series, complete it, and see only the series change reach the next occurrence; then stop the series and see nothing new is created (spec User Story 3)

### Tests for User Story 3

- [X] T023 [P] [US3] Extend `tests/component/TaskForm.test.tsx` with failing tests: an "Apply changes to" group appears only when the task belongs to a live series that has an open occurrence (a new prop `seriesHasOpen`), with "This occurrence only" selected by default and "Entire series" the alternative; in "This occurrence only" the repeat controls are disabled with the note; the note "Applies to this occurrence only." is shown beside Due date and Status; `onSave` receives the chosen scope; a recurring task's form has "Stop repeating", which opens the "Stop repeating?" confirmation with "Keep repeating" focused and calls `onStopRepeating` only when confirmed, leaving the form open (FR-012, FR-013, FR-015)
- [X] T024 [P] [US3] Extend `tests/component/App.recurring.test.tsx` with failing tests: an edit with "This occurrence only" leaves the next occurrence with the original title; an edit with "Entire series" gives the next occurrence the new title, description, priority, tags, rule, and end date and leaves completed occurrences unchanged; changing the due date or status applies to one occurrence even with "Entire series"; moving the due date moves what follows; editing a completed occurrence of a live series with "Entire series" changes the open occurrence; "Does not repeat" with "Entire series" stops the series; "Stop repeating" makes the task ordinary and creates nothing on completion; deleting a recurring task shows the added sentence and ends the series without creating anything (FR-013 to FR-016)
- [X] T025 [P] [US3] Extend `tests/e2e/recurring.spec.ts` with tests for the same journeys through the browser: edit this occurrence then complete, edit the series then complete, stop the series with the confirmation, and delete with the warning (SC-004)

### Implementation for User Story 3

- [X] T026 [US3] Add the scope group, the notes, the disabled repeat controls, and "Stop repeating" with its confirmation to `src/ui/TaskForm.tsx`, and in `src/ui/App.tsx` pass `seriesHasOpen`, handle `onStopRepeating` through `stopSeries`, handle scope in saves, and extend the delete confirmation text for recurring tasks and route deletes through `deleteOccurrence`, so T023, T024, and T025 pass (depends on T022, T023, T024)

**Checkpoint**: User Stories 1 to 3 work

---

## Phase 5: User Story 4 - See recurring tasks on the calendar (Priority: P2)

**Goal**: Open, completed, and upcoming occurrences all appear correctly on the calendar, with upcoming ones as read-only previews

**Independent Test**: With a weekly series that has an end date and two completed occurrences, see completed entries, the open entry, and previews up to the end date in the month, week, and day views (spec User Story 4)

### Tests for User Story 4

- [X] T027 [P] [US4] Extend `tests/component/Calendar.test.tsx` with failing tests (previews supplied as a prop `previews: { task, date }[]`): a real recurring entry shows the repeat symbol and "repeats" in its accessible name; each preview renders on its date as a button named "<title>, <priority> priority, repeats, upcoming", with a dashed outline class, a hidden repeat symbol, no Move button, and not draggable; selecting a preview calls `onOpen` with the series' open occurrence; previews count toward the month's "+N more" and appear in full in the week and day views; completed occurrences show as completed entries (FR-017, FR-018)
- [X] T028 [P] [US4] Extend `tests/component/App.recurring.test.tsx` with failing tests: previews appear for a weekly series on the dates after the open occurrence and after today, none after the end date; they are hidden when a filter hides the open occurrence; moving the open occurrence moves the previews (FR-017, FR-019)
- [X] T029 [P] [US4] Extend `tests/e2e/recurring.spec.ts` with fixed-clock tests for a weekly series with an end date and two completed occurrences: the month, week, and day views show completed entries, the open entry, and dashed previews up to the end date and none after; selecting a preview opens the open occurrence's form; a preview cannot be dragged and has no Move button; dragging the open occurrence moves the previews; a filter hides them (SC-005)

### Implementation for User Story 4

- [X] T030 [US4] Build `src/ui/CalendarPreview.tsx`; add the repeat symbol and "repeats" to `src/ui/CalendarEntry.tsx`; make `src/ui/CalendarDay.tsx` and `src/ui/Calendar.tsx` merge entries and previews into one ordered list (real entries first) so "+N more" counts both; compute previews in `src/ui/App.tsx` with `previewsFor` over the filtered tasks and the visible dates; and style previews with tokens only in `src/styles/calendar.css`, so T027, T028, and T029 pass (depends on T022, T027, T028)

**Checkpoint**: All four user stories work independently

---

## Phase 6: Polish and Cross-Cutting Concerns

- [X] T031 [P] Add a keyboard-only end-to-end test in `tests/e2e/recurring.spec.ts` that sets a repeat, completes an occurrence, edits the series, and stops it, using no pointer and checking a visible focus indicator on each control (FR-023, SC-008)
- [X] T032 [P] Add a timing test in `tests/e2e/recurring.spec.ts` with 500 tasks including 100 recurring series: switching calendar views and moving to another month each update the screen in under 1 second (SC-006)
- [X] T033 [P] Add the preview and repeat-symbol color pairs to `tests/unit/contrast.test.ts` first (text and dashed outline at the required ratios in both themes), then add any new tokens to `src/styles/tokens.css` so they pass, and add a narrow-window case to `tests/e2e/layout.spec.ts` showing the form's Repeat section and the calendar previews fit at 375px without sideways scrolling (SC-007 of spec 003 applies here too)
- [X] T034 [P] Keep the specifications in step: add the 004 spec to the README Specification table, features list, and project structure; add "Extended by" pointers to the 001 to 003 specs; note in `specs/001-task-management/contracts/export-file.md` that two optional fields were added; and update `specs/003-calendar-view/spec.md` Assumptions (recurring tasks are now a later version, delivered in 004)
- [X] T035 Run every scenario in `specs/004-recurring-tasks/quickstart.md`, and confirm `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build` all pass, including all earlier tests (SC-001 to SC-008)

---

## Dependencies and Execution Order

### Phase dependencies

- **Foundational (Phase 1)**: No dependencies; blocks all user stories
- **US1 (Phase 2)**: Depends on Phase 1; delivers the MVP
- **US2 (Phase 3)**: Depends on US1 (saves go through the series logic)
- **US3 (Phase 4)**: Depends on US2
- **US4 (Phase 5)**: Depends on US2 (real series to draw); independent of US3 apart from sharing `App.tsx`
- **Polish (Phase 6)**: Depends on all stories

### Parallel opportunities

- Foundational: T001, T002, T005, T007, T009, T011 (test files, different files); then T003 and T004 in order, T006, T008, T010, T012
- US1 tests: T013 to T016; US2 tests: T020 and T021; US3 tests: T023 to T025; US4 tests: T027 to T029
- Polish: T031 to T034

### Parallel example: Foundational

```text
Run together: T001 (dates), T002 (recurrence), T005 (task), T007 (series), T009 (storage), T011 (draft)
Then in order: T003 (dates.ts), T004 (recurrence.ts), T006 (task.ts), T008 (series.ts), T010, T012
```

## Implementation Strategy

### MVP first

1. Complete Phase 1 (rule, series, and data logic, fully tested).
2. Complete Phase 2 (User Story 1) and stop to validate: a task can be set to repeat and shows its rule.
3. Add Phase 3 so completion actually produces the next occurrence; that is the minimum useful recurring task.

### Incremental delivery

Add US3 (edit scope, stop, delete), then US4 (calendar previews), then polish and the final full run.
