import type { Reservation } from "../services/bookings";
import { formatGuestBookingSummary } from "../services/privacy";

export const EMPTY_BOOKINGS_TEXT =
  "Your upcoming bookings will appear here";

export function formatGuestBookings(bookings: Reservation[]): string {
  if (bookings.length === 0) {
    return EMPTY_BOOKINGS_TEXT;
  }

  const lines = bookings.map(formatGuestBookingSummary);

  return ["Your upcoming bookings:", "", ...lines].join("\n");
}