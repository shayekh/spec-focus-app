# Implementation Plan: Subtasks (v5)

**Branch**: `005-subtasks` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-subtasks/spec.md`

**Extends**: [001](../001-task-management/plan.md), [002](../002-task-form-modal/plan.md), [004](../004-recurring-tasks/plan.md)

## Summary

A task gains an optional ordered list of subtasks. All behavior is plain, tested domain logic:

- `subtasks.ts` knows the subtask rules: what a valid subtask is, how to add, edit, complete,
  delete, and move one, how progress is counted and worded, when a subtask is overdue, and when
  finishing a subtask should offer to complete the parent. Every operation takes a task and returns
  a new task, so the app applies one user action as one update.
- `task.ts` completes a parent's subtasks whenever the parent becomes completed (`completeTask` and
  `updateTask`), and `series.ts` gives the next occurrence of a repeating task a fresh copy of the
  subtasks.
- Priorities move into a tiny `priority.ts` (re-exported from `task.ts`) so `task.ts` and
  `subtasks.ts` can use them without an import cycle, the same way `dates.ts` was extracted in v4.

Subtasks are managed in a Subtasks dialog opened from the list. The dialog edits the parent task
directly (no separate save step); the app only has to dispatch the updated task. The parent shows
progress in the list. Stored data changes only by one optional field, so existing data and older
export files remain valid.

## Technical Context

**Language/Version**: TypeScript 7.x, `strict` and `noUncheckedIndexedAccess` (Node 22.12 or newer)

**Primary Dependencies**: React 18, Vite 8. **No new dependencies.**

**Storage**: Same versioned `localStorage` document. Tasks gain an optional `subtasks` array (no version bump: the change is additive and older documents are valid).

**Testing**: Vitest (subtask rules, completion cascade, series copy, validation, storage and import repair), React Testing Library (dialog, list progress, app flows), Playwright (full flows in a real browser, keyboard only, narrow window, timing)

**Target Platform**: Modern desktop browsers

**Project Type**: Single-project web application (frontend only)

**Performance Goals**: With 500 tasks, 100 of them with 10 subtasks, the list renders and filtering updates in under 1 second (SC-006)

**Constraints**: No runtime network requests; keyboard operable; both themes meet contrast; fits 375px wide

**Scale/Scope**: At most 50 subtasks per task; up to a few thousand tasks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Independently Testable Features | Subtask rules, completion cascade, series copy, the dialog, list progress, and the prompt are separate modules, each testable alone | PASS |
| II. Explicit, Tested Business Logic | Add, edit, complete, delete, move, progress, overdue, prompt condition, cascade, copy, and repair of bad data are pure functions with tests | PASS |
| III. Simplicity Over Abstraction | One embedded array on the task, one new domain module, no second collection and no tree: subtasks are one level deep. The only extra module is `priority.ts`, extracted to avoid an import cycle | PASS |
| IV. Strict TypeScript | No assertions or `any`; untrusted subtask data is checked by a type guard and repaired at the boundary; the type-safety guard test covers new files | PASS |
| V. Responsive, Keyboard-Accessible UI | Native inputs and buttons; Move up/down instead of drag; announcements for state changes; keyboard-only and 375px end-to-end tests | PASS |
| VI. Local-First, No Backend | Everything is computed locally; no network use | PASS |

**Post-design re-check**: PASS. The design adds no dependency, no stored schema version, and no background process.

## Project Structure

### Documentation (this feature)

```text
specs/005-subtasks/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ui-contract.md
│   └── data-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── priority.ts       # NEW: Priority type, PRIORITIES, isPriority (moved out of task.ts, re-exported)
│   ├── subtasks.ts       # NEW: Subtask type and guard, add/edit/setDone/delete/move, progress, overdue, copy, repair
│   ├── task.ts           # CHANGED: optional subtasks, completing a task completes its subtasks, guard and repair
│   ├── series.ts         # CHANGED: the next occurrence gets a fresh copy of the subtasks
│   └── transfer.ts       # CHANGED: repair unreadable subtasks before validating an import
├── storage/
│   └── taskStore.ts      # CHANGED: repair unreadable subtasks when loading
└── ui/
    ├── SubtasksDialog.tsx # NEW: the dialog (add, list, edit, complete, move, delete)
    ├── SubtaskRow.tsx     # NEW: one subtask, in display and edit modes
    ├── TaskItem.tsx       # CHANGED: progress text and bar, Subtasks button
    ├── ConfirmDialog.tsx  # CHANGED: optional non-destructive confirm style
    └── App.tsx            # CHANGED: opens the dialog, applies changes, shows the complete-parent prompt, delete warning

tests/
├── unit/subtasks.test.ts, task.test.ts, series.test.ts, taskStore.test.ts, transfer.test.ts, contrast.test.ts   # new and extended
├── component/SubtasksDialog.test.tsx, TaskItem.test.tsx, ConfirmDialog.test.tsx, App.subtasks.test.tsx
└── e2e/subtasks.spec.ts, layout.spec.ts
```

**Structure Decision**: Extend the single frontend project. Everything that decides what subtasks
do is in `src/domain/` with no React or browser dependency; the dialog only collects choices and
shows results.

## Complexity Tracking

No constitution violations; nothing to justify.
