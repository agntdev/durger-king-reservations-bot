import { inlineButton, inlineKeyboard } from "@agntdev/bot-toolkit";
import type { Reservation } from "../services/bookings";

export function formatBookingConfirmation(booking: Reservation): string {
  return [
    "Booking confirmed!",
    "",
    `Booking ID: ${booking.id}`,
    `Date: ${booking.date}`,
    `Time: ${booking.slot}`,
    `Party size: ${booking.partySize}`,
    `Table: ${booking.tableSeats} seats`,
    `Name: ${booking.guestName}`,
    `Phone: ${booking.guestPhone}`,
  ].join("\n");
}

export const BOOKING_NEXT_STEPS_TEXT = [
  "What happens next:",
  "• You'll get a reminder 2 hours before your reservation",
  "• Use the buttons below to cancel or reschedule if plans change",
  "• Type /start any time to return to the main menu",
].join("\n");

export function bookingActionsKeyboard(bookingId: string) {
  return inlineKeyboard([
    [inlineButton("Cancel booking", `booking:cancel:${bookingId}`)],
    [inlineButton("Reschedule", `booking:reschedule:${bookingId}`)],
    [inlineButton("My bookings", "booking:list")],
  ]);
}