import { createBot, type BotContext } from "@agntdev/bot-toolkit";
import { registerHelp } from "./commands/help";
import { registerMenu } from "./commands/menu";
import { registerStart } from "./commands/start";
import { registerNoShowChecks } from "./jobs/noShows";
import { registerReminders } from "./jobs/reminders";
import { startJobWorkers } from "./jobs/workers";
import { registerBookingActions } from "./flows/booking";
import { registerContactFlow } from "./flows/contact";
import { registerReserveFlow } from "./flows/reserve";
import { registerUnknownCommand } from "./middleware/unknownCommand";
import { initialSession, type Session } from "./types";

export type Ctx = BotContext<Session>;

export function makeBot() {
  const bot = createBot<Session>(process.env.BOT_TOKEN!, {
    initial: initialSession,
  });

  registerStart(bot);
  registerMenu(bot);
  registerReserveFlow(bot);
  registerContactFlow(bot);
  registerBookingActions(bot);
  registerReminders(bot);
  registerNoShowChecks(bot);
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
  const bot = makeBot();
  startJobWorkers(bot);
  bot.start();
}