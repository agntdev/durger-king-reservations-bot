import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { cancelNoShowCheck } from "../jobs/noShows";
import { cancelBookingReminder } from "../jobs/reminders";
import {
  cancelBooking,
  getReservation,
  listReservationsForGuest,
} from "../services/bookings";
import { formatCancellationNotice, notifyOwner } from "../services/owner";
import { beginRescheduleFlow } from "./reserve";

export function registerBookingActions(bot: Bot<Ctx>): void {
  bot.callbackQuery(/^booking:cancel:(.+)$/, async (ctx) => {
    const bookingId = ctx.match[1];
    const guestId = ctx.from?.id;
    const existing = await getReservation(bookingId);

    await ctx.answerCallbackQuery();

    if (!guestId || !existing) {
      await ctx.editMessageText("That booking could not be found.");
      return;
    }

    if (existing.guestTelegramId !== guestId) {
      await ctx.editMessageText("You can only cancel your own bookings.");
      return;
    }

    const booking = await cancelBooking(bookingId);
    if (!booking) {
      await ctx.editMessageText("That booking could not be cancelled.");
      return;
    }

    cancelBookingReminder(bookingId);
    cancelNoShowCheck(bookingId);
    await notifyOwner(bot, formatCancellationNotice(booking));

    await ctx.editMessageText(
      `Booking ${bookingId} has been cancelled. The table is available again. Tap /start to make a new reservation.`,
    );
  });

  bot.callbackQuery(/^booking:reschedule:(.+)$/, async (ctx) => {
    const bookingId = ctx.match[1];
    const guestId = ctx.from?.id;
    const existing = await getReservation(bookingId);

    await ctx.answerCallbackQuery();

    if (!guestId || !existing) {
      await ctx.editMessageText("That booking could not be found.");
      return;
    }

    if (existing.guestTelegramId !== guestId) {
      await ctx.editMessageText("You can only reschedule your own bookings.");
      return;
    }

    await beginRescheduleFlow(ctx, bookingId);
  });

  bot.callbackQuery("booking:list", async (ctx) => {
    const guestId = ctx.from?.id;
    await ctx.answerCallbackQuery();

    if (!guestId) {
      await ctx.editMessageText("Unable to identify your Telegram account.");
      return;
    }

    const bookings = await listReservationsForGuest(guestId);
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
