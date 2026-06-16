import type { Reservation } from "../services/bookings";

export const EMPTY_BOOKINGS_TEXT =
  "Your upcoming bookings will appear here";

export function formatGuestBookings(bookings: Reservation[]): string {
  if (bookings.length === 0) {
    return EMPTY_BOOKINGS_TEXT;
  }

  const lines = bookings.map(
    (booking) =>
      `${booking.id} — ${booking.date} at ${booking.slot} (${booking.partySize} guests)`,
  );

  return ["Your upcoming bookings:", "", ...lines].join("\n");
}