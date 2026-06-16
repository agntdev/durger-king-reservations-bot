import "dotenv/config";
import { createBot } from "@agntdev/bot-toolkit";

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN environment variable is required");
}

const bot = createBot({ token });

bot.command("start", async (ctx) => {
  await ctx.reply("Welcome to Durger King Reservations Bot! Use /help to see available commands.");
});

bot.start();