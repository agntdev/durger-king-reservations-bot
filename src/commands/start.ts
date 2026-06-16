import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { mainMenuKeyboard, WELCOME_TEXT } from "../ui/menu";

export function registerStart(bot: Bot<Ctx>): void {
  bot.command("start", async (ctx) => {
    ctx.session.step = "menu";
    await ctx.reply(WELCOME_TEXT, { reply_markup: mainMenuKeyboard() });
  });
}