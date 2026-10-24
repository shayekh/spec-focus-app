# Implementation Plan: Focus App Task Management

**Branch**: `001-task-management` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-task-management/spec.md`

## Summary

Build Focus App as a local-first, single-page web app for personal tasks: create, edit, complete,
delete, filter, search, sort, export/import, and light/dark themes. All business rules (validation,
filtering, search, sorting, overdue, import/export) live in a pure TypeScript domain layer with no UI
or browser dependencies. A thin storage adapter persists to browser `localStorage` and syncs open
tabs via the `storage` event. The UI is a small React app styled with plain CSS variables. No backend.

## Technical Context

**Language/Version**: TypeScript 5.x with `strict` enabled (Node 20 LTS for tooling)

**Primary Dependencies**: React 18, Vite (build/dev). No state library, no UI kit, no date library.

**Storage**: Browser `localStorage` (one versioned JSON document for tasks, one key for theme)

**Testing**: Vitest (domain and storage unit tests), React Testing Library (component/UI tests), Playwright (a few end-to-end flows incl. keyboard-only and restart persistence)

**Target Platform**: Modern desktop browsers (current Chrome, Edge, Firefox, Safari); makes no network requests at runtime (offline reload via service worker is out of scope)

**Project Type**: Single-project web application (frontend only)

**Performance Goals**: Filter/search/sort results visible in under 1 s with 500 tasks (SC-003); typing and interactions never block the UI

**Constraints**: No backend or account; no runtime network requests; keyboard operable; light/dark contrast compliant

**Scale/Scope**: One user, up to a few thousand tasks, 1 main screen plus a task form dialog

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Independently Testable Features | Domain, storage, and UI are separate modules; each user story is testable alone | PASS |
| II. Explicit, Tested Business Logic | Rules in pure `src/domain/` functions with unit tests; UI only calls them | PASS |
| III. Simplicity Over Abstraction | No state library, no repository/service layers, no date library; one storage adapter | PASS |
| IV. Strict TypeScript | `strict: true`, `noUncheckedIndexedAccess`, type check required in CI/pre-merge | PASS |
| V. Responsive, Keyboard-Accessible UI | Semantic HTML, focus management in dialogs, Playwright keyboard-only test | PASS |
| VI. Local-First, No Backend | `localStorage` only; no network calls | PASS |

**Post-design re-check**: PASS. Design adds no backend, extra layers, or untyped boundaries; imported
JSON is validated by a hand-written type guard at the single untrusted boundary.

## Project Structure

### Documentation (this feature)

```text
specs/001-task-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── export-file.md
│   └── ui-contract.md
└── tasks.md             # created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── domain/              # pure logic, no React or browser APIs
│   ├── task.ts          # types, defaults, validation, normalization (tags, title)
│   ├── query.ts         # filter + search + sort
│   ├── overdue.ts       # overdue rule
│   └── transfer.ts      # export serialization, import validation
├── storage/
│   ├── taskStore.ts     # load/save versioned document, corruption handling
│   ├── preferences.ts   # theme load/save
│   └── crossTab.ts      # subscribe to `storage` events
├── state/
│   └── useTasks.ts      # reducer + hook wiring domain and storage
├── ui/
│   ├── App.tsx
│   ├── TaskList.tsx
│   ├── TaskItem.tsx
│   ├── TaskForm.tsx     # create/edit dialog
│   ├── FilterBar.tsx    # status, priority, tag, search, sort
│   ├── TransferMenu.tsx # export / import
│   ├── ThemeToggle.tsx
│   └── ConfirmDialog.tsx
├── styles/
│   ├── tokens.css       # light/dark CSS variables
│   └── app.css
└── main.tsx

tests/
├── unit/                # domain + storage (Vitest)
├── component/           # UI (React Testing Library)
└── e2e/                 # Playwright
```

**Structure Decision**: Single frontend project. The `domain/` folder is the only place for business
rules and must not import from `ui/`, `state/`, or `storage/`, so it can be tested in isolation.

## Complexity Tracking

No constitution violations; nothing to justify.

## Deliberate Additions Beyond the Spec

- **Save-failure notice**: `saveTasks` reports a failed write (storage full, or storage blocked
  in a private window) and `useTasks` shows a dismissible notice telling the user to export their
  tasks. The spec covers unreadable stored data (FR-017) but not failed writes. It is kept
  because browser storage is the only copy of the user's data (spec Assumptions), so a silent
  failed save would lose tasks without warning. It adds no dependency and is covered by tests in
  `tests/unit/taskStore.test.ts` and `tests/unit/useTasks.test.ts`. If the spec is revised, add a
  requirement for it next to FR-017.

- **UI polish pass** (from a UI/UX review): 150ms hover and pressed feedback on buttons, switched
  off under `prefers-reduced-motion`; a visibly disabled "Clear filters" button; a colored dot per
  priority (the text label stays, so color is never the only cue); an "Add your first task" button
  in the empty state; and an outlined Delete button in the list (the confirm dialog keeps the
  solid one). All colors are theme tokens covered by the contrast test, and the behavior is covered
  by `tests/e2e/interaction.spec.ts` and the component tests. No requirement changes.

- **Typography and color pass** (second UI/UX review, saved in `design-system/focus-app/MASTER.md`):
  form control borders now use a stronger `--border-control` token (at least 3:1 against their
  background in both themes, per WCAG 1.4.11); font sizes and weights come from named tokens in
  `src/styles/typography.css`; task descriptions are limited to 70 characters per line; due dates
  use tabular figures; headings wrap balanced. System fonts are kept so the app makes no
  third-party requests (FR-013). Covered by `tests/unit/contrast.test.ts`,
  `tests/unit/typography.test.ts`, and `tests/e2e/typography-color.spec.ts`. No requirement changes.
