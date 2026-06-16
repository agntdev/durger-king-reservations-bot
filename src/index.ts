import { createBot, type BotContext } from "@agntdev/bot-toolkit";

interface Session {
  step: string;
}

export type Ctx = BotContext<Session>;

function initialSession(): Session {
  return { step: "idle" };
}

export function makeBot() {
  const bot = createBot<Session>(process.env.BOT_TOKEN!, {
    initial: initialSession,
  });

  bot.on("message:text", async (ctx) => {
    await ctx.reply("Durger King Reservations Bot is online.");
  });

  return bot;
}

if (require.main === module) {
  makeBot().start();
}