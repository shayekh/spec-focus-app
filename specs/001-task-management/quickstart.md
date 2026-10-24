# Quickstart: Validating Focus App Task Management

Run these checks once the feature is implemented. Detailed rules live in [data-model.md](data-model.md)
and [contracts/](contracts/).

## Prerequisites

- Node.js 20 LTS and npm.
- A modern desktop browser.

## Setup and automated checks

```bash
npm install
npm run typecheck   # tsc --noEmit, strict mode must pass with no errors
npm test            # Vitest unit + React Testing Library component tests
npm run test:e2e    # Playwright end-to-end tests
npm run dev         # start the app locally
```

Expected: type check and all tests pass.

## Manual validation scenarios

1. **Create and persist (User Story 1)**: Create tasks, one with only a title and one with all fields. Reload the page. Expected: both appear unchanged; the title-only task is medium priority, status todo.
2. **Title required**: Try to save an empty title. Expected: inline error, no task created.
3. **Edit, complete, delete (User Story 2)**: Edit a task, mark another complete, delete a third and confirm. Reload. Expected: changes persist; cancelling the delete keeps the task.
4. **Filter and search (User Story 3)**: With mixed tasks, apply status, priority, and tag filters, then combine them, then search a word from a description. Expected: only matching tasks; empty-match message with Clear filters.
5. **Sort**: Switch to due-date and priority sort. Expected: undated tasks last; high priority first.
6. **Theme (User Story 4)**: Toggle theme and reload. Expected: theme persists; on a fresh profile it follows the system setting.
7. **Export and import**: Export, clear site data, import the file. Expected: all tasks restored identically. Import a non-JSON file: Expected: clear error, no changes. Import with existing tasks: Expected: overwrite warning first.
8. **Two tabs**: Open the app in two tabs and add a task in one. Expected: it appears in the other without reload.
9. **Keyboard only**: Complete steps 1 to 6 without a mouse. Expected: all actions reachable with visible focus.
10. **Performance**: Load 500 tasks (via import). Expected: filter and search results appear in under 1 second.
11. **Corrupt data**: Set the stored tasks value to invalid JSON and reload. Expected: app opens empty with a notice, no crash.
