import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "../../src/ui/FilterBar";
import { DEFAULT_QUERY, reconcileQuery, type Query } from "../../src/domain/query";
import { TaskList } from "../../src/ui/TaskList";
import type { Task } from "../../src/domain/task";

function renderBar(overrides: Partial<Query> = {}, shown = 3, total = 5) {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const query = { ...DEFAULT_QUERY, ...overrides };
  render(
    <FilterBar
      query={query}
      tags={["home", "work"]}
      shown={shown}
      total={total}
      onChange={onChange}
      onClear={onClear}
    />,
  );
  return { onChange, onClear, query };
}

describe("FilterBar", () => {
  it("updates the status filter", async () => {
    const { onChange, query } = renderBar();
    await userEvent.selectOptions(screen.getByLabelText("Status"), "in-progress");
    expect(onChange).toHaveBeenCalledWith({ ...query, status: "in-progress" });
  });

  it("updates the priority filter", async () => {
    const { onChange, query } = renderBar();
    await userEvent.selectOptions(screen.getByLabelText("Priority"), "high");
    expect(onChange).toHaveBeenCalledWith({ ...query, priority: "high" });
  });

  it("offers the derived tags and updates the tag filter", async () => {
    const { onChange, query } = renderBar();
    expect(screen.getByRole("option", { name: "work" })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Tag"), "work");
    expect(onChange).toHaveBeenCalledWith({ ...query, tag: "work" });
  });

  it("updates the search text as the user types", async () => {
    const { onChange } = renderBar();
    await userEvent.type(screen.getByLabelText("Search"), "m");
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_QUERY, search: "m" });
  });

  it("updates the sort order", async () => {
    const { onChange, query } = renderBar();
    await userEvent.selectOptions(screen.getByLabelText("Sort by"), "dueDate");
    expect(onChange).toHaveBeenCalledWith({ ...query, sort: "dueDate" });
  });

  it("announces how many tasks are shown", () => {
    renderBar({}, 3, 5);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 3 of 5 tasks");
  });

  it("calls onClear from the Clear filters button", async () => {
    const { onClear } = renderBar({ status: "todo" });
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe("no-match state", () => {
  const noop = () => {};

  it("shows a message and a working Clear filters button", async () => {
    const onClearFilters = vi.fn();
    render(
      <TaskList
        tasks={[]}
        hasTasks
        today="2026-10-25"
        onEdit={noop}
        onComplete={noop}
        onDelete={noop}
        onSubtasks={noop}
        onClearFilters={onClearFilters}
        onCreate={noop}
      />,
    );
    expect(screen.getByText(/no tasks match/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});

describe("stale tag filter", () => {
  const base: Task = {
    id: "1",
    title: "Only tagged",
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: null,
    tags: ["work"],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };

  it("resets the tag filter to all when the last task with that tag is edited", async () => {
    function Harness() {
      const [tasks, setTasks] = useState<Task[]>([base]);
      const [query, setQuery] = useState<Query>({ ...DEFAULT_QUERY, tag: "work" });
      const effective = reconcileQuery(query, tasks);
      return (
        <>
          <FilterBar
            query={effective}
            tags={Array.from(new Set(tasks.flatMap((t) => t.tags)))}
            shown={tasks.length}
            total={tasks.length}
            onChange={setQuery}
            onClear={() => setQuery(DEFAULT_QUERY)}
          />
          <button type="button" onClick={() => setTasks([{ ...base, tags: [] }])}>
            Remove tag
          </button>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByLabelText("Tag")).toHaveValue("work");
    await userEvent.click(screen.getByRole("button", { name: "Remove tag" }));
    expect(screen.getByLabelText("Tag")).toHaveValue("all");
  });
});
