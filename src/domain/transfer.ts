import { isRecord, isTask, type Task } from "./task";
import { todayString } from "./overdue";

export const EXPORT_APP = "focus-app";
export const EXPORT_VERSION = 1;

export type ImportResult = { ok: true; tasks: Task[] } | { ok: false; error: string };

export function serializeExport(tasks: Task[], now: Date = new Date()): string {
  return JSON.stringify(
    { app: EXPORT_APP, version: EXPORT_VERSION, exportedAt: now.toISOString(), tasks },
    null,
    2,
  );
}

export function exportFilename(now: Date = new Date()): string {
  return `focus-app-tasks-${todayString(now)}.json`;
}

const INVALID = "This file is not a valid Focus App export. Nothing was changed.";

/** Validate an exported file. Any problem rejects the whole file. */
export function parseImport(text: string): ImportResult {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, error: INVALID };
  }
  if (!isRecord(doc)) return { ok: false, error: INVALID };
  const { app, version, tasks } = doc;
  if (app !== EXPORT_APP) return { ok: false, error: INVALID };
  if (version !== EXPORT_VERSION) {
    return { ok: false, error: "This export file is from an unsupported version. Nothing was changed." };
  }
  if (!Array.isArray(tasks) || !tasks.every(isTask)) return { ok: false, error: INVALID };

  const ids = new Set(tasks.map((t) => t.id));
  if (ids.size !== tasks.length) return { ok: false, error: INVALID };

  return { ok: true, tasks };
}
