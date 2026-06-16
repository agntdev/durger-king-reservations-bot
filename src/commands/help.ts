import type { Bot } from "grammy";
import type { Ctx } from "../index";

export const HELP_TEXT = [
  "Durger King Reservations Bot — commands:",
  "",
  "/start — open the main menu",
  "/reserve — book a table (date → time → party size → contact details)",
  "/reminders — deliver pending reservation reminders",
  "/admin — configure owner settings (first-time setup)",
  "/help — show this message",
  "",
  "Tip: use the inline buttons during booking — each step guides you through the process.",
].join("\n");

export function registerHelp(bot: Bot<Ctx>): void {
  bot.command("help", async (ctx) => {
    await ctx.reply(HELP_TEXT);
  });
}