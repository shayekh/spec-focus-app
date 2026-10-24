# Feature Specification: Recurring Tasks (v4)

**Feature Branch**: `004-recurring-tasks`

**Created**: 2026-10-25

**Status**: Implemented

**Extends**: [001-task-management](../001-task-management/spec.md), [002-task-form-modal](../002-task-form-modal/spec.md), [003-calendar-view](../003-calendar-view/spec.md)

**Extended by**: [005-subtasks](../005-subtasks/spec.md), which gives a task steps; a repeating task's next occurrence gets a fresh copy of them

**Input**: User description: "Add recurring tasks to Focus App. Users can configure a task to repeat: daily, weekly, monthly, or on selected days of the week. Users can specify an optional end date. When a recurring task is completed, Focus App creates the next occurrence according to its recurrence rule. Completing one occurrence must not mark future occurrences as completed. Users can edit either the current occurrence or the entire recurring series. Users can stop a recurring series. Recurring tasks should appear correctly on the calendar."

## Terms

- **Series**: a recurring task together with all of its occurrences.
- **Occurrence**: one task in a series, with its own due date and its own status.
- **Open occurrence**: the one occurrence of a series that is not completed yet. A series has at most one open occurrence at a time; completing it creates the next.

## Clarifications

### Session 2026-10-25

- Q: Is the next occurrence worked out from the scheduled due date or from the day it was completed? → A: From the scheduled due date. A weekly Monday task completed on a Wednesday still comes back the following Monday.
- Q: Do future occurrences show on the calendar before they exist? → A: Yes, as read-only previews, so a weekly task is visible week after week. Only the open occurrence is a real task that can be completed, dragged, or moved.
- Q: Which details does "entire series" change? → A: The title, description, priority, tags, repeat rule, and end date. The due date and the status always belong to one occurrence.
- Q: What happens to a series when its open occurrence is deleted? → A: The series ends. Occurrences already completed stay as history.
- Q: What does stopping a series do? → A: The open occurrence becomes an ordinary one-time task and no further occurrences are created. Completed occurrences stay as history.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Make a task repeat (Priority: P1)

A user opens a task's form, chooses how often it repeats (daily, weekly, monthly, or on selected days of the week), optionally sets an end date, and saves. The task shows that it repeats.

**Why this priority**: Nothing else in this feature works until a task can be set to repeat.

**Independent Test**: Create a task with a due date, set each kind of repeat in turn, save, reopen it, and confirm the rule and end date were kept and the list says the task repeats.

**Acceptance Scenarios**:

1. **Given** the task form with a due date set, **When** the user chooses a repeat of Daily, Weekly, Monthly, or "On selected days", **Then** the form shows what is needed for that choice (the days to pick for "On selected days") and an optional "Repeat until" date.
2. **Given** "On selected days" is chosen, **When** the user picks Monday, Wednesday, and Friday and saves, **Then** the task repeats on those three days of every week.
3. **Given** a repeat is set, **When** the user saves, **Then** the list shows the task with a repeat label that summarizes the rule, such as "Repeats weekly" or "Repeats Mon, Wed, Fri until Dec 31, 2026".
4. **Given** the form has no due date, **When** the user chooses a repeat, **Then** the form asks for a due date and does not save until one is set, because the due date is where the repeating starts.
5. **Given** "On selected days" is chosen with no day picked, **When** the user saves, **Then** the form explains that at least one day is needed.
6. **Given** an end date before the due date, **When** the user saves, **Then** the form explains that the end date cannot be earlier than the due date.
7. **Given** a task that repeats, **When** the user sets the repeat back to "Does not repeat" and saves with "Entire series" selected, **Then** the task becomes an ordinary one-time task.

---

### User Story 2 - Completing an occurrence creates the next (Priority: P1)

A user completes a recurring task. It is marked completed, and a new open occurrence appears with the next due date from the rule. Completing it never affects later occurrences.

**Why this priority**: This is what makes a recurring task different from a copy-and-paste one.

**Independent Test**: For each kind of repeat, complete the open occurrence repeatedly and confirm each new occurrence is due on the right date, is not completed, and that earlier occurrences stay completed.

**Acceptance Scenarios**:

1. **Given** a daily task due today, **When** the user completes it, **Then** it shows as completed and a new open occurrence due tomorrow appears.
2. **Given** a weekly task due on a Monday, **When** it is completed, **Then** the next occurrence is due the following Monday, even if it was completed on a Wednesday.
3. **Given** a monthly task due on the 31st, **When** it is completed in a month with 30 days, **Then** the next occurrence falls on the last day of the month that has fewer days, and returns to the 31st in months that have one.
4. **Given** a task on selected days (Monday, Wednesday, Friday) due on a Friday, **When** it is completed, **Then** the next occurrence is due the following Monday.
5. **Given** the new occurrence is created, **When** the user looks at it, **Then** it has the same title, description, priority, tags, and repeat rule, and its status is "todo".
6. **Given** a series with an end date, **When** the occurrence whose next date would fall after the end date is completed, **Then** no new occurrence is created, and the user is told that was the last occurrence.
7. **Given** a series with several completed occurrences and one open one, **When** the open one is completed, **Then** only it changes, and the earlier completed occurrences keep their dates and status.
8. **Given** the user marks an occurrence complete by any route (the Complete button in the list, or setting its status to completed in the task form), **When** it becomes completed, **Then** the next occurrence is created exactly once.
9. **Given** a completed occurrence whose series already has a newer open occurrence, **When** the user changes its status back to "todo" or "in-progress", **Then** it becomes an ordinary one-time task, so the series never has two open occurrences.

---

### User Story 3 - Edit one occurrence or the whole series, and stop a series (Priority: P2)

A user edits a recurring task and chooses whether the change applies only to this occurrence or to the entire series. They can also stop the series.

**Why this priority**: Real schedules change, and users must be able to change one day without breaking the pattern, or change the pattern without redoing every task.

**Independent Test**: Edit the same recurring task twice, once for this occurrence and once for the series, complete it, and confirm the next occurrence shows the series change only. Then stop the series and confirm nothing new is created.

**Acceptance Scenarios**:

1. **Given** the form for a recurring task, **When** it opens, **Then** it asks what the changes apply to, with "This occurrence only" selected by default and "Entire series" as the alternative.
2. **Given** "This occurrence only" is selected, **When** the user changes the title and saves, **Then** only this occurrence changes, and the next occurrence created later has the series' original title.
3. **Given** "Entire series" is selected, **When** the user changes the title, description, priority, or tags and saves, **Then** the open occurrence and every occurrence created afterwards use the new values, and occurrences already completed are unchanged.
4. **Given** "Entire series" is selected, **When** the user changes the repeat rule or the end date and saves, **Then** the next occurrence after completion follows the new rule from this occurrence's due date.
5. **Given** the user changes the due date or status, **When** they save, **Then** it applies to this occurrence only, whichever choice is selected, and the form says so beside those fields.
6. **Given** a recurring occurrence is moved to another due date (in the form or by dragging on the calendar), **When** it is completed, **Then** the next occurrence follows the rule from the new due date.
7. **Given** a recurring task, **When** the user chooses "Stop repeating" and confirms, **Then** the task becomes an ordinary one-time task, no further occurrences are created, and completed occurrences remain.
8. **Given** a recurring task is deleted, **When** the user confirms, **Then** the confirmation first says that the task repeats and that deleting it ends the series, and afterwards no new occurrences are created.
9. **Given** the user opens a completed occurrence of a series that has an open occurrence, **When** they choose "Entire series" and save, **Then** the changes apply to the open occurrence and future ones, not to the completed one.

---

### User Story 4 - See recurring tasks on the calendar (Priority: P2)

A user looks at the calendar and sees where a recurring task falls: the open occurrence, the occurrences already completed, and the upcoming ones.

**Why this priority**: Seeing a weekly task appear every week is much of the reason to schedule it on a calendar.

**Independent Test**: Make a weekly task with an end date, complete it twice, and in the month, week, and day views confirm completed occurrences, the open one, and previews of upcoming ones (up to the end date) all appear on the right dates.

**Acceptance Scenarios**:

1. **Given** a recurring task, **When** the calendar shows its due date, **Then** the entry carries a repeat indicator (a symbol and the words "repeats" in its accessible name), not color alone.
2. **Given** a series with an open occurrence, **When** the calendar shows dates after that occurrence and after today, **Then** each future date the rule produces shows a read-only preview of the task, visibly different from a real entry and described as "upcoming".
3. **Given** a series with an end date, **When** the calendar shows dates after the end date, **Then** no previews appear there.
4. **Given** a preview, **When** the user selects it, **Then** the series' open occurrence opens for editing, and a preview cannot be dragged, moved, or completed on its own.
5. **Given** completed occurrences of a series, **When** the calendar shows their dates, **Then** they appear as completed entries.
6. **Given** the list filters hide the open occurrence, **When** the calendar is shown, **Then** its previews are hidden too.
7. **Given** the open occurrence is moved to another date, **When** the calendar updates, **Then** previews follow the rule from the new date.
8. **Given** many previews on one date in the month view, **When** the date has more entries than fit, **Then** the "+N more" control counts and reaches them like any other entry.

---

### Edge Cases

- **Months without the chosen day**: a monthly rule on the 29th, 30th, or 31st uses the last day of shorter months and goes back to the chosen day in longer ones.
- **Leap years**: a monthly task on 29 February and daily tasks across 29 February behave correctly.
- **Completing a task far behind**: a daily task due ten days ago is completed; the next occurrence is due the day after the old due date (and so is also overdue), because the schedule is not shifted to the completion day.
- **Task completed in two browser tabs**: whichever tab saves last wins, and the series still ends up with one open occurrence.
- **Series ended by its end date**: the last occurrence, once completed, is an ordinary completed task, and the form shows no repeat for it.
- **Weekly without a chosen day**: the day is the weekday of the due date when the repeat was set.
- **Changing the repeat type while editing the series**: the weekday or day of the month for the new rule is taken from the due date in the form.
- **Imported data**: files exported before this version import fine and have no recurring tasks; files with recurring tasks restore their rules, end dates, and series.
- **Older or unreadable recurrence data**: a task whose recurrence rule cannot be understood is treated as an ordinary one-time task rather than breaking the app.
- **A series with no open occurrence** (for example after import): its completed occurrences are history, and editing one affects only itself.
- **Task without a due date**: cannot be set to repeat.
- **Very long series on the calendar**: previews are produced only for the dates on screen, so even a daily series never slows the calendar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The task form MUST let the user choose how a task repeats: does not repeat, daily, weekly, monthly, or on selected days of the week (one or more of Monday to Sunday).
- **FR-002**: The task form MUST let the user set an optional end date for a repeat ("Repeat until"), and MUST reject an end date earlier than the due date.
- **FR-003**: A task MUST have a due date to repeat, and the form MUST explain this and refuse to save a repeat without one. A due date MUST NOT be removed from a task that repeats.
- **FR-004**: "On selected days" MUST require at least one day.
- **FR-005**: Weekly repeats MUST fall on the weekday of the due date when the repeat was set. Monthly repeats MUST fall on the day of the month of the due date when the repeat was set, using the last day of any month that is too short.
- **FR-006**: The list and the calendar MUST show that a task repeats, with a label that summarizes the rule and any end date.
- **FR-007**: When a recurring open occurrence becomes completed, by any route, the app MUST create exactly one next occurrence due on the first date the rule produces strictly after the completed occurrence's due date, unless that date is after the end date.
- **FR-008**: The new occurrence MUST copy the title, description, priority, tags, and repeat rule, and MUST start with the status "todo".
- **FR-009**: Completing an occurrence MUST NOT change the status or due date of any other occurrence.
- **FR-010**: When no further occurrence is created because the end date has passed, the app MUST tell the user that this was the last occurrence, and the task MUST become an ordinary completed task.
- **FR-011**: When a completed occurrence is reopened while its series already has a newer open occurrence, the reopened task MUST become an ordinary one-time task.
- **FR-012**: When editing a task that belongs to a series, the form MUST ask whether the changes apply to "This occurrence only" or to the "Entire series", with "This occurrence only" selected by default.
- **FR-013**: "This occurrence only" MUST change only that occurrence. "Entire series" MUST change the title, description, priority, tags, repeat rule, and end date of the open occurrence and of all occurrences created later, and MUST NOT change completed occurrences. The due date and the status MUST always apply to one occurrence only, and the form MUST say so next to those fields.
- **FR-014**: The next occurrence MUST be computed from the due date the occurrence has when it is completed, so moving an occurrence moves what follows it.
- **FR-015**: The user MUST be able to stop a series. Stopping MUST turn the open occurrence into an ordinary one-time task, create no further occurrences, and leave completed occurrences untouched. The user MUST confirm first.
- **FR-016**: Deleting a recurring open occurrence MUST warn that it repeats and that deleting it ends the series, and after confirmation MUST create no new occurrences.
- **FR-017**: The calendar MUST show each occurrence of a series on its due date (open and completed), and MUST show read-only previews of future occurrences for the visible dates after the open occurrence and after today, up to the end date.
- **FR-018**: Previews MUST be visibly and programmatically distinct from real entries (a different look, not color alone, and the word "upcoming" in the accessible name), MUST open the series' open occurrence when selected, and MUST NOT be draggable, movable, or completable.
- **FR-019**: Previews MUST follow the list filters: if the open occurrence is filtered out, its previews are too.
- **FR-020**: Previews MUST be produced only for dates that are on screen, so the calendar stays fast however long a series runs.
- **FR-021**: Export MUST include recurrence rules, end dates, and series identity, and import MUST restore them. Files exported before this version MUST still import.
- **FR-022**: A recurrence rule that cannot be understood MUST be treated as no recurrence instead of causing an error.
- **FR-023**: Everything in this feature (choosing a repeat, the edit scope, stopping a series, completing, and the calendar previews) MUST be operable by keyboard, with visible focus, and MUST meet the app's contrast standards in both themes.

### Key Entities

- **Recurrence rule**: how a task repeats. Its kind is daily, weekly, monthly, or selected days. A weekly rule records its weekday, a monthly rule records its day of the month, a selected-days rule records the chosen days, and any rule can have an end date.
- **Series**: the identity shared by all occurrences of one recurring task.
- **Occurrence**: an ordinary task (title, description, priority, status, due date, tags) that also carries the rule and the series identity. A series has at most one open occurrence.
- **Preview**: a future occurrence shown on the calendar but not yet created. It exists only for display.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can set an existing task to repeat weekly on its due date's weekday and save it in no more than 3 selections after opening its form (open the repeat choice, pick Weekly, save).
- **SC-002**: Completing an open occurrence creates exactly one next occurrence in 100% of cases when the next date is within the end date, and none when it is not; no other occurrence changes status.
- **SC-003**: Over 24 simulated months of completions, every rule kind produces the right next date every time, including month ends and leap years.
- **SC-004**: After a change with "Entire series", 100% of occurrences created afterwards carry the change; after "This occurrence only", 0% do.
- **SC-005**: The calendar shows every occurrence of a series that falls on a visible date: completed and open ones as entries, and future ones up to the end date as previews, with none missing and none after the end date.
- **SC-006**: With 500 tasks, including 100 recurring series, switching calendar views or months shows the result in under 1 second.
- **SC-007**: A task set to repeat, exported, and imported into an empty app has an identical rule, end date, and series in 100% of fields.
- **SC-008**: Choosing a repeat, completing an occurrence, editing a series, and stopping a series can each be done using only the keyboard.

## Assumptions

- Repeats are every day, every week, every month, or on chosen days of the week, always every 1 time unit. "Every 2 weeks", yearly repeats, and "the second Tuesday of the month" are out of scope.
- A repeat starts from the task's due date; there is no separate start date, and there is no time of day.
- A series has one open occurrence at a time, and future occurrences are created only when the open one is completed. Until then they exist only as calendar previews.
- The next occurrence is based on the scheduled due date, so a task completed late may produce an occurrence that is already overdue.
- Subtasks arrive in a later version ([005-subtasks](../005-subtasks/spec.md)); this version ignores them.
- The constitution applies: keyboard accessible and responsive, independently testable, local-first with no backend, and no new third-party service.
