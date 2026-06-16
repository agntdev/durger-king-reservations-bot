export const BOOKING_WINDOW_DAYS = 60;

export interface Session {
  step: string;
  selectedDate?: string;
  calendarYear?: number;
  calendarMonth?: number;
}

export function initialSession(): Session {
  return { step: "idle" };
}