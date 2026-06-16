import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { mainMenuKeyboard } from "../ui/menu";

export function registerMenu(bot: Bot<Ctx>): void {
  bot.callbackQuery("menu:reserve", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      "Let's reserve a table. The booking flow will guide you through date, time, and party size.",
      { reply_markup: mainMenuKeyboard() },
    );
  });

  bot.callbackQuery("menu:bookings", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      "Your upcoming bookings will appear here once you have reservations.",
      { reply_markup: mainMenuKeyboard() },
    );
  });
}