# Implementation Plan: Recurring Tasks (v4)

**Branch**: `004-recurring-tasks` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-recurring-tasks/spec.md`

**Extends**: [001](../001-task-management/plan.md), [002](../002-task-form-modal/plan.md), [003](../003-calendar-view/plan.md)

## Summary

A task gains an optional repeat rule and a series identity. All behavior is plain, tested domain
logic:

- `recurrence.ts` knows the rules: which date comes next, which dates fall in a range (for calendar
  previews), how to describe a rule, and whether a rule is valid.
- `series.ts` knows what happens to a series when a task is completed, edited (this occurrence or
  the whole series), stopped, or deleted. Each operation returns a change set (tasks to add or
  replace, tasks to remove), so one user action is one atomic update.
- Date arithmetic moves out of `calendar.ts` into a shared `dates.ts`, so `task.ts`,
  `recurrence.ts`, and `calendar.ts` can all use it without an import cycle.

Only the open occurrence of a series is a real task; completing it creates the next. Future dates
are drawn on the calendar as read-only previews computed from the rule for the visible dates only.
The task form gets a Repeat section, an edit-scope choice, and a Stop repeating action. Stored data
changes only by two optional fields, so existing data and older export files remain valid.

## Technical Context

**Language/Version**: TypeScript 7.x, `strict` and `noUncheckedIndexedAccess` (Node 22.12 or newer)

**Primary Dependencies**: React 18, Vite 8. **No new dependencies.**

**Storage**: Same versioned `localStorage` document. Tasks gain optional `recurrence` and `seriesId` fields (no version bump: the change is additive and older documents are valid).

**Testing**: Vitest (rule math, series operations, validation, storage and import repair), React Testing Library (form, list, calendar previews, app flows), Playwright (full flows in a real browser)

**Target Platform**: Modern desktop browsers

**Project Type**: Single-project web application (frontend only)

**Performance Goals**: With 500 tasks including 100 series, switching calendar views or months shows the result in under 1 second (SC-006)

**Constraints**: No runtime network requests; keyboard operable; both themes meet contrast; dates are calendar dates with no time zone

**Scale/Scope**: Up to a few thousand tasks; previews are computed only for dates on screen (at most 42 per series)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Independently Testable Features | Rule math, series operations, form, list label, and calendar previews are separate modules, each testable alone | PASS |
| II. Explicit, Tested Business Logic | Next-date rules, completion, edit scope, stop, delete, reopen, and preview generation are pure functions with tests, including month ends, leap years, and 24 simulated months | PASS |
| III. Simplicity Over Abstraction | One rule shape, one change-set type, no scheduler or background job: the next occurrence is created at the moment of completion. The only new shared module is `dates.ts`, extracted to avoid an import cycle | PASS |
| IV. Strict TypeScript | No assertions or `any`; untrusted recurrence data is checked by a type guard and repaired at the boundary; the type-safety guard test covers new files | PASS |
| V. Responsive, Keyboard-Accessible UI | Repeat controls are native inputs; previews are real buttons with accessible names; keyboard-only end-to-end test | PASS |
| VI. Local-First, No Backend | Everything is computed locally; no network use | PASS |

**Post-design re-check**: PASS. The design adds no dependency, no stored schema version, and no background process.

## Project Structure

### Documentation (this feature)

```text
specs/004-recurring-tasks/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ui-contract.md
│   └── data-contract.md
└── tasks.md             # created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── dates.ts          # NEW: date arithmetic moved out of calendar.ts (no imports)
│   ├── recurrence.ts     # NEW: Recurrence type and guard, nextDate, datesBetween, describe, validate, buildRule
│   ├── series.ts         # NEW: completeOccurrence, saveOccurrence (scope), stopSeries, deleteOccurrence, openOccurrence, previewsFor
│   ├── task.ts           # CHANGED: optional recurrence/seriesId, TaskInput.recurrence, guard, repair of unreadable rules
│   ├── taskDraft.ts      # CHANGED: repeat fields, scope, validation
│   ├── calendar.ts       # CHANGED: re-exports date functions from dates.ts
│   └── transfer.ts       # CHANGED: repair unreadable rules before validating an import
├── storage/
│   └── taskStore.ts      # CHANGED: repair unreadable rules when loading
├── state/
│   └── useTasks.ts       # CHANGED: new "change" action (add or replace some tasks, remove others)
└── ui/
    ├── TaskForm.tsx      # CHANGED: Repeat section, edit scope, Stop repeating
    ├── RepeatFields.tsx  # NEW: the repeat controls (kind, days, end date, summary)
    ├── TaskItem.tsx      # CHANGED: repeat label in the list
    ├── Calendar.tsx / CalendarDay.tsx / CalendarEntry.tsx  # CHANGED: repeat indicator and previews
    ├── CalendarPreview.tsx  # NEW: one read-only upcoming occurrence
    └── App.tsx           # CHANGED: complete, save, stop, delete go through series.ts

tests/
├── unit/dates.test.ts, recurrence.test.ts, series.test.ts
├── unit/taskDraft.test.ts, task.test.ts, taskStore.test.ts, transfer.test.ts, useTasks.test.ts   # extended
├── component/RepeatFields.test.tsx, TaskForm.test.tsx, TaskItem.test.tsx, Calendar.test.tsx, App.recurring.test.tsx
└── e2e/recurring.spec.ts
```

**Structure Decision**: Extend the single frontend project. Everything that decides what a recurring
task does is in `src/domain/` with no React or browser dependency; the UI only collects choices and
shows results.

## Complexity Tracking

No constitution violations; nothing to justify.
