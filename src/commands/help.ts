import type { Bot } from "grammy";
import type { Ctx } from "../index";

export const HELP_TEXT = [
  "Durger King Reservations Bot — commands:",
  "",
  "/start — open the main menu and book a table",
  "/reserve — book a table",
  "/reminders — deliver pending reservation reminders",
  "/help — show this message",
].join("\n");

export function registerHelp(bot: Bot<Ctx>): void {
  bot.command("help", async (ctx) => {
    await ctx.reply(HELP_TEXT);
  });
}