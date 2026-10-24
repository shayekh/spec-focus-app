import { useRef, useState, type ChangeEvent } from "react";
import type { Task } from "../domain/task";
import { exportFilename, parseImport, serializeExport } from "../domain/transfer";
import { ConfirmDialog } from "./ConfirmDialog";

interface TransferMenuProps {
  tasks: Task[];
  /** Called with the validated tasks that should replace the current list. */
  onImport: (tasks: Task[]) => void;
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function TransferMenu({ tasks, onImport }: TransferMenuProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Task[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    download(exportFilename(), serializeExport(tasks));
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Allow choosing the same file again later.
    event.target.value = "";
    if (!file) return;

    const result = parseImport(await file.text());
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    if (tasks.length > 0) {
      setPending(result.tasks);
    } else {
      onImport(result.tasks);
    }
  }

  function confirmReplace() {
    if (pending) onImport(pending);
    setPending(null);
  }

  return (
    <>
      <button type="button" onClick={handleExport}>
        Export
      </button>
      <label className="file-button">
        Import tasks
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
        />
      </label>
      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}
      {pending && (
        <ConfirmDialog
          title="Replace current tasks?"
          message={`Importing will replace all ${tasks.length} current task${
            tasks.length === 1 ? "" : "s"
          } with ${pending.length} task${pending.length === 1 ? "" : "s"} from the file. This cannot be undone.`}
          confirmLabel="Replace"
          onConfirm={confirmReplace}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
