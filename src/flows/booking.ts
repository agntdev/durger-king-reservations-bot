import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { cancelBookingReminder } from "../jobs/reminders";
import {
  cancelBooking,
  listReservationsForGuest,
} from "../services/bookings";

export function registerBookingActions(bot: Bot<Ctx>): void {
  bot.callbackQuery(/^booking:cancel:(.+)$/, async (ctx) => {
    const bookingId = ctx.match[1];
    const booking = cancelBooking(bookingId);

    await ctx.answerCallbackQuery();

    if (!booking) {
      await ctx.editMessageText("That booking could not be cancelled.");
      return;
    }

    cancelBookingReminder(bookingId);
    await ctx.editMessageText(
      `Booking ${bookingId} has been cancelled. Tap /start to make a new reservation.`,
    );
  });

  bot.callbackQuery(/^booking:reschedule:(.+)$/, async (ctx) => {
    const bookingId = ctx.match[1];
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `Rescheduling for booking ${bookingId} will open the calendar flow in a later update. For now, cancel and book again.`,
    );
  });

  bot.callbackQuery("booking:list", async (ctx) => {
    const guestId = ctx.from?.id;
    await ctx.answerCallbackQuery();

    if (!guestId) {
      await ctx.editMessageText("Unable to identify your Telegram account.");
      return;
    }

    const bookings = listReservationsForGuest(guestId);
    if (bookings.length === 0) {
      await ctx.editMessageText("You do not have any active bookings yet.");
      return;
    }

    const lines = bookings.map(
      (booking) =>
        `${booking.id} — ${booking.date} ${booking.slot} (${booking.partySize} guests)`,
    );

    await ctx.editMessageText(`Your bookings:\n\n${lines.join("\n")}`);
  });
}