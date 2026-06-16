import type { Session } from "../types";

const RESERVATION_FIELDS: (keyof Session)[] = [
  "selectedDate",
  "selectedSlot",
  "partySize",
  "guestName",
  "guestPhone",
  "guestTelegramId",
  "bookingId",
  "reschedulingBookingId",
  "calendarYear",
  "calendarMonth",
];

export function resetReservationSession(session: Session): void {
  for (const field of RESERVATION_FIELDS) {
    delete session[field];
  }
  session.step = "idle";
}