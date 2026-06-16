export const BOOKING_WINDOW_DAYS = 60;

export interface TableBooking {
  date: string;
  startHour: number;
  startMinute: number;
  partySize: number;
  tableSeats?: number;
}

export interface Session {
  step: string;
  selectedDate?: string;
  selectedSlot?: string;
  partySize?: number;
  calendarYear?: number;
  calendarMonth?: number;
}

export function initialSession(): Session {
  return { step: "idle" };
}