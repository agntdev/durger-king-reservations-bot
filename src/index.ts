import { createBot, type BotContext } from "@agntdev/bot-toolkit";
import { registerMenu } from "./commands/menu";
import { registerStart } from "./commands/start";

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

  return bot;
}

if (require.main === module) {
  makeBot().start();
}