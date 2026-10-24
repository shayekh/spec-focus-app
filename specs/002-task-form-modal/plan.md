# Implementation Plan: Task Form Modal (v2)

**Branch**: `002-task-form-modal` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-task-form-modal/spec.md`

**Extends**: [001-task-management](../001-task-management/plan.md)

## Summary

The task form already opens in a modal, with a focus trap, Escape, and focus return. This feature
closes the gaps against the v2 spec and removes duplication:

- Add a **close button** and an **unsaved-changes confirmation** driven by a pure, tested
  `isDirty` function.
- Make the **underlying page truly inert** (pointer, keyboard, and assistive technology), including
  the form while the discard confirmation is open.
- Move **validation** into a pure domain function so every error appears next to its field.
- **Save once** on double activation, and **refuse to save a task that no longer exists**.
- Build one shared `Modal` component used by both the task form and the confirmation dialog, so the
  trap, Escape, focus return, and isolation logic exists exactly once.

## Technical Context

**Language/Version**: TypeScript 7.x, `strict` and `noUncheckedIndexedAccess` (Node 22.12 or newer)

**Primary Dependencies**: React 18, Vite 8. No new dependencies.

**Storage**: unchanged (browser `localStorage`). This feature adds no stored data.

**Testing**: Vitest and React Testing Library (draft logic, modal, form), Playwright (real-browser focus, `inert`, and keyboard flows)

**Target Platform**: Modern desktop browsers with support for the `inert` attribute (current Chrome, Edge, Firefox, Safari)

**Project Type**: Single-project web application (frontend only)

**Performance Goals**: Opening and closing the modal feels instant; no layout shift on open

**Constraints**: No runtime network requests; keyboard operable; light and dark contrast compliant; no new dependency

**Scale/Scope**: One modal component, one form, one confirmation dialog

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Independently Testable Features | Draft logic, modal behavior, and form are separate modules, each testable alone | PASS |
| II. Explicit, Tested Business Logic | "What counts as unsaved changes" and form validation are pure functions in `src/domain/`, with unit tests | PASS |
| III. Simplicity Over Abstraction | One shared `Modal` replaces two copies of the same trap and focus code; a tiny modal stack is the only new abstraction and is justified in research | PASS |
| IV. Strict TypeScript | No assertions or `any`; the existing guard test in `tests/unit/typeSafety.test.ts` covers new files | PASS |
| V. Responsive, Keyboard-Accessible UI | Focus trap, Escape, focus return, `inert` background, keyboard-only end-to-end test | PASS |
| VI. Local-First, No Backend | No network use | PASS |

**Post-design re-check**: PASS. The design adds no dependency and one small module (`modalStack`).

## Project Structure

### Documentation (this feature)

```text
specs/002-task-form-modal/
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
│   └── taskDraft.ts     # NEW: form values, isDirty, validateForm, toTaskInput (pure)
└── ui/
    ├── Modal.tsx        # NEW: shared dialog shell (portal, trap, Escape, focus return, isolation)
    ├── modalStack.ts    # NEW: tracks open modals; makes everything but the topmost inert
    ├── TaskForm.tsx     # CHANGED: uses Modal and taskDraft; close button; dirty confirm; save once
    ├── ConfirmDialog.tsx# CHANGED: uses Modal; configurable cancel label
    ├── App.tsx          # CHANGED: refuses to save a task that no longer exists
    └── useRestoreFocus.ts # REMOVED: focus return now lives inside Modal (it must capture the opener
                           #   before the page is made inert, and only once per dialog)

tests/
├── unit/taskDraft.test.ts
├── unit/modalStack.test.ts
├── component/Modal.test.tsx
├── component/TaskForm.test.tsx   # extended
├── component/ConfirmDialog.test.tsx # extended
├── component/App.modal.test.tsx
└── e2e/modal.spec.ts
```

**Structure Decision**: Extend the existing single frontend project. Pure logic stays in
`src/domain/`; the shared dialog shell and its isolation helper stay in `src/ui/`.

## Complexity Tracking

No constitution violations. The one new abstraction, `modalStack`, is justified: two stacked
dialogs (form plus discard confirmation) both need the "only the topmost is interactive" rule, and
a module-level stack is the smallest way to get it without a dependency.
