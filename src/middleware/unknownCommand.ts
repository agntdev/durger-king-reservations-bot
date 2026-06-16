import type { Bot } from "grammy";
import type { Ctx } from "../index";

export const UNKNOWN_COMMAND_TEXT =
  "I didn't recognize that command. Type /help to see what I can do.";

export function registerUnknownCommand(bot: Bot<Ctx>): void {
  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith("/")) {
      await ctx.reply(UNKNOWN_COMMAND_TEXT);
      return;
    }
    await next();
  });
}