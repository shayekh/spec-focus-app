# Feature Specification: Focus App Task Management

**Feature Branch**: `001-task-management`

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: "Build a personal task management application called Focus App. Users can create, edit, complete, and delete tasks. Each task has title, description, priority (low, medium, high), status (todo, in-progress, completed), optional due date, and tags. The main interface shows a list of tasks. Users can filter by status, priority, and tag, and search by title and description. Tasks persist locally so data survives restarts. Clean desktop-first interface with dark and light themes."

## Clarifications

### Session 2026-10-25

- Q: Should Focus App run as an installed desktop application or as a web page opened in a browser? → A: Web app opened in a browser, working offline, with data saved in the browser.
- Q: Should users be able to export their tasks to a file and import them back? → A: Yes, export all tasks to a file and import from that file.
- Q: When a user imports a file and tasks already exist, should the import replace all current tasks or add to them? → A: Replace all current tasks with the file's tasks, after a confirmation warning.
- Q: How should the task list be ordered? → A: Newest first by default, with user-selectable sorting by due date or priority.
- Q: What happens when Focus App is open in more than one browser tab? → A: Changes in one tab appear in the others, and the most recent save wins.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and view tasks (Priority: P1)

A user opens Focus App and sees their list of tasks. They add a new task with a title and
optionally a description, priority, due date, and tags, and it appears in the list. Their tasks
are still there after closing and reopening the app.

**Why this priority**: Capturing and seeing tasks, with data that survives restarts, is the
minimum viable product. Nothing else has value without it.

**Independent Test**: Create several tasks with varied fields, close and reopen the app, and
confirm every task appears with its details unchanged.

**Acceptance Scenarios**:

1. **Given** an empty task list, **When** the user creates a task with only a title, **Then** the task appears in the list with default priority and status "todo".
2. **Given** the user fills in all fields (title, description, priority, due date, tags), **When** they save, **Then** the list shows the task with all those details.
3. **Given** saved tasks exist, **When** the app is closed and reopened, **Then** all tasks are shown with their previous details.
4. **Given** the user tries to save a task with an empty title, **When** they submit, **Then** the task is not created and they see a clear message that a title is required.

---

### User Story 2 - Edit, complete, and delete tasks (Priority: P2)

A user changes a task's details, moves it through todo, in-progress, and completed, marks it
complete quickly, or deletes it when it is no longer needed.

**Why this priority**: Tasks change over time. Managing their lifecycle is the core value of a
task manager, once tasks can be created.

**Independent Test**: With existing tasks, edit one's fields, mark another complete, delete a
third, then reopen the app and confirm all changes were kept.

**Acceptance Scenarios**:

1. **Given** an existing task, **When** the user edits any field and saves, **Then** the list shows the updated values.
2. **Given** a task that is not completed, **When** the user marks it complete, **Then** its status becomes "completed" and it is visibly distinguished in the list.
3. **Given** a completed task, **When** the user changes its status back to "todo" or "in-progress", **Then** the task is no longer shown as completed.
4. **Given** an existing task, **When** the user deletes it and confirms, **Then** it is removed from the list and does not return after restart.
5. **Given** the user starts deleting a task, **When** they cancel the confirmation, **Then** the task remains.

---

### User Story 3 - Filter and search tasks (Priority: P3)

A user narrows a long list by status, priority, or tag, and searches by words in the title or
description to find a specific task.

**Why this priority**: It makes the list usable as it grows, but it only matters once there are
many tasks.

**Independent Test**: Load a set of tasks with mixed statuses, priorities, and tags, then apply
each filter and a search term and verify only matching tasks are shown.

**Acceptance Scenarios**:

1. **Given** tasks with mixed statuses, **When** the user filters by "in-progress", **Then** only in-progress tasks are shown.
2. **Given** tasks with mixed priorities, **When** the user filters by "high", **Then** only high-priority tasks are shown.
3. **Given** tasks with various tags, **When** the user filters by a tag, **Then** only tasks carrying that tag are shown.
4. **Given** several filters are active, **When** the list is shown, **Then** only tasks matching all active filters are shown.
5. **Given** tasks exist, **When** the user types a search term, **Then** tasks whose title or description contains the term (ignoring letter case) are shown.
6. **Given** filters or search match nothing, **When** the list is shown, **Then** the user sees a message that no tasks match, with a way to clear filters.

---

### User Story 4 - Dark and light themes (Priority: P4)

A user switches between a light and a dark appearance, and the choice is remembered.

**Why this priority**: It improves comfort and polish but does not affect task management.

**Independent Test**: Switch the theme, confirm the whole interface changes, then restart and
confirm the choice persisted.

**Acceptance Scenarios**:

1. **Given** the app is in light theme, **When** the user switches to dark, **Then** the entire interface uses the dark appearance with readable text.
2. **Given** the user selected a theme, **When** the app is reopened, **Then** the same theme is applied.
3. **Given** no theme has been chosen, **When** the app first opens, **Then** it uses the system's light or dark preference.

---

### Edge Cases

- Empty or whitespace-only title: rejected with a clear message.
- Very long titles, descriptions, or many tags: displayed without breaking the layout.
- Duplicate tags on one task (including differing only by letter case): stored once.
- Due date in the past: allowed, and the task is visibly marked overdue unless completed.
- Tag filter when the selected tag no longer exists on any task: the filter is cleared or shows an empty result with a clear message.
- Stored data is missing, cleared by the user, or unreadable at startup: the app opens with an empty list and informs the user rather than crashing.
- A filter is active while a task is edited so that it no longer matches: it leaves the visible list.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to create a task with a required title and optional description, priority, status, due date, and tags.
- **FR-002**: System MUST default a new task to priority "medium" and status "todo" when not specified.
- **FR-003**: System MUST reject a task with an empty or whitespace-only title and explain why.
- **FR-004**: Users MUST be able to edit every field of an existing task.
- **FR-005**: Users MUST be able to mark a task complete in a single action, and to change status among todo, in-progress, and completed.
- **FR-006**: Users MUST be able to delete a task, with confirmation before removal.
- **FR-007**: System MUST show all tasks in a list on the main screen, displaying at least title, priority, status, due date, and tags.
- **FR-008**: System MUST visually distinguish completed tasks and overdue incomplete tasks.
- **FR-009**: Users MUST be able to filter the list by status, by priority, and by tag, and combine filters.
- **FR-010**: Users MUST be able to search tasks by text in the title and description, case-insensitively, in combination with filters.
- **FR-011**: System MUST show a helpful empty state when there are no tasks or no matches.
- **FR-012**: System MUST persist all tasks and the theme choice in the user's browser on their device so they survive closing and reopening the browser and the app.
- **FR-013**: System MUST work fully without an internet connection or any account.
- **FR-014**: System MUST provide light and dark themes, default to the system preference, and remember the user's choice.
- **FR-015**: System MUST be fully operable by keyboard for all task actions, filters, search, and theme switching.
- **FR-016**: System MUST present a desktop-first layout that remains usable at smaller window sizes.
- **FR-017**: System MUST handle missing or unreadable stored data without losing the ability to use the app.
- **FR-018**: Users MUST be able to export all their tasks to a file on their device.
- **FR-019**: Users MUST be able to import tasks from a previously exported file, replacing all current tasks only after the user confirms a warning that existing tasks will be overwritten. The system MUST reject an invalid or corrupted file with a clear message without changing existing tasks.
- **FR-020**: System MUST order tasks newest first by default and let users sort by due date or by priority; tasks without a due date MUST appear after those with one when sorting by due date.
- **FR-021**: System MUST keep the list consistent when Focus App is open in more than one browser tab: changes in one tab MUST appear in the others without reloading, and when two tabs change the same task the most recent save wins.

### Key Entities

- **Task**: A unit of personal work. Attributes: unique identity, title (required), description (optional), priority (low, medium, high), status (todo, in-progress, completed), due date (optional), tags (zero or more), and created and last-updated times.
- **Tag**: A short label attached to tasks for grouping. A task can have many tags, and a tag can be on many tasks.
- **Preferences**: User settings kept locally, currently the chosen theme.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can create their first task in under 30 seconds without instructions.
- **SC-002**: 100% of tasks and edits are present after the app is closed and reopened.
- **SC-003**: With 500 tasks, applying a filter or search shows results in under 1 second.
- **SC-004**: Every task action (create, edit, complete, delete, filter, search, theme switch) can be completed using only the keyboard.
- **SC-005**: In both themes, all text meets standard readability contrast guidelines.
- **SC-006**: 90% of first-time users can find a specific task using search or filters on their first attempt.
- **SC-007**: Tasks exported and then imported into an empty Focus App are identical to the originals in 100% of fields.

## Assumptions

- Focus App is a single-user personal tool: no accounts, sharing, or sync between devices.
- Data lives only on the user's device; the only backup mechanism is manual file export and import (no cloud backup).
- Focus App is a web app used in a desktop browser, working fully offline once loaded; installable desktop packaging and a dedicated phone layout are out of scope.
- Tasks have no sub-tasks, recurring schedules, reminders, or notifications in this version.
- Due dates are calendar dates without a time of day.
- The default list order is by creation date, newest first; users can switch to sorting by due date or priority.
- Tags are free-form, entered by the user, and compared ignoring letter case.
- Filtering by status, priority, and tag each selects a single value at a time; the three combine with each other.
- Completed tasks stay in the list (not hidden) unless the user filters them out.
- Constraints from the project constitution apply: local-first with no required backend, independently testable features, and a keyboard-accessible, responsive UI.
