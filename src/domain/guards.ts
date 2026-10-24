/** Narrow an unknown value to a plain object whose properties can be inspected safely. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
