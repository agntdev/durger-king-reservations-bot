import { inlineButton, inlineKeyboard } from "@agntdev/bot-toolkit";
import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { denyUnlessOwner, isOwner } from "../utils/adminAccess";
import { cancelNoShowCheck } from "../jobs/noShows";
import { cancelBookingReminder } from "../jobs/reminders";
import {
  cancelBooking,
  listNoShowBookings,
  listReservationsByDate,
  markArrived,
  type Reservation,
} from "../services/bookings";
import { formatCancellationNotice, notifyOwner } from "../services/owner";
import { TABLE_INVENTORY } from "../services/tables";
import { toDateKey } from "../ui/calendar";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function formatBookingLine(booking: Reservation): string {
  return `${booking.id} — ${booking.slot} — ${booking.guestName} (${booking.partySize} guests)`;
}

function adminBookingActionsKeyboard(bookings: Reservation[]) {
  const rows = bookings.map((booking) => [
    inlineButton(`Arrived ${booking.id}`, `admin:arrived:${booking.id}`),
    inlineButton(`Cancel ${booking.id}`, `admin:cancel:${booking.id}`),
    inlineButton(`Reschedule ${booking.id}`, `admin:reschedule:${booking.id}`),
  ]);

  return inlineKeyboard(rows);
}

function formatBookingsForDate(date: string, bookings: Reservation[]): string {
  if (bookings.length === 0) {
    return `No bookings scheduled for ${date}.`;
  }

  return [
    `Bookings for ${date}:`,
    "",
    ...bookings.map(formatBookingLine),
    "",
    "Use the buttons below to update a booking.",
  ].join("\n");
}

function formatCapacityForDate(date: string): string {
  const bookings = listReservationsByDate(date);
  const totalTables = TABLE_INVENTORY.length;

  return [
    `Capacity for ${date}`,
    "",
    `Tables in service: ${totalTables}`,
    `Active bookings: ${bookings.length}`,
    `Open tables at unsold times may still be available.`,
  ].join("\n");
}

function formatNoShows(bookings: Reservation[]): string {
  if (bookings.length === 0) {
    return "No no-show bookings recorded.";
  }

  return [
    "No-show bookings:",
    "",
    ...bookings.map(formatBookingLine),
  ].join("\n");
}

async function replyWithBookingsForDate(ctx: Ctx, date: string): Promise<void> {
  const bookings = listReservationsByDate(date);
  await ctx.reply(formatBookingsForDate(date, bookings), {
    reply_markup: adminBookingActionsKeyboard(bookings),
  });
}

export function registerAdminBookings(bot: Bot<Ctx>): void {
  bot.command("bookings_today", async (ctx) => {
    if (!(await denyUnlessOwner(ctx))) {
      return;
    }

    const today = toDateKey(new Date());
    await replyWithBookingsForDate(ctx, today);
  });

  bot.command("bookings_date", async (ctx) => {
    if (!(await denyUnlessOwner(ctx))) {
      return;
    }

    const parts = ctx.message?.text?.trim().split(/\s+/) ?? [];
    const date = parts[1];

    if (!date || !DATE_PATTERN.test(date)) {
      await ctx.reply("Usage: /bookings_date YYYY-MM-DD");
      return;
    }

    await replyWithBookingsForDate(ctx, date);
  });

  bot.command("capacity_today", async (ctx) => {
    if (!(await denyUnlessOwner(ctx))) {
      return;
    }

    const today = toDateKey(new Date());
    await ctx.reply(formatCapacityForDate(today));
  });

  bot.command("no_shows", async (ctx) => {
    if (!(await denyUnlessOwner(ctx))) {
      return;
    }

    await ctx.reply(formatNoShows(listNoShowBookings()));
  });

  bot.callbackQuery(/^admin:arrived:(.+)$/, async (ctx) => {
    if (!isOwner(ctx)) {
      await ctx.answerCallbackQuery({ text: "Owner only." });
      return;
    }

    const bookingId = ctx.match[1];
    const booking = markArrived(bookingId);
    await ctx.answerCallbackQuery();

    if (!booking) {
      await ctx.reply(`Booking ${bookingId} could not be marked arrived.`);
      return;
    }

    await cancelNoShowCheck(bookingId);
    await ctx.reply(`Booking ${bookingId} marked as arrived.`);
  });

  bot.callbackQuery(/^admin:cancel:(.+)$/, async (ctx) => {
    if (!isOwner(ctx)) {
      await ctx.answerCallbackQuery({ text: "Owner only." });
      return;
    }

    const bookingId = ctx.match[1];
    const booking = cancelBooking(bookingId);
    await ctx.answerCallbackQuery();

    if (!booking) {
      await ctx.reply(`Booking ${bookingId} could not be cancelled.`);
      return;
    }

    await cancelBookingReminder(bookingId);
    await cancelNoShowCheck(bookingId);
    await notifyOwner(bot, formatCancellationNotice(booking));
    await ctx.reply(`Booking ${bookingId} cancelled.`);
  });

  bot.callbackQuery(/^admin:reschedule:(.+)$/, async (ctx) => {
    if (!isOwner(ctx)) {
      await ctx.answerCallbackQuery({ text: "Owner only." });
      return;
    }

    const bookingId = ctx.match[1];
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `Ask the guest to tap Reschedule on booking ${bookingId}, or rebook with /reserve.`,
    );
  });
}