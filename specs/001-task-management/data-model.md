# Data Model: Focus App Task Management

## Task

| Field | Type | Rules |
|-------|------|-------|
| `id` | string (UUID) | Generated on create; immutable; unique |
| `title` | string | Required; trimmed; must be non-empty after trim (FR-003) |
| `description` | string | Optional; default empty string |
| `priority` | `"low" \| "medium" \| "high"` | Default `"medium"` (FR-002) |
| `status` | `"todo" \| "in-progress" \| "completed"` | Default `"todo"` (FR-002) |
| `dueDate` | string \| null | Optional; `YYYY-MM-DD` calendar date or `null` |
| `tags` | string[] | Each tag trimmed, non-empty; de-duplicated ignoring case; first spelling kept |
| `createdAt` | string | ISO 8601 timestamp; set on create |
| `updatedAt` | string | ISO 8601 timestamp; set on every change |

### Derived

- **Overdue**: `dueDate` is set, is earlier than today's local date, and `status !== "completed"` (FR-008).

### State transitions

Any status may move to any other status (todo, in-progress, completed). "Mark complete" is a one-step
shortcut to `completed`. Moving away from `completed` clears the completed appearance (no extra field).

## Tag

Not stored as its own record. The set of tags offered for filtering is derived from all tasks' tags
(case-insensitive, sorted alphabetically). A tag disappears from the filter options when no task uses it.

## Preferences

| Field | Type | Rules |
|-------|------|-------|
| `theme` | `"light" \| "dark" \| null` | `null` means follow system preference (FR-014) |

## Stored document (browser storage)

```json
{
  "version": 1,
  "tasks": [ /* Task objects */ ]
}
```

- Key `focus-app:tasks` holds the document; key `focus-app:theme` holds the theme string.
- Missing, unparseable, or wrong-version data yields an empty task list plus a notice; the app never crashes (FR-017).

## Query (UI state, not persisted)

| Field | Type |
|-------|------|
| `status` | task status \| `"all"` |
| `priority` | task priority \| `"all"` |
| `tag` | string \| `"all"` |
| `search` | string |
| `sort` | `"created" \| "dueDate" \| "priority"` |

Filters combine with AND; `search` matches title or description, case-insensitively (FR-009, FR-010).

## Sort rules (FR-020)

- `created`: newest first (default).
- `dueDate`: earliest first; tasks without a due date last.
- `priority`: high, medium, low; ties broken by newest first.
