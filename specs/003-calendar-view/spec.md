# Feature Specification: Calendar View (v3)

**Feature Branch**: `003-calendar-view`

**Created**: 2026-10-25

**Status**: Implemented

**Extends**: [001-task-management](../001-task-management/spec.md), [002-task-form-modal](../002-task-form-modal/spec.md)

**Extended by**: [004-recurring-tasks](../004-recurring-tasks/spec.md), which adds repeat symbols and upcoming-occurrence previews to the calendar

**Input**: User description: "Add a calendar view to Focus App. Users can switch between the existing task-list view and a calendar view. The calendar supports month, week, and day views. Tasks with due dates appear on the calendar. Users can drag a scheduled task to another date, which changes its due date. Users can click a calendar task to open its task details. Tasks without a due date do not appear on the calendar. The current date is visually distinguished."

## Clarifications

### Session 2026-10-25

- Q: Do the list's status, priority, tag, and search filters also apply to the calendar? → A: Yes. One set of filters controls what both views show, so the two views never disagree about which tasks are visible.
- Q: What does clicking a calendar task open as its "task details"? → A: The existing task form in a modal (spec 002), showing every field and allowing edits.
- Q: Dragging is pointer-only. How do keyboard users reschedule? → A: Through a keyboard alternative on every calendar task, because the constitution requires the UI to be keyboard accessible.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See my tasks on a month calendar (Priority: P1)

A user switches from the task list to the calendar and sees the current month. Every task with a due date is shown on its due date, today is clearly marked, and they can step to other months and back to today.

**Why this priority**: Seeing tasks laid out by date is the point of the feature, and the month is the natural default.

**Independent Test**: With tasks due on several dates (and some with no date), switch to the calendar, confirm each dated task is on its date, undated tasks are absent, today is marked, and Previous, Next, and Today work.

**Acceptance Scenarios**:

1. **Given** the task list is showing, **When** the user switches to the calendar view, **Then** a month calendar for the current month appears and the list is no longer shown.
2. **Given** tasks due on different dates this month, **When** the calendar is showing, **Then** each task appears on the day of its due date, showing its title.
3. **Given** a task with no due date, **When** the calendar is showing, **Then** that task does not appear anywhere on it.
4. **Given** the calendar is showing the current month, **When** the user looks at it, **Then** today's date is visually distinguished from other dates, in a way that does not rely on color alone.
5. **Given** the calendar is showing, **When** the user chooses Next, Previous, or Today, **Then** it moves to the following month, the previous month, or the month containing today, and the heading names the visible month.
6. **Given** the calendar is showing, **When** the user switches back to the list view, **Then** the task list returns exactly as it was.

---

### User Story 2 - Look at a week or a single day (Priority: P2)

A user changes the calendar from month to week or day to see a closer view of what is due, and steps through weeks or days.

**Why this priority**: Month view is enough to find tasks, but planning a week or a day needs the closer views.

**Independent Test**: Switch between Month, Week, and Day, confirm the right dates are shown and tasks sit on the right days in each, and that Previous, Next, and Today move by one month, week, or day.

**Acceptance Scenarios**:

1. **Given** the calendar is showing, **When** the user chooses Week, **Then** seven consecutive days are shown, starting on Monday, with each task on its due date.
2. **Given** the calendar is showing, **When** the user chooses Day, **Then** a single date is shown with every task due that day.
3. **Given** the week or day view, **When** the user chooses Next, Previous, or Today, **Then** it moves forward by one week or day, back by one, or to the period containing today.
4. **Given** the user is in a view, **When** they switch among Month, Week, and Day, **Then** the date they were looking at stays in view (the week or month containing it, or the day itself).
5. **Given** a day with no tasks due, **When** it is shown in the day view, **Then** the user sees a clear message that nothing is due that day.

---

### User Story 3 - Open a task from the calendar (Priority: P2)

A user clicks a task on the calendar and sees its full details, can edit them, and returns to the calendar where they were.

**Why this priority**: A calendar entry shows little; opening it is how users act on what they find.

**Independent Test**: Click a calendar task, confirm its details open with every field, change something and save, and confirm the calendar shows the change and focus returns to that task.

**Acceptance Scenarios**:

1. **Given** a task on the calendar, **When** the user clicks it, **Then** its details open in the task form modal with all fields filled in.
2. **Given** the details are open, **When** the user changes the due date and saves, **Then** the task moves to its new date on the calendar.
3. **Given** the details are open, **When** the user closes them, **Then** the calendar is as it was and keyboard focus returns to the task that was clicked.
4. **Given** the user uses only the keyboard, **When** they reach a calendar task and press Enter, **Then** the same details open.

---

### User Story 4 - Reschedule by moving a task to another date (Priority: P3)

A user drags a task from one date to another and its due date changes. Someone who cannot drag does the same thing with the keyboard.

**Why this priority**: Rescheduling is the calendar's most convenient action, but everything above works without it.

**Independent Test**: Drag a task to a different date and confirm its due date changed and persists after reload; then do the same move using only the keyboard.

**Acceptance Scenarios**:

1. **Given** a task on the calendar, **When** the user drags it onto another date and releases it, **Then** the task's due date becomes that date, it appears there immediately, and the change survives a reload.
2. **Given** a task is being dragged, **When** it is over a date, **Then** that date is visibly marked as the drop target.
3. **Given** a task is being dragged, **When** the user releases it on its own date or outside any date, **Then** nothing changes.
4. **Given** a task on the calendar, **When** the user moves it by keyboard (choosing the move action on the task, then choosing a target date), **Then** the result is identical to dragging it there.
5. **Given** a move was started by keyboard, **When** the user presses Escape, **Then** the move is cancelled and the due date is unchanged.
6. **Given** the month view shows days from the previous or next month, **When** a task is moved onto one of those days, **Then** its due date becomes that date.
7. **Given** a task moved to a date earlier than today, **When** it appears there, **Then** it is marked overdue like any other overdue task, unless it is completed.

---

### Edge Cases

- **Many tasks on one day**: the month view shows a limited number per day, followed by a "+N more" control that opens that day's view; no task is hidden without a way to reach it.
- **Completed and overdue tasks**: shown on their due dates with the same completed and overdue styling as in the list.
- **Filters or search active**: only matching tasks appear on the calendar, and the calendar says when filters hide everything in the visible period.
- **No tasks in the visible period**: a clear empty message appears (month, week, and day).
- **Task edited, completed, or deleted while on the calendar**: the calendar updates to match without a reload.
- **Task changed in another browser tab**: the calendar updates without a reload.
- **Long titles**: wrap or are shortened with the full title still available, without breaking the layout.
- **Time zones and midnight**: a due date is a calendar date, so a task due on the 5th is always on the 5th regardless of the user's time zone.
- **Leap years and month lengths**: months of every length, including February in leap years, show the correct dates.
- **Dragging a task that is also open in the details modal**: not possible, because the modal blocks the page underneath.
- **Very small windows**: the calendar stays usable; narrow windows may scroll the grid sideways or switch to a compact arrangement, but never hide navigation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to switch between the task-list view and a calendar view using a control that is reachable and operable by keyboard and shows which view is current.
- **FR-002**: The calendar MUST offer Month, Week, and Day views, selectable by the user, with Month shown first.
- **FR-003**: The calendar MUST provide Previous, Next, and Today controls that move by one month, week, or day according to the current view, and MUST show a heading naming the visible month, week, or day.
- **FR-004**: Every task with a due date MUST appear on the calendar on its due date, in all three views, showing at least its title, a priority cue, and its completed or overdue styling.
- **FR-005**: Tasks without a due date MUST NOT appear on the calendar.
- **FR-006**: The current date MUST be visually distinguished in all three views, in a way that does not depend on color alone, and MUST be identifiable to assistive technology.
- **FR-007**: Selecting a calendar task (by click or by keyboard) MUST open that task's details in the task form modal from spec 002, with all fields filled in, and closing it MUST return focus to that task.
- **FR-008**: Dragging a calendar task onto another date MUST set the task's due date to that date, show it there immediately, and persist the change.
- **FR-009**: While a task is being dragged, the date under it MUST be visibly marked as the drop target.
- **FR-010**: Releasing a dragged task on its own date, or outside any date, MUST leave its due date unchanged.
- **FR-011**: Every reschedule that can be done by dragging MUST also be possible by keyboard alone, and Escape MUST cancel a move in progress without changing the due date.
- **FR-012**: In the month view, when a day has more tasks than fit, the view MUST show a "+N more" control that opens that day's view, so every task stays reachable.
- **FR-013**: The status, priority, tag, and search filters MUST apply to the calendar exactly as they apply to the list, so both views show the same set of tasks.
- **FR-014**: Each view MUST show a clear message when no task is due in the visible period.
- **FR-015**: Changes to tasks (edits, completion, deletion, and changes made in another browser tab) MUST show on the calendar without a reload.
- **FR-016**: Due dates MUST be treated as calendar dates without a time or time zone, so a task always appears on the date stored for it.
- **FR-017**: The calendar MUST be fully operable by keyboard, with a visible focus indicator, and MUST meet the app's contrast standards in both the light and dark themes.
- **FR-018**: Week and month grids MUST start on Monday, and the month view MUST include the trailing and leading days of the adjacent months needed to fill whole weeks.

### Key Entities

- **Task**: The existing task. Its due date is what places it on the calendar; this feature changes the due date only when the user moves a task.
- **Calendar period**: What the calendar is currently showing: a view (month, week, or day) and the date it is centered on. It exists only while the app is open.
- **Calendar entry**: A task placed on one date in a view. A task has at most one entry, on its due date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can get from the task list to the calendar in one action and back again in one action.
- **SC-002**: 100% of tasks that have a due date within the visible period can be seen or reached from the calendar (directly, or through "+N more"), and 0 tasks without a due date appear.
- **SC-003**: A task can be rescheduled to another date in a single drag, and the same move can be done by keyboard alone: moving a task by one day or by one week takes at most 3 key presses (start the move, choose the direction, confirm).
- **SC-004**: After a reschedule, the task shows on its new date immediately and is still there after a reload in 100% of cases.
- **SC-005**: With 500 tasks, switching views or moving to another month shows the result in under 1 second.
- **SC-006**: Every calendar action (switching views, navigating, opening a task, rescheduling) can be completed using only the keyboard.
- **SC-007**: Text and indicators on the calendar meet the same contrast standards as the rest of the app in both themes, and today is identifiable without relying on color.

## Assumptions

- The app opens in the list view each time; the calendar opens on the current month. The chosen calendar view and date are kept while switching between list and calendar during a session, but are not saved between visits.
- "Task details" means the existing task form modal (spec 002), so editing a task from the calendar works exactly as it does from the list.
- Filters and search are shared between the list and the calendar (see Clarifications).
- Tasks have a due date but no time of day or duration, so the calendar shows tasks on days, not at hours, and a task never spans several days.
- Weeks start on Monday.
- Dragging is a pointer feature for desktop browsers. Touch dragging is out of scope; the keyboard alternative covers users who cannot drag.
- Recurring tasks and subtasks come in later versions and are not part of this one. Recurring tasks are delivered in [004-recurring-tasks](../004-recurring-tasks/spec.md), which adds repeat symbols and dashed upcoming-occurrence previews to this calendar.
- The constitution applies: keyboard accessible and responsive, independently testable, local-first with no backend, and no new third-party service.
