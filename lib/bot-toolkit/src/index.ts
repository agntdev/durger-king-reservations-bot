import { Bot, session, Context, SessionFlavor } from "grammy";

export type BotContext = Context & SessionFlavor<Record<string, unknown>>;

export interface CreateBotOptions {
  token: string;
}

export function createBot(options: CreateBotOptions): Bot<BotContext> {
  const bot = new Bot<BotContext>(options.token);
  bot.use(session({ initial: () => ({}) }));
  return bot;
}