import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { beginReserveFlow } from "../flows/reserve";
import { listReservationsForGuest } from "../services/bookings";
import { formatGuestBookings } from "../ui/bookings";
import { mainMenuKeyboard } from "../ui/menu";

export function registerMenu(bot: Bot<Ctx>): void {
  bot.callbackQuery("menu:reserve", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("Let's reserve a table.");
    await beginReserveFlow(ctx);
  });

  bot.callbackQuery("menu:bookings", async (ctx) => {
    const guestId = ctx.from?.id;
    await ctx.answerCallbackQuery();

    if (!guestId) {
      await ctx.editMessageText(
        "Unable to identify your Telegram account.",
        { reply_markup: mainMenuKeyboard() },
      );
      return;
    }

    const bookings = listReservationsForGuest(guestId);
    await ctx.editMessageText(formatGuestBookings(bookings), {
      reply_markup: mainMenuKeyboard(),
    });
  });
}