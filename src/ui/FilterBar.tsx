import {
  PRIORITIES,
  STATUSES,
  isPriority,
  isStatus,
} from "../domain/task";
import { DEFAULT_QUERY, type Query, type SortKey } from "../domain/query";

interface FilterBarProps {
  query: Query;
  tags: string[];
  shown: number;
  total: number;
  onChange: (query: Query) => void;
  onClear: () => void;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "created", label: "Newest first" },
  { value: "dueDate", label: "Due date" },
  { value: "priority", label: "Priority" },
];

function isSortKey(value: string): value is SortKey {
  return SORT_OPTIONS.some((o) => o.value === value);
}

function isDefault(query: Query): boolean {
  return (
    query.status === DEFAULT_QUERY.status &&
    query.priority === DEFAULT_QUERY.priority &&
    query.tag === DEFAULT_QUERY.tag &&
    query.search === DEFAULT_QUERY.search
  );
}

export function FilterBar({ query, tags, shown, total, onChange, onClear }: FilterBarProps) {
  return (
    <section className="filter-bar" aria-label="Filter and search tasks">
      <label className="field">
        Search
        <input
          type="search"
          value={query.search}
          placeholder="Title or description"
          onChange={(e) => onChange({ ...query, search: e.target.value })}
        />
      </label>
      <label className="field">
        Status
        <select
          value={query.status}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "all" || isStatus(v)) onChange({ ...query, status: v });
          }}
        >
          <option value="all">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Priority
        <select
          value={query.priority}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "all" || isPriority(v)) onChange({ ...query, priority: v });
          }}
        >
          <option value="all">All</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Tag
        <select value={query.tag} onChange={(e) => onChange({ ...query, tag: e.target.value })}>
          <option value="all">All</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Sort by
        <select
          value={query.sort}
          onChange={(e) => {
            const v = e.target.value;
            if (isSortKey(v)) onChange({ ...query, sort: v });
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={onClear} disabled={isDefault(query)}>
        Clear filters
      </button>
      <p role="status" className="visually-hidden">
        Showing {shown} of {total} tasks
      </p>
    </section>
  );
}
