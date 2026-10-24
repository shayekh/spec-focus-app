export const PRIORITIES = ["low", "medium", "high"] as const;

export type Priority = (typeof PRIORITIES)[number];

export function isPriority(value: unknown): value is Priority {
  return PRIORITIES.some((priority) => priority === value);
}
