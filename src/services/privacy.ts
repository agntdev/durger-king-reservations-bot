import type { Reservation } from "./bookings";

export function isBookingOwner(
  booking: Reservation,
  telegramId: number | undefined,
): boolean {
  return telegramId !== undefined && booking.guestTelegramId === telegramId;
}

export function formatGuestBookingSummary(booking: Reservation): string {
  return `${booking.id} — ${booking.date} ${booking.slot} (${booking.partySize} guests)`;
}

export function formatGuestBookingsList(bookings: Reservation[]): string {
  if (bookings.length === 0) {
    return "You do not have any active bookings yet.";
  }

  return [
    "Your bookings:",
    "",
    ...bookings.map(formatGuestBookingSummary),
  ].join("\n");
}