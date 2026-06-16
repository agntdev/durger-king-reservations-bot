import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { getOwnerTelegramId } from "../config";
import type { Reservation } from "./bookings";

export async function notifyOwner(
  bot: Bot<Ctx>,
  message: string,
): Promise<boolean> {
  const ownerId = getOwnerTelegramId();
  await bot.api.sendMessage(ownerId, message);
  return true;
}

export function formatNewBookingNotice(booking: Reservation): string {
  return [
    "New booking",
    "",
    `Booking ID: ${booking.id}`,
    `Guest: ${booking.guestName}`,
    `Phone: ${booking.guestPhone}`,
    `Date: ${booking.date}`,
    `Time: ${booking.slot}`,
    `Party size: ${booking.partySize}`,
  ].join("\n");
}

export function formatCancellationNotice(booking: Reservation): string {
  return [
    "Booking cancelled",
    "",
    `Booking ID: ${booking.id}`,
    `Guest: ${booking.guestName}`,
    `Date: ${booking.date}`,
    `Time: ${booking.slot}`,
    `Party size: ${booking.partySize}`,
  ].join("\n");
}

export function formatRescheduleNotice(booking: Reservation): string {
  return [
    "Booking rescheduled",
    "",
    `Booking ID: ${booking.id}`,
    `Guest: ${booking.guestName}`,
    `New date: ${booking.date}`,
    `New time: ${booking.slot}`,
    `Party size: ${booking.partySize}`,
  ].join("\n");
}

export function formatNoShowNotice(booking: Reservation): string {
  return [
    "No-show flagged",
    "",
    `Booking ID: ${booking.id}`,
    `Guest: ${booking.guestName}`,
    `Date: ${booking.date}`,
    `Time: ${booking.slot}`,
    `Party size: ${booking.partySize}`,
    "The guest was not marked arrived within 30 minutes of the start time.",
  ].join("\n");
}