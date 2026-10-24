import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskForm } from "../../src/ui/TaskForm";

describe("TaskForm", () => {
  it("shows an inline error linked to the title and does not submit when the title is empty", async () => {
    const onSave = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    const title = screen.getByLabelText(/title/i);
    const error = screen.getByText(/title is required/i);
    expect(onSave).not.toHaveBeenCalled();
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title.getAttribute("aria-describedby")).toBe(error.id);
  });

  it("submits the entered values", async () => {
    const onSave = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={() => {}} />);

    await userEvent.type(screen.getByLabelText(/title/i), "Write spec");
    await userEvent.type(screen.getByLabelText(/description/i), "Draft v1");
    await userEvent.selectOptions(screen.getByLabelText(/priority/i), "high");
    await userEvent.selectOptions(screen.getByLabelText(/status/i), "in-progress");
    await userEvent.type(screen.getByLabelText(/due date/i), "2026-12-01");
    await userEvent.type(screen.getByLabelText(/tags/i), "work, writing");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith(
      {
        title: "Write spec",
        description: "Draft v1",
        priority: "high",
        status: "in-progress",
        dueDate: "2026-12-01",
        tags: ["work", "writing"],
        recurrence: null,
      },
      "occurrence",
    );
  });

  it("defaults to medium priority and todo status", () => {
    render(<TaskForm onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByLabelText(/priority/i)).toHaveValue("medium");
    expect(screen.getByLabelText(/status/i)).toHaveValue("todo");
  });

  it("closes on Escape and on Cancel without saving", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={onCancel} />);

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("TaskForm in a modal (v2: add)", () => {
  it("is a dialog titled New task, with defaults, and focus on the title", () => {
    render(<TaskForm onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole("dialog", { name: "New task" })).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toHaveValue("medium");
    expect(screen.getByLabelText(/status/i)).toHaveValue("todo");
    expect(screen.getByLabelText(/title/i)).toHaveFocus();
  });

  it("puts focus back on the title after a failed save", async () => {
    render(<TaskForm onSave={() => {}} onCancel={() => {}} />);
    await userEvent.tab();
    expect(screen.getByLabelText(/description/i)).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByLabelText(/title/i)).toHaveFocus();
    expect(screen.getByText("Title is required.")).toBeInTheDocument();
  });

  it("clears the title error once the user starts typing", async () => {
    render(<TaskForm onSave={() => {}} onCancel={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByText("Title is required.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/title/i), "x");
    expect(screen.queryByText("Title is required.")).not.toBeInTheDocument();
  });

  it("saves once when it is submitted twice before closing", async () => {
    const onSave = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText(/title/i), "Once only");
    const form = screen.getByRole("dialog").querySelector("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("allows saving again when the parent rejects the first attempt", async () => {
    const onSave = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
    render(<TaskForm onSave={onSave} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText(/title/i), "Retry me");
    const form = screen.getByRole("dialog").querySelector("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onSave).toHaveBeenCalledTimes(2);
  });
});

describe("TaskForm closing and unsaved changes (v2)", () => {
  const closeRoutes: [string, () => Promise<void>][] = [
    [
      "Cancel",
      async () => {
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
      },
    ],
    [
      "Close",
      async () => {
        await userEvent.click(screen.getByRole("button", { name: "Close" }));
      },
    ],
    [
      "Escape",
      async () => {
        await userEvent.keyboard("{Escape}");
      },
    ],
  ];

  it("has a Close button alongside Cancel and Save", () => {
    render(<TaskForm onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it.each(closeRoutes)("%s closes a clean form at once, with no confirmation", async (_name, close) => {
    const onCancel = vi.fn();
    render(<TaskForm onSave={() => {}} onCancel={onCancel} />);
    await close();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "Discard changes?" })).not.toBeInTheDocument();
  });

  it.each(closeRoutes)("%s asks before discarding unsaved changes", async (_name, close) => {
    const onCancel = vi.fn();
    render(<TaskForm onSave={() => {}} onCancel={onCancel} />);
    await userEvent.type(screen.getByLabelText(/title/i), "Half-written");
    await close();
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Discard changes?" })).toBeInTheDocument();
  });

  it("Keep editing closes only the confirmation and keeps the typed values and focus", async () => {
    const onCancel = vi.fn();
    render(<TaskForm onSave={() => {}} onCancel={onCancel} />);
    const title = screen.getByLabelText(/title/i);
    await userEvent.type(title, "Half-written");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(screen.queryByRole("dialog", { name: "Discard changes?" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "New task" })).toBeInTheDocument();
    expect(title).toHaveValue("Half-written");
    expect(title).toHaveFocus();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("Escape inside the confirmation closes only the confirmation", async () => {
    const onCancel = vi.fn();
    render(<TaskForm onSave={() => {}} onCancel={onCancel} />);
    await userEvent.type(screen.getByLabelText(/title/i), "x");
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "Discard changes?" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Discard changes?" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "New task" })).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("Discard closes the form", async () => {
    const onCancel = vi.fn();
    render(<TaskForm onSave={() => {}} onCancel={onCancel} />);
    await userEvent.type(screen.getByLabelText(/title/i), "Throw away");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("treats a change that was reverted as no change", async () => {
    const onCancel = vi.fn();
    render(<TaskForm onSave={() => {}} onCancel={onCancel} />);
    await userEvent.type(screen.getByLabelText(/title/i), "x");
    await userEvent.keyboard("{Backspace}");
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "Discard changes?" })).not.toBeInTheDocument();
  });

  it("compares against the task being edited, not against empty values", async () => {
    const onCancel = vi.fn();
    const task = {
      id: "1",
      title: "Existing",
      description: "",
      priority: "medium" as const,
      status: "todo" as const,
      dueDate: null,
      tags: ["a"],
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };
    render(<TaskForm initial={task} onSave={() => {}} onCancel={onCancel} />);
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);

    await userEvent.selectOptions(screen.getByLabelText(/priority/i), "high");
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "Discard changes?" })).toBeInTheDocument();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not close when the dimmed area is clicked, even with changes", async () => {
    const onCancel = vi.fn();
    render(<TaskForm onSave={() => {}} onCancel={onCancel} />);
    await userEvent.type(screen.getByLabelText(/title/i), "x");
    const backdrop = screen.getByRole("dialog", { name: "New task" }).parentElement;
    if (!backdrop) throw new Error("backdrop not found");
    await userEvent.click(backdrop);
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Discard changes?" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "New task" })).toBeInTheDocument();
  });

  it("makes the form unavailable while the confirmation is open", async () => {
    render(<TaskForm onSave={() => {}} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText(/title/i), "x");
    const formDialog = screen.getByRole("dialog", { name: "New task" });
    await userEvent.keyboard("{Escape}");
    expect(formDialog.parentElement?.parentElement).toHaveAttribute("inert");
  });
});

describe("TaskForm repeat settings (v4)", () => {
  const dueDate = () => screen.getByLabelText("Due date");
  const repeatSelect = () => screen.getByRole("combobox", { name: "Repeat" });

  async function fillTitleAndDue(title = "Water plants", due = "2026-10-15") {
    await userEvent.type(screen.getByLabelText(/^title/i), title);
    if (due) await userEvent.type(dueDate(), due);
  }

  it("has Repeat settings below the due date, starting at Does not repeat", () => {
    render(<TaskForm onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole("group", { name: "Repeat settings" })).toBeInTheDocument();
    expect(repeatSelect()).toHaveValue("none");
  });

  it("saves a weekly rule built from the due date's weekday", async () => {
    const onSave = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={() => {}} />);
    await fillTitleAndDue();
    await userEvent.selectOptions(repeatSelect(), "weekly");
    expect(screen.getByText("Repeats every week on Thursday.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const [input, scope] = onSave.mock.calls[0] ?? [];
    expect(input.recurrence).toEqual({ kind: "weekly", weekdays: [3], dayOfMonth: null, endDate: null });
    expect(scope).toBe("occurrence");
  });

  it("saves selected days and an end date", async () => {
    const onSave = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={() => {}} />);
    await fillTitleAndDue();
    await userEvent.selectOptions(repeatSelect(), "days");
    await userEvent.click(screen.getByRole("checkbox", { name: "Friday" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Monday" }));
    await userEvent.type(screen.getByLabelText("Repeat until (optional)"), "2026-12-31");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave.mock.calls[0]?.[0].recurrence).toEqual({
      kind: "days",
      weekdays: [0, 4],
      dayOfMonth: null,
      endDate: "2026-12-31",
    });
  });

  it("saves a monthly rule from the due date's day of the month", async () => {
    const onSave = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={() => {}} />);
    await fillTitleAndDue("Pay rent", "2026-01-31");
    await userEvent.selectOptions(repeatSelect(), "monthly");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave.mock.calls[0]?.[0].recurrence).toMatchObject({ kind: "monthly", dayOfMonth: 31 });
  });

  it("refuses a repeat with no due date, explains under the due date, and focuses it", async () => {
    const onSave = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={() => {}} />);
    await fillTitleAndDue("Water plants", "");
    await userEvent.selectOptions(repeatSelect(), "daily");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    const message = screen.getByText("Choose a due date to start the repeat from.");
    expect(dueDate()).toHaveAttribute("aria-describedby", message.id);
    expect(dueDate()).toHaveAttribute("aria-invalid", "true");
    expect(dueDate()).toHaveFocus();
  });

  it("clears the due date message once a due date is chosen", async () => {
    render(<TaskForm onSave={() => {}} onCancel={() => {}} />);
    await fillTitleAndDue("Water plants", "");
    await userEvent.selectOptions(repeatSelect(), "daily");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Choose a due date to start the repeat from.")).toBeInTheDocument();
    await userEvent.type(dueDate(), "2026-10-15");
    expect(screen.queryByText("Choose a due date to start the repeat from.")).not.toBeInTheDocument();
  });

  it("refuses selected days with none ticked and focuses the first day", async () => {
    const onSave = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={() => {}} />);
    await fillTitleAndDue();
    await userEvent.selectOptions(repeatSelect(), "days");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Choose at least one day.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Monday" })).toHaveFocus();
  });

  it("refuses an end date before the due date and focuses the end date", async () => {
    const onSave = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={() => {}} />);
    await fillTitleAndDue();
    await userEvent.selectOptions(repeatSelect(), "daily");
    await userEvent.type(screen.getByLabelText("Repeat until (optional)"), "2026-10-01");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("End date cannot be earlier than the due date.")).toBeInTheDocument();
    expect(screen.getByLabelText("Repeat until (optional)")).toHaveFocus();
  });

  it("does not complain about repeat details once the task is set back to not repeat", async () => {
    const onSave = vi.fn();
    render(<TaskForm onSave={onSave} onCancel={() => {}} />);
    await fillTitleAndDue("Water plants", "");
    await userEvent.selectOptions(repeatSelect(), "days");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await userEvent.selectOptions(repeatSelect(), "none");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]?.[0].recurrence).toBeNull();
  });

  describe("editing a recurring task", () => {
    const rule = { kind: "weekly", weekdays: [3], dayOfMonth: null, endDate: "2027-03-01" } as const;
    const recurring = {
      id: "t1",
      title: "Water plants",
      description: "",
      priority: "medium" as const,
      status: "todo" as const,
      dueDate: "2026-10-15",
      tags: [],
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
      recurrence: { ...rule, weekdays: [3] },
      seriesId: "s1",
    };

    it("shows the task's rule and end date", () => {
      render(<TaskForm initial={recurring} onSave={() => {}} onCancel={() => {}} />);
      expect(repeatSelect()).toHaveValue("weekly");
      expect(screen.getByLabelText("Repeat until (optional)")).toHaveValue("2027-03-01");
    });

    it("keeps the rule's anchor when only the due date moves, and passes the rule through", async () => {
      const onSave = vi.fn();
      render(<TaskForm initial={recurring} onSave={onSave} onCancel={() => {}} />);
      await userEvent.clear(dueDate());
      await userEvent.type(dueDate(), "2026-10-20");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(onSave.mock.calls[0]?.[0].recurrence).toEqual({ ...rule, weekdays: [3] });
      expect(onSave.mock.calls[0]?.[0].dueDate).toBe("2026-10-20");
    });

    it("refuses to remove the due date of a recurring task", async () => {
      const onSave = vi.fn();
      render(<TaskForm initial={recurring} onSave={onSave} onCancel={() => {}} />);
      await userEvent.clear(dueDate());
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText("Choose a due date to start the repeat from.")).toBeInTheDocument();
      expect(dueDate()).toHaveFocus();
    });

    it("lets a recurring task be turned into an ordinary one", async () => {
      const onSave = vi.fn();
      render(<TaskForm initial={recurring} onSave={onSave} onCancel={() => {}} />);
      await userEvent.selectOptions(repeatSelect(), "none");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(onSave.mock.calls[0]?.[0].recurrence).toBeNull();
    });
  });

  it("counts a changed repeat as an unsaved change", async () => {
    const onCancel = vi.fn();
    render(<TaskForm onSave={() => {}} onCancel={onCancel} />);
    await userEvent.selectOptions(repeatSelect(), "daily");
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "Discard changes?" })).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe("TaskForm edit scope and stopping a series (v4)", () => {
  const recurring = {
    id: "t1",
    title: "Water plants",
    description: "",
    priority: "medium" as const,
    status: "todo" as const,
    dueDate: "2026-10-15",
    tags: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    recurrence: { kind: "weekly" as const, weekdays: [3], dayOfMonth: null, endDate: null },
    seriesId: "s1",
  };
  const plain = { ...recurring, recurrence: undefined, seriesId: undefined };

  const scopeGroup = () => screen.queryByRole("group", { name: "Apply changes to" });
  const repeatSelect = () => screen.getByRole("combobox", { name: "Repeat" });

  describe("the Apply changes to choice", () => {
    it("is not shown for an ordinary task or when creating one", () => {
      const { unmount } = render(<TaskForm initial={plain} onSave={() => {}} onCancel={() => {}} />);
      expect(scopeGroup()).not.toBeInTheDocument();
      unmount();
      render(<TaskForm onSave={() => {}} onCancel={() => {}} />);
      expect(scopeGroup()).not.toBeInTheDocument();
    });

    it("is not shown when the series has no open occurrence", () => {
      render(<TaskForm initial={recurring} seriesHasOpen={false} onSave={() => {}} onCancel={() => {}} />);
      expect(scopeGroup()).not.toBeInTheDocument();
    });

    it("is shown for a task in a live series, with this occurrence selected by default", () => {
      render(<TaskForm initial={recurring} seriesHasOpen onSave={() => {}} onCancel={() => {}} />);
      const group = scopeGroup();
      expect(group).toBeInTheDocument();
      expect(within(group as HTMLElement).getByRole("radio", { name: "This occurrence only" })).toBeChecked();
      expect(within(group as HTMLElement).getByRole("radio", { name: "Entire series" })).not.toBeChecked();
    });

    it("disables the repeat controls, with a note, until Entire series is chosen", async () => {
      render(<TaskForm initial={recurring} seriesHasOpen onSave={() => {}} onCancel={() => {}} />);
      expect(repeatSelect()).toBeDisabled();
      expect(screen.getByText("Choose Entire series to change how this task repeats.")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("radio", { name: "Entire series" }));
      expect(repeatSelect()).toBeEnabled();
      expect(screen.queryByText("Choose Entire series to change how this task repeats.")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("radio", { name: "This occurrence only" }));
      expect(repeatSelect()).toBeDisabled();
    });

    it("says beside the due date and the status that they apply to this occurrence only", () => {
      render(<TaskForm initial={recurring} seriesHasOpen onSave={() => {}} onCancel={() => {}} />);
      expect(screen.getAllByText("Applies to this occurrence only.")).toHaveLength(2);
    });

    it("has no such notes when there is no choice to make", () => {
      render(<TaskForm initial={plain} onSave={() => {}} onCancel={() => {}} />);
      expect(screen.queryByText("Applies to this occurrence only.")).not.toBeInTheDocument();
    });

    it("passes the chosen scope to onSave", async () => {
      // Returning false keeps the form open, so it can be saved a second time.
      const onSave = vi.fn((_input: unknown, _scope: string) => false);
      render(<TaskForm initial={recurring} seriesHasOpen onSave={onSave} onCancel={() => {}} />);
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(onSave.mock.calls[0]?.[1]).toBe("occurrence");

      await userEvent.click(screen.getByRole("radio", { name: "Entire series" }));
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(onSave.mock.calls[1]?.[1]).toBe("series");
    });

    it("does not count the scope choice as an unsaved change", async () => {
      const onCancel = vi.fn();
      render(<TaskForm initial={recurring} seriesHasOpen onSave={() => {}} onCancel={onCancel} />);
      await userEvent.click(screen.getByRole("radio", { name: "Entire series" }));
      await userEvent.keyboard("{Escape}");
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("can be operated with the keyboard", async () => {
      const onSave = vi.fn();
      render(<TaskForm initial={recurring} seriesHasOpen onSave={onSave} onCancel={() => {}} />);
      screen.getByRole("radio", { name: "This occurrence only" }).focus();
      await userEvent.keyboard("{ArrowDown}");
      expect(screen.getByRole("radio", { name: "Entire series" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "Entire series" })).toHaveFocus();
    });
  });

  describe("Stop repeating", () => {
    it("is offered for a recurring task only", () => {
      const { unmount } = render(<TaskForm initial={recurring} seriesHasOpen onSave={() => {}} onCancel={() => {}} />);
      expect(screen.getByRole("button", { name: "Stop repeating" })).toBeInTheDocument();
      unmount();
      render(<TaskForm initial={plain} onSave={() => {}} onCancel={() => {}} />);
      expect(screen.queryByRole("button", { name: "Stop repeating" })).not.toBeInTheDocument();
    });

    it("asks first, with Keep repeating as the default, and does nothing if kept", async () => {
      const onStopRepeating = vi.fn();
      render(
        <TaskForm initial={recurring} seriesHasOpen onSave={() => {}} onCancel={() => {}} onStopRepeating={onStopRepeating} />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Stop repeating" }));

      const confirm = screen.getByRole("dialog", { name: "Stop repeating?" });
      expect(within(confirm).getByRole("button", { name: "Keep repeating" })).toHaveFocus();
      await userEvent.click(within(confirm).getByRole("button", { name: "Keep repeating" }));

      expect(onStopRepeating).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog", { name: "Stop repeating?" })).not.toBeInTheDocument();
      expect(repeatSelect()).toHaveValue("weekly");
    });

    it("stops the series when confirmed, keeps the form open, and shows an ordinary task", async () => {
      const onStopRepeating = vi.fn();
      const onCancel = vi.fn();
      render(
        <TaskForm initial={recurring} seriesHasOpen onSave={() => {}} onCancel={onCancel} onStopRepeating={onStopRepeating} />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Stop repeating" }));
      await userEvent.click(
        within(screen.getByRole("dialog", { name: "Stop repeating?" })).getByRole("button", { name: "Stop repeating" }),
      );

      expect(onStopRepeating).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("dialog", { name: "Edit task" })).toBeInTheDocument();
      expect(repeatSelect()).toHaveValue("none");
      expect(repeatSelect()).toBeEnabled();
      expect(scopeGroup()).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Stop repeating" })).not.toBeInTheDocument();
    });

    it("does not ask to discard changes for the stop that was already done", async () => {
      const onCancel = vi.fn();
      render(
        <TaskForm initial={recurring} seriesHasOpen onSave={() => {}} onCancel={onCancel} onStopRepeating={() => {}} />,
      );
      await userEvent.click(screen.getByRole("button", { name: "Stop repeating" }));
      await userEvent.click(
        within(screen.getByRole("dialog", { name: "Stop repeating?" })).getByRole("button", { name: "Stop repeating" }),
      );
      await userEvent.keyboard("{Escape}");
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog", { name: "Discard changes?" })).not.toBeInTheDocument();
    });

    it("lets the user pick a new repeat after stopping, and saves it as a new series", async () => {
      const onSave = vi.fn();
      render(<TaskForm initial={recurring} seriesHasOpen onSave={onSave} onCancel={() => {}} onStopRepeating={() => {}} />);
      await userEvent.click(screen.getByRole("button", { name: "Stop repeating" }));
      await userEvent.click(
        within(screen.getByRole("dialog", { name: "Stop repeating?" })).getByRole("button", { name: "Stop repeating" }),
      );
      await userEvent.selectOptions(repeatSelect(), "daily");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(onSave.mock.calls[0]?.[0].recurrence).toMatchObject({ kind: "daily" });
      expect(onSave.mock.calls[0]?.[1]).toBe("occurrence");
    });
  });
});
