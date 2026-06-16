import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { processDueNoShows } from "./noShows";
import { processDueReminders } from "./reminders";

const JOB_POLL_MS = 60 * 1000;

export function startJobWorkers(bot: Bot<Ctx>): NodeJS.Timeout {
  return setInterval(() => {
    void processDueReminders(bot);
    void processDueNoShows(bot);
  }, JOB_POLL_MS);
}