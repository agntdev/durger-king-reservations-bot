import { createBot, type BotContext } from "@agntdev/bot-toolkit";
import { registerHelp } from "./commands/help";
import { registerMenu } from "./commands/menu";
import { registerStart } from "./commands/start";
import { registerUnknownCommand } from "./middleware/unknownCommand";

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

  registerStart(bot);
  registerMenu(bot);
  registerHelp(bot);
  registerUnknownCommand(bot);

  bot.catch(async (err) => {
    console.error("Bot error:", err.error);
    try {
      await err.ctx.reply(
        "Something went wrong on our side. Please try again in a moment.",
      );
    } catch {
      // Ignore follow-up failures while replying about the original error.
    }
  });

  return bot;
}

if (require.main === module) {
  makeBot().start();
}