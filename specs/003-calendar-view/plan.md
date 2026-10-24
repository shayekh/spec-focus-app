# Implementation Plan: Calendar View (v3)

**Branch**: `003-calendar-view` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-calendar-view/spec.md`

**Extends**: [001-task-management](../001-task-management/plan.md), [002-task-form-modal](../002-task-form-modal/plan.md)

## Summary

Add a calendar beside the existing list. All date logic (month grids, week starts, stepping,
headings, grouping tasks by date, rescheduling) is pure TypeScript in `src/domain/calendar.ts`,
working on `YYYY-MM-DD` strings so time zones cannot shift a task to another day. The UI is a small
set of React components built on semantic tables. Dragging uses the browser's native drag and drop,
so there is no dependency, and every drag has a keyboard equivalent: each calendar task has a
"Move" button that starts a move mode driven by the arrow keys. Clicking a task reuses the task form
modal from v2. The list's filters feed both views, so they never disagree.

## Technical Context

**Language/Version**: TypeScript 7.x, `strict` and `noUncheckedIndexedAccess` (Node 22.12 or newer)

**Primary Dependencies**: React 18, Vite 8. **No new dependencies** (no calendar or drag-and-drop library).

**Storage**: unchanged. Rescheduling updates a task's existing `dueDate`; nothing new is stored.

**Testing**: Vitest (date logic), React Testing Library (views, move mode, drop handling), Playwright (real drag and drop, keyboard move, focus, layout, performance)

**Target Platform**: Modern desktop browsers

**Project Type**: Single-project web application (frontend only)

**Performance Goals**: Changing view or period with 500 tasks shows the result in under 1 second (SC-005)

**Constraints**: No runtime network requests; keyboard operable; both themes meet contrast; dates are calendar dates with no time zone

**Scale/Scope**: Up to a few thousand tasks; a month view shows at most 42 days

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Independently Testable Features | Date logic, grid rendering, move mode, and drag handling are separate and testable alone; the calendar can be tested without the list | PASS |
| II. Explicit, Tested Business Logic | Date math, grouping, ordering, and rescheduling are pure functions in `src/domain/calendar.ts` with tests, including leap years and year boundaries | PASS |
| III. Simplicity Over Abstraction | Native drag and drop, plain tables, no library, no state manager; the only shared state is two small values held in `App` | PASS |
| IV. Strict TypeScript | No assertions or `any`; the type-safety guard test covers the new files | PASS |
| V. Responsive, Keyboard-Accessible UI | Every drag has a keyboard move; all controls are reachable; visible focus; today is marked by shape, not color alone | PASS |
| VI. Local-First, No Backend | No network use, no new service | PASS |

**Post-design re-check**: PASS. No dependency was added, and the calendar adds no stored data.

## Project Structure

### Documentation (this feature)

```text
specs/003-calendar-view/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-contract.md
└── tasks.md             # created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── domain/
│   └── calendar.ts        # NEW: date math, grids, stepping, headings, grouping, rescheduling (pure)
├── ui/
│   ├── ViewSwitch.tsx     # NEW: List | Calendar switch
│   ├── Calendar.tsx       # NEW: toolbar (period, navigation, Month/Week/Day), view body, move mode
│   ├── CalendarEntry.tsx  # NEW: one task on the calendar (open button, Move button, drag source)
│   ├── CalendarDay.tsx    # NEW: one date cell (label, today marker, entries, "+N more", drop target)
│   └── App.tsx            # CHANGED: view state, calendar state, shared filtered tasks, reschedule
└── styles/
    └── calendar.css       # NEW: calendar layout and states, tokens only

tests/
├── unit/calendar.test.ts
├── component/Calendar.test.tsx
├── component/ViewSwitch.test.tsx
├── component/App.calendar.test.tsx
└── e2e/calendar.spec.ts
```

**Structure Decision**: Extend the single frontend project. All date and grouping rules stay in
`src/domain/` with no React or browser dependency; the UI only renders what the domain returns.

## Complexity Tracking

No constitution violations; nothing to justify.
