# Contract: Stored and Exported Data (v5)

Extends [001 export-file.md](../../001-task-management/contracts/export-file.md) and
[004 data-contract.md](../../004-recurring-tasks/contracts/data-contract.md). The stored document
(`focus-app:tasks`) and the export file keep `version: 1`; the change only adds one optional task
field.

## Task field added

```json
{
  "id": "uuid",
  "title": "Plan the launch",
  "tags": ["work"],
  "subtasks": [
    { "id": "uuid", "title": "Write the announcement", "priority": "high", "dueDate": "2026-10-20", "done": false },
    { "id": "uuid", "title": "Book the room", "priority": "medium", "dueDate": null, "done": true }
  ]
}
```

| Field | Rules |
|-------|-------|
| `subtasks` | Optional. When present: an array of 1 to 50 objects with unique non-empty string `id`s, a `title` with at least one non-space character, a `priority` of `low`, `medium`, or `high`, a `dueDate` that is `null` or a real `YYYY-MM-DD` date, and a boolean `done`. The array order is the display order |

A subtask has no `tags` field. The export contains the order exactly as shown to the user.

## Compatibility

- Files and stored documents without `subtasks` import and load unchanged.
- A task whose `subtasks` is present but unreadable (not an array, empty, more than 50, duplicate ids, or any invalid entry) is imported or loaded as the same task without subtasks. This never rejects the file or the document.
- Round trip: exporting then importing into an empty app reproduces every subtask field and the order exactly (SC-005).
