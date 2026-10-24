# Focus App Constitution

## Core Principles

### I. Independently Testable Features
Every feature MUST be deliverable and verifiable on its own. A feature MUST NOT require
another unfinished feature in order to be exercised by its tests. Features MUST expose clear
boundaries (inputs, outputs, state) so they can be tested in isolation.
Rationale: independent slices allow incremental delivery and reliable regression detection.

### II. Explicit, Tested Business Logic
Business rules (e.g., timers, sessions, streaks, scheduling) MUST be represented explicitly as
pure, UI-independent modules or functions, not embedded in UI components. All business logic
MUST have automated tests covering normal, edge, and error cases.
Rationale: explicit logic is easy to reason about, reuse, and verify.

### III. Simplicity Over Abstraction
Solutions MUST be the simplest that satisfy the requirement. Abstractions, layers, and
dependencies MUST NOT be introduced without a present, concrete need, and any added
complexity MUST be justified in the plan or review.
Rationale: simple code is cheaper to maintain and change.

### IV. Strict TypeScript
All source code MUST be written in TypeScript with `strict` type checking enabled. The use
of `any` and non-justified type assertions or `@ts-ignore` MUST be avoided; any exception
MUST carry an inline explanation. The type check MUST pass with no errors before merge.
Rationale: strict types catch defects early and document intent.

### V. Responsive and Keyboard-Accessible UI
The UI MUST remain responsive: long-running work MUST NOT block user interaction. All
interactive functionality MUST be fully operable via keyboard, with visible focus indicators
and appropriate semantic markup or ARIA labels.
Rationale: a focus tool must not itself interrupt or exclude its users.

### VI. Local-First, No Required Backend
The application MUST work fully without any backend service. User data MUST be stored locally
by default. Any network feature MUST be optional, and its absence MUST NOT degrade core
functionality.
Rationale: local-first design provides privacy, offline use, and operational simplicity.

## Technology & Platform Constraints

- Language: TypeScript (strict mode).
- Persistence: local storage on the user's device; no mandatory server, account, or API.
- Optional network integrations MUST degrade gracefully when offline.
- Further stack choices (framework, test runner, build tooling) are to be decided in feature
  plans and MUST respect the principles above.

## Development Workflow

- Each feature MUST have a spec and plan, and tasks that map to independently testable slices.
- Business logic changes MUST include or update tests in the same change.
- Type checking and the test suite MUST pass before merge.
- Reviews MUST verify compliance with this constitution; deviations MUST be documented.

## Governance

This constitution supersedes other project practices. Amendments MUST be made by editing this
file, with a documented rationale and a version bump, and MUST be reviewed for impact on
existing specs, plans, and tasks. Versioning follows semantic versioning: MAJOR for
backward-incompatible principle removals or redefinitions, MINOR for added or materially
expanded principles or sections, PATCH for clarifications and wording fixes. Compliance MUST
be checked in every plan and review; unjustified complexity or violations MUST be resolved or
recorded as explicit, justified exceptions.

**Version**: 1.0.0 | **Ratified**: 2026-10-24 | **Last Amended**: 2026-10-24
