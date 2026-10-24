# Focus App

A personal task manager that runs entirely in your browser. There is no backend and no account:
your tasks are stored on your own device.

## What it does

- **Tasks**: create, edit, mark complete, and delete tasks (delete asks for confirmation).
- **Task fields**: title (required), description, priority (`low`, `medium`, `high`), status
  (`todo`, `in-progress`, `completed`), an optional due date, and tags.
- **Find things**: filter by status, priority, and tag (filters combine), search title and
  description, and sort by newest, due date, or priority.
- **Overdue**: incomplete tasks past their due date are flagged.
- **Saved locally**: tasks and your theme choice survive closing and reopening the browser.
- **Backup**: export all tasks to a JSON file and import them back. Importing replaces the current
  tasks after you confirm.
- **Themes**: light and dark, following your system setting until you choose one.
- **Several tabs**: a change in one tab shows up in the others without reloading.
- **Keyboard and accessibility**: every action works from the keyboard, dialogs trap focus and
  return it when closed, and text contrast meets WCAG AA in both themes.

Because data lives in the browser, clearing site data removes your tasks. Use **Export** to keep a
copy.

## Setup

Requirements: [Node.js](https://nodejs.org/) 20 or newer and npm.

```bash
npm install
npx playwright install chromium   # only needed to run the end-to-end tests
npm run dev
```

Then open <http://localhost:5173>.

## npm scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the Vite dev server on port 5173 |
| `npm run build` | Type-check, then build the app into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run `tsc --noEmit` (strict mode must pass with no errors) |
| `npm test` | Run unit and component tests with Vitest |
| `npm run test:e2e` | Run end-to-end tests with Playwright (starts the dev server if needed) |

## Tech stack

TypeScript (strict), React 18, Vite, Vitest with Testing Library, and Playwright. Styling is plain
CSS with theme variables. There are no other runtime dependencies.

## Project structure

```text
src/
├── domain/        Pure business logic, no React or browser APIs
│   ├── task.ts      Task types, validation, create/update/complete
│   ├── query.ts     Filter, search, sort, tag list, stale-tag reset
│   ├── overdue.ts   Overdue rule and local date helper
│   └── transfer.ts  Export file format and import validation
├── storage/       Browser persistence
│   ├── taskStore.ts    Versioned task document in localStorage
│   ├── preferences.ts  Theme choice
│   └── crossTab.ts     Reload when another tab changes the data
├── state/
│   └── useTasks.ts  Reducer and hook tying the domain to storage
├── ui/            React components (App, TaskForm, TaskList, FilterBar, TransferMenu, ...)
├── styles/        tokens.css (light and dark variables) and app.css
└── main.tsx       App entry point

tests/
├── unit/          Domain, storage, state, performance, and contrast tests
├── component/     React component tests
└── e2e/           Playwright browser tests

specs/001-task-management/   Specification, plan, design docs, and task list
```

Business rules live only in `src/domain/`, which must not import from the UI, state, or storage
layers, so they can be tested on their own.

## Specification

The feature is specified in [`specs/001-task-management/spec.md`](specs/001-task-management/spec.md).
Related documents in the same folder:

- [`plan.md`](specs/001-task-management/plan.md): implementation plan and constitution check
- [`research.md`](specs/001-task-management/research.md): technical decisions and alternatives
- [`data-model.md`](specs/001-task-management/data-model.md): task fields and rules
- [`contracts/`](specs/001-task-management/contracts/): UI behavior and export file format
- [`quickstart.md`](specs/001-task-management/quickstart.md): manual validation scenarios
- [`tasks.md`](specs/001-task-management/tasks.md): the implementation task list

Project principles (independently testable features, explicit tested business logic, simplicity,
strict TypeScript, accessible UI, local-first) are in
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).
