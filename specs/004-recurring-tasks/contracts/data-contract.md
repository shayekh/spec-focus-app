# Contract: Stored and Exported Data (v4)

Extends [001 export-file.md](../../001-task-management/contracts/export-file.md). The stored
document (`focus-app:tasks`) and the export file keep `version: 1`; the change only adds two
optional task fields.

## Task fields added

```json
{
  "id": "uuid",
  "title": "Water the plants",
  "dueDate": "2026-10-15",
  "recurrence": {
    "kind": "weekly",
    "weekdays": [3],
    "dayOfMonth": null,
    "endDate": "2026-12-31"
  },
  "seriesId": "uuid"
}
```

| Field | Rules |
|-------|-------|
| `recurrence` | Optional. When present: `kind` is `daily`, `weekly`, `monthly`, or `days`; `weekdays` is an array of distinct integers 0 to 6 (Monday is 0): empty for `daily` and `monthly`, exactly one for `weekly`, at least one for `days`; `dayOfMonth` is an integer 1 to 31 for `monthly` and `null` otherwise; `endDate` is `null` or a real `YYYY-MM-DD` date |
| `seriesId` | Optional string. Present exactly when `recurrence` is present |
| `seriesTemplate` | Optional object `{ title, description, priority, tags }` with the same rules as the task fields of those names. Present exactly when `recurrence` is present; if it is missing or unreadable the task's own details are used |
| both | A task with a `recurrence` must have a `dueDate` |

> Tasks may also carry `subtasks` ([005 data contract](../../005-subtasks/contracts/data-contract.md)); they are copied, not done, to the next occurrence.

## Compatibility

- **Older files and stored data** (neither field): valid and unchanged.
- **Unreadable recurrence data** (a rule that is not valid, a `seriesId` without a rule or the reverse, a rule without a due date): on load and on import, the two fields are dropped from that task and the rest of the task is kept. The user sees an ordinary one-time task. The document or file is not rejected for this.
- **Everything else** about the task is validated exactly as before, and an invalid task still rejects the whole file.
- **Newer files opened by an older app**: the older app ignores the two extra fields and shows ordinary tasks.

## Round trip

Exporting and importing into an empty app reproduces every task field, including `recurrence` and
`seriesId`, exactly (SC-007).
