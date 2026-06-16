import { createBot, type BotContext } from "@agntdev/bot-toolkit";
import { registerAdmin } from "./commands/admin";
import { registerAdminBookings } from "./commands/adminBookings";
import { registerHelp } from "./commands/help";
import { registerMenu } from "./commands/menu";
import { registerStart } from "./commands/start";
import { registerNoShowChecks } from "./jobs/noShows";
import { registerReminders } from "./jobs/reminders";
import { startJobWorkers } from "./jobs/workers";
import { registerBookingActions } from "./flows/booking";
import { registerContactFlow } from "./flows/contact";
import { registerReserveFlow } from "./flows/reserve";
import {
  registerErrorRecovery,
  reportSystemError,
} from "./middleware/errorRecovery";
import { registerUnknownCommand } from "./middleware/unknownCommand";
import { resetBookingsStore } from "./services/bookings";
import { initialSession, resetAdminConfig, type Session } from "./types";

export type Ctx = BotContext<Session>;

export function makeBot() {
  resetAdminConfig();
  resetBookingsStore();
  const bot = createBot<Session>(process.env.BOT_TOKEN!, {
    initial: initialSession,
  });

  registerStart(bot);
  registerMenu(bot);
  registerReserveFlow(bot);
  registerAdmin(bot);
  registerAdminBookings(bot);
  registerContactFlow(bot);
  registerBookingActions(bot);
  registerReminders(bot);
  registerNoShowChecks(bot);
  registerHelp(bot);
  registerErrorRecovery(bot);
  registerUnknownCommand(bot);

  bot.catch(async (err) => {
    console.error("Bot error:", err.error);
    try {
      await reportSystemError(err.ctx);
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