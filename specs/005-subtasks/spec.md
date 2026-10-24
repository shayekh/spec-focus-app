# Feature Specification: Subtasks (v5)

**Feature Branch**: `005-subtasks`

**Created**: 2026-10-25

**Status**: Implemented

**Extends**: [001-task-management](../001-task-management/spec.md), [002-task-form-modal](../002-task-form-modal/spec.md), [004-recurring-tasks](../004-recurring-tasks/spec.md)

**Input**: User description: "A task can contain multiple subtasks. Users can create, edit, reorder, complete, and delete subtasks. The parent task shows completion progress. The parent task does not automatically complete when all subtasks are complete, but the user is prompted to complete the parent. Completing a parent task completes all its incomplete subtasks. Subtasks inherit the parent task's tags, but can have their own due date and priority."

## Terms

- **Parent task**: an ordinary task (as in earlier versions) that holds subtasks.
- **Subtask**: a smaller step inside one parent task. It has a title, a priority, an optional due date, and is either complete or not complete. It lives and dies with its parent.
- **Progress**: how many of a parent's subtasks are complete, for example "2 of 5 subtasks complete".

## Clarifications

### Session 2026-10-25

- Q: Where are subtasks managed? → A: In a "Subtasks" dialog opened from the parent task in the list. Every change in it takes effect immediately; there is no separate save step. The task form is unchanged.
- Q: Do subtasks have their own tags? → A: No. A subtask always shows its parent's current tags. Change the parent's tags and every subtask follows, because the subtask never stores tags.
- Q: What does a subtask's status look like? → A: Only complete or not complete. There is no "in progress" for a subtask.
- Q: When exactly is the user prompted to complete the parent? → A: When completing a subtask makes every subtask of an open parent complete. The prompt asks "Complete <task> too?" and the parent is untouched unless the user agrees. If the user declines, the parent stays as it is and the prompt does not return until the subtasks change again.
- Q: What happens to subtasks when a repeating task is completed? → A: Completing the parent completes its subtasks as usual. The next occurrence gets a copy of the same subtasks, all not complete, so a recurring checklist starts fresh each time.
- Q: Do subtasks appear on the calendar or in search? → A: No. The calendar and the search box work on parent tasks only. The parent's progress is visible wherever the parent is shown in the list.
- Q: Can a completed parent get new subtasks? → A: Yes, and the new subtask starts not complete. The parent does not reopen on its own.
- Q: How many subtasks can a task have? → A: Up to 50, to keep the list readable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Break a task into subtasks (Priority: P1)

A user opens a task's subtasks, adds several subtasks by typing a title, and sees them listed under the task in the order they were added. The task shows how many subtasks it has.

**Why this priority**: Nothing else in this feature works until a task can hold subtasks.

**Independent Test**: Open the subtasks of a task, add three, close the dialog, reload the page, and confirm the list still shows the task with "0 of 3 subtasks complete" and reopening shows the three subtasks in order.

**Acceptance Scenarios**:

1. **Given** a task in the list, **When** the user chooses its Subtasks button, **Then** a dialog titled with the task opens, listing its subtasks (or saying there are none) with a field to add one.
2. **Given** the dialog is open, **When** the user types a title and presses Enter or chooses Add, **Then** the subtask appears at the end of the list, not complete, and the field is cleared and keeps focus so several can be added in a row.
3. **Given** a blank title, **When** the user tries to add it, **Then** nothing is added and the dialog explains that a title is needed.
4. **Given** a subtask is added, **When** the user closes the dialog, **Then** the parent in the list shows its progress.
5. **Given** a task already has 50 subtasks, **When** the user tries to add one more, **Then** the dialog explains that 50 is the limit and adds nothing.
6. **Given** the browser is closed and reopened, **When** the app loads, **Then** every subtask, its order, and its completion are as the user left them.

---

### User Story 2 - Complete subtasks and see progress (Priority: P1)

A user ticks subtasks off as they are done. The parent shows how far along it is. When the last subtask is ticked, the app offers to complete the parent but does not do it on its own.

**Why this priority**: Progress and the nudge to finish are the reason to have subtasks.

**Independent Test**: Give a task three subtasks, complete them one at a time, and confirm the progress reads 1, 2, then 3 of 3, that the parent stays open, and that a prompt after the third offers to complete it.

**Acceptance Scenarios**:

1. **Given** a task with subtasks, **When** the list shows it, **Then** it shows text such as "2 of 5 subtasks complete" and a bar that fills in proportion, and the text is what assistive technology reads (not the bar alone).
2. **Given** a subtask is not complete, **When** the user ticks it, **Then** it shows as complete and the progress updates at once.
3. **Given** a subtask is complete, **When** the user unticks it, **Then** it is not complete again and the progress updates.
4. **Given** all but one subtask is complete on an open parent, **When** the user completes the last one, **Then** the parent is NOT completed, and a prompt asks "Complete <task> too?" with a button to complete it and a button to leave it open.
5. **Given** the prompt, **When** the user chooses to complete the parent, **Then** the parent is completed in the same way as using its Complete button (including creating the next occurrence if it repeats).
6. **Given** the prompt, **When** the user leaves the parent open, **Then** the parent keeps its status, and the prompt does not appear again until the subtasks change.
7. **Given** the parent is already completed, **When** the last subtask is completed, **Then** no prompt appears.
8. **Given** a parent with no subtasks, **When** the list shows it, **Then** it shows no progress.
9. **Given** progress changes, **When** a screen reader user is using the dialog, **Then** the new progress is announced.

---

### User Story 3 - Completing the parent completes its subtasks (Priority: P1)

A user completes a parent task by any route. Every subtask that was not complete becomes complete, so a finished task never shows unfinished steps.

**Why this priority**: Without it, a completed task could show "1 of 4 subtasks complete", which contradicts itself.

**Independent Test**: Give a task four subtasks, complete one, then complete the parent with its Complete button, and confirm all four subtasks are complete and the progress reads 4 of 4.

**Acceptance Scenarios**:

1. **Given** a parent with some incomplete subtasks, **When** the user completes it with the Complete button, **Then** the parent and all its subtasks are complete.
2. **Given** a parent with some incomplete subtasks, **When** the user sets its status to completed in the task form and saves, **Then** all its subtasks are complete.
3. **Given** a completed parent, **When** the user sets its status back to "todo" or "in-progress", **Then** its subtasks keep their state (they stay complete).
4. **Given** a repeating parent with subtasks, **When** the user completes it, **Then** its subtasks are completed, and the new next occurrence has the same subtasks, none complete.
5. **Given** a parent that is deleted, **When** the user confirms, **Then** its subtasks are deleted with it, and the confirmation says how many subtasks go too.

---

### User Story 4 - Edit, reorder, and delete subtasks; own priority and due date (Priority: P2)

A user renames a subtask, gives it a priority and an optional due date, puts the subtasks in the order they should be done, and deletes ones that are no longer needed.

**Why this priority**: Useful once there are subtasks, but the feature is already valuable without it.

**Independent Test**: With three subtasks, edit the second one's title, priority, and due date, move the third to the top, delete the first, and confirm the order, the details, and the progress are right and survive a reload.

**Acceptance Scenarios**:

1. **Given** a subtask, **When** the user chooses Edit, **Then** the row becomes fields for title, priority (low, medium, high), and an optional due date, with Save and Cancel.
2. **Given** the edit fields, **When** the title is blank and the user saves, **Then** the row explains that a title is needed and keeps the fields open.
3. **Given** the edit fields, **When** the user saves valid values, **Then** the row shows the new title, the priority, and the due date, and the change is kept.
4. **Given** the edit fields, **When** the user cancels or presses Escape, **Then** the row returns to its previous values without closing the dialog.
5. **Given** a subtask that is not the first, **When** the user chooses "Move up" for it, **Then** it swaps places with the one above it, and "Move down" does the same toward the end; the first has no Move up and the last has no Move down.
6. **Given** a subtask is moved, **When** it moves, **Then** focus stays on a move control of the same subtask, and the new position is announced, for example "Write tests moved to position 1 of 4".
7. **Given** a subtask, **When** the user chooses Delete, **Then** it is removed at once and the progress updates; nothing else is affected.
8. **Given** a subtask with a due date before today that is not complete and whose parent is not completed, **When** the dialog shows it, **Then** it is marked overdue in words as well as color.
9. **Given** a subtask, **When** it is shown, **Then** it shows its parent's tags (read-only), and after the parent's tags are changed, the subtask shows the new tags.

---

### Edge Cases

- **Last subtask deleted**: the parent shows no progress, and no prompt appears. Deleting a subtask never prompts.
- **Deleting an incomplete subtask leaves the rest all complete**: this is not a completion, so no prompt appears; the prompt follows only from completing a subtask.
- **Completing a subtask in two tabs**: whichever tab saves last wins; the parent is never completed by a subtask change alone.
- **The parent disappears while its dialog is open** (for example deleted in another tab): the dialog closes.
- **Very long titles**: wrap inside the row without moving controls out of reach, including at 375px wide.
- **Imported data**: files exported before this version import fine and have no subtasks. Files with subtasks restore them in order. A task whose subtask list cannot be understood is kept without subtasks rather than breaking the app or rejecting the file.
- **Duplicate subtask titles**: allowed; each has its own identity.
- **Filters**: the list's filters and sort work on parent tasks; a parent with subtasks is filtered by its own status, priority, due date, and tags.
- **Recurring parent stopped or its series ended**: its subtasks stay with the task.
- **A parent without a due date**: subtasks can still have due dates.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A task MUST be able to hold subtasks (up to 50), each with a title, a priority, an optional due date, and a complete or not-complete state, kept in a user-chosen order.
- **FR-002**: The user MUST be able to open a task's subtasks from the list and add a subtask by typing a title; a blank title MUST NOT be added and the user MUST be told why. A new subtask MUST start not complete, with medium priority and no due date. Adding beyond 50 MUST be refused with an explanation.
- **FR-003**: The user MUST be able to edit a subtask's title, priority, and due date, with the same title rule as tasks, and to cancel an edit without changing anything.
- **FR-004**: The user MUST be able to mark a subtask complete and not complete again.
- **FR-005**: The user MUST be able to delete a subtask, and to reorder subtasks with Move up and Move down controls that work from the keyboard, announce the new position, and are absent where a move is impossible.
- **FR-006**: A parent with at least one subtask MUST show its progress ("N of M subtasks complete") and a proportional bar in the list; the text, not the bar alone, MUST carry the meaning. A parent with none MUST show no progress.
- **FR-007**: The parent MUST NOT be completed by subtask changes. When completing a subtask makes every subtask of an open parent complete, the app MUST prompt the user to complete the parent, and MUST leave it unchanged unless the user agrees. Declining MUST not prompt again until the subtasks change.
- **FR-008**: When a parent is completed by any route (the Complete button, the task form status, or agreeing to the prompt), the app MUST complete all of its incomplete subtasks in the same step. Reopening a parent MUST NOT change its subtasks.
- **FR-009**: A subtask MUST show its parent's current tags and MUST NOT store tags of its own.
- **FR-010**: Deleting a parent MUST delete its subtasks, and the confirmation MUST state how many subtasks will be deleted when there are any.
- **FR-011**: Completing a repeating parent MUST give its next occurrence a copy of the subtasks, with new identities, none complete.
- **FR-012**: Subtasks and their order MUST persist across reloads, be included in export, and be restored by import. Files exported before this version MUST still import. Subtask data that cannot be understood MUST be dropped (the task is kept) instead of causing an error.
- **FR-013**: The calendar and the search box MUST continue to work on parent tasks only, unchanged by subtasks.
- **FR-014**: A not-complete subtask whose due date is before today, under a parent that is not completed, MUST be marked overdue in text as well as color.
- **FR-015**: Everything in this feature (opening the dialog, adding, editing, completing, reordering, deleting, and answering the prompt) MUST be operable by keyboard, with visible focus, announced to assistive technology where state changes, usable at 375px wide, and meet the app's contrast standards in both themes.

### Key Entities

- **Subtask**: a step inside one parent task: a unique identity, a title, a priority, an optional due date, and complete or not complete. It has no tags (it shows the parent's). Its position in the parent's list is its order.
- **Parent task**: a task (title, description, priority, status, due date, tags, optional repeat) that also holds an ordered list of zero to 50 subtasks.
- **Progress**: the number of complete subtasks out of the total, derived from the list and never stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can add a subtask to a task in no more than 3 actions after the list is showing (open the subtasks, type a title, press Enter).
- **SC-002**: After any sequence of adding, completing, reordering, editing, and deleting subtasks, the progress shown equals the actual count of complete subtasks out of the total in 100% of cases.
- **SC-003**: A subtask change alone never completes a parent: in 100% of cases the parent's status changes only when the user completes it or agrees to the prompt.
- **SC-004**: After a parent is completed by any route, 0 of its subtasks are left not complete.
- **SC-005**: A parent with subtasks, exported and imported into an empty app, has identical subtasks (all fields and order) in 100% of fields.
- **SC-006**: With 500 tasks, 100 of which have 10 subtasks, the list renders and filtering updates in under 1 second.
- **SC-007**: Adding, editing, completing, reordering, deleting, and answering the prompt can each be done using only the keyboard.
- **SC-008**: The subtasks dialog fits a 375px-wide window without sideways page scrolling, with long titles.

## Assumptions

- Subtasks are one level deep: a subtask cannot have subtasks.
- Subtask priority and due date are informational; they do not change the parent's priority, due date, sorting, filtering, or the calendar.
- Reordering uses Move up and Move down buttons; dragging subtasks is out of scope.
- A subtask has no description and no time of day.
- Editing the parent's task form does not edit its subtasks.
- A repeating series copies the subtasks as they are at the moment the parent is completed, so a subtask added to one occurrence repeats in the next ones.
- The constitution applies: keyboard accessible and responsive, independently testable, local-first with no backend, and no new third-party service.
