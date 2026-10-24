# Research: Focus App Task Management

All Technical Context unknowns are resolved below; no `NEEDS CLARIFICATION` remains.

## Language and UI framework

- **Decision**: TypeScript (strict) with React 18 built by Vite.
- **Rationale**: TypeScript strict is mandated by the constitution. React gives accessible, testable components with a mature testing library; Vite needs minimal configuration.
- **Alternatives considered**: Vanilla TS (more manual DOM/focus handling, harder to test components); Svelte/Vue (fine, but no advantage for this scope and less familiar tooling); Next.js (server features unneeded, violates simplicity).

## Persistence

- **Decision**: `localStorage` holding one versioned JSON document of tasks, plus a separate theme key.
- **Rationale**: Data is small (thousands of tasks at most), access is synchronous and simple, and it needs no backend or runtime network requests. A `version` field enables future migration.
- **Alternatives considered**: IndexedDB (async, more code, unneeded at this size, can be adopted later behind the same storage module); file-system access (browser support uneven).
- **Risk handled**: Browser data can be cleared, so export/import (FR-018/019) is the backup path. Corrupt JSON is caught and the app starts empty with a notice (FR-017).

## Cross-tab consistency

- **Decision**: Subscribe to the browser `storage` event; on change, reload tasks from storage. Last write wins.
- **Rationale**: Directly satisfies FR-021 with no extra dependency. Each save writes the entire document, so the latest save is authoritative.
- **Alternatives considered**: BroadcastChannel (works, but `storage` event already fires on each write and needs no second channel); merge/CRDT logic (over-engineered, spec says most recent save wins).

## State management

- **Decision**: React `useReducer` in a single `useTasks` hook calling pure domain functions.
- **Rationale**: Small state; keeps business rules out of components.
- **Alternatives considered**: Redux/Zustand (unneeded abstraction per Principle III).

## Dates and overdue

- **Decision**: Store due dates as `YYYY-MM-DD` strings; compare against today's local date as a string. No date library.
- **Rationale**: Spec uses calendar dates without time; string comparison avoids timezone bugs. A task is overdue when due date is before today and status is not completed.
- **Alternatives considered**: date-fns/Day.js (extra dependency for trivial comparisons); `Date` objects with times (introduces timezone errors).

## Identity and timestamps

- **Decision**: `crypto.randomUUID()` for task ids; ISO 8601 strings for created/updated times.
- **Rationale**: Native, collision-safe, and stable across export/import.

## Search, filter, sort

- **Decision**: In-memory pure functions over the task array; case-insensitive substring match on title and description; filters combine with AND; sort by created (default, newest first), due date (undated last), or priority (high to low).
- **Rationale**: 500 to a few thousand tasks filter in well under 1 s without indexing.
- **Alternatives considered**: Search index libraries (unneeded).

## Theming

- **Decision**: CSS custom properties on `:root` with `data-theme` attribute; default from `prefers-color-scheme`; user choice saved in `localStorage`.
- **Rationale**: No runtime library, no flash if applied before first paint, easy to verify contrast per theme.

## Accessibility

- **Decision**: Semantic elements (`button`, `label`, `ul`), native `<dialog>` or focus-trapped modal with Escape to close, visible focus rings, ARIA live region for result counts and errors.
- **Rationale**: Meets FR-015 and SC-004; verified by a Playwright keyboard-only test and a contrast check on both themes.

## Import validation

- **Decision**: Hand-written type guard validating the export document (version, task shapes, enum values, ISO dates) before any state change.
- **Rationale**: Single untrusted boundary; avoids a schema library dependency. Invalid files are rejected wholesale (FR-019).

## Testing

- **Decision**: Vitest for domain/storage, React Testing Library for components, Playwright for end-to-end (restart persistence, keyboard-only flow, two-tab sync).
- **Rationale**: Covers each user story independently, as required by Principles I and II.
