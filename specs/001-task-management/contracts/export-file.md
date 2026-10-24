# Contract: Export / Import File

Used by FR-018 and FR-019. The file is JSON, named `focus-app-tasks-YYYY-MM-DD.json` on export.

## Format

```json
{
  "app": "focus-app",
  "version": 1,
  "exportedAt": "2026-10-25T10:00:00.000Z",
  "tasks": [
    {
      "id": "uuid",
      "title": "string (required, non-empty)",
      "description": "string",
      "priority": "low | medium | high",
      "status": "todo | in-progress | completed",
      "dueDate": "YYYY-MM-DD or null",
      "tags": ["string"],
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    }
  ]
}
```

> **Added by [004-recurring-tasks](../../004-recurring-tasks/contracts/data-contract.md):** each task may also carry the optional fields `recurrence`, `seriesId` and `seriesTemplate`. Files without them stay valid, and unreadable repeat settings are dropped on import so the task is kept as an ordinary task.

> **Added by [005-subtasks](../../005-subtasks/contracts/data-contract.md):** each task may also carry an optional ordered `subtasks` array. Files without it stay valid, and an unreadable `subtasks` value is dropped on import so the task is kept without subtasks.

## Import rules

1. File MUST be valid JSON with `app === "focus-app"` and a supported `version`.
2. Every task MUST satisfy the field rules in [data-model.md](../data-model.md); ids MUST be unique within the file.
3. If any check fails, the import is rejected as a whole with a clear message and existing tasks are unchanged.
4. If valid and tasks already exist, the user MUST confirm a warning before all current tasks are replaced.
5. Round trip: exporting then importing into an empty app MUST reproduce every field exactly (SC-007).
