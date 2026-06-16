export const RESERVE_STEPS = {
  date: "Step 1 of 4 — Choose a date",
  time: "Step 2 of 4 — Choose a time",
  party: "Step 3 of 4 — Choose party size",
  contact: "Step 4 of 4 — Guest details",
} as const;

export function withStep(stepLabel: string, body: string): string {
  return `${stepLabel}\n\n${body}`;
}