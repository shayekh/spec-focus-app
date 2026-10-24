import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransferMenu } from "../../src/ui/TransferMenu";
import { serializeExport } from "../../src/domain/transfer";
import type { Task } from "../../src/domain/task";

const existing: Task = {
  id: "a",
  title: "Existing",
  description: "",
  priority: "medium",
  status: "todo",
  dueDate: null,
  tags: [],
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};
const incoming: Task = { ...existing, id: "b", title: "Incoming" };

function file(content: string, name = "tasks.json") {
  return new File([content], name, { type: "application/json" });
}

function setup(tasks: Task[]) {
  const onImport = vi.fn();
  render(<TransferMenu tasks={tasks} onImport={onImport} />);
  return { onImport };
}

async function upload(f: File) {
  await userEvent.upload(screen.getByLabelText(/import tasks/i), f);
}

describe("TransferMenu import", () => {
  it("shows an overwrite warning when tasks exist and imports only after confirming", async () => {
    const { onImport } = setup([existing]);
    await upload(file(serializeExport([incoming])));

    expect(await screen.findByRole("dialog", { name: /replace/i })).toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Replace" }));
    expect(onImport).toHaveBeenCalledWith([incoming]);
  });

  it("keeps existing tasks when the overwrite warning is cancelled", async () => {
    const { onImport } = setup([existing]);
    await upload(file(serializeExport([incoming])));
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(onImport).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("imports straight away, with no warning, when there are no tasks yet", async () => {
    const { onImport } = setup([]);
    await upload(file(serializeExport([incoming])));
    await waitFor(() => expect(onImport).toHaveBeenCalledWith([incoming]));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a clear error for an invalid file and changes nothing", async () => {
    const { onImport } = setup([existing]);
    await upload(file("definitely not json"));

    expect(await screen.findByRole("alert")).toHaveTextContent(/not a valid focus app export/i);
    expect(onImport).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clears an earlier error after a successful import", async () => {
    const { onImport } = setup([]);
    await upload(file("bad"));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await upload(file(serializeExport([incoming]), "good.json"));
    await waitFor(() => expect(onImport).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("TransferMenu export", () => {
  it("has an Export button", () => {
    setup([existing]);
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
  });
});
