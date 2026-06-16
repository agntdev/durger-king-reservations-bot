import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { getOwnerTelegramId } from "../config";
import {
  getReservation,
  markNoShow,
  type Reservation,
} from "../services/bookings";
import { formatNoShowNotice, notifyOwner } from "../services/owner";
import {
  cancelJob,
  listDueJobs,
  listPendingJobs,
  markJobSent,
  scheduleJob,
} from "./scheduler";

const NO_SHOW_GRACE_MS = 30 * 60 * 1000;

function bookingDateTime(booking: Reservation): Date {
  const [year, month, day] = booking.date.split("-").map(Number);
  return new Date(year, month - 1, day, booking.startHour, booking.startMinute);
}

export function noShowJobId(bookingId: string): string {
  return `noshow:${bookingId}`;
}

export async function scheduleNoShowCheck(
  booking: Reservation,
): Promise<void> {
  const runAt = bookingDateTime(booking).getTime() + NO_SHOW_GRACE_MS;
  await scheduleJob({
    id: noShowJobId(booking.id),
    runAt,
    bookingId: booking.id,
    guestTelegramId: booking.guestTelegramId,
  });
}

export async function cancelNoShowCheck(bookingId: string): Promise<void> {
  await cancelJob(noShowJobId(bookingId));
}

function isNoShowJob(jobId: string): boolean {
  return jobId.startsWith("noshow:");
}

async function processNoShowJob(
  bot: Bot<Ctx>,
  jobId: string,
): Promise<boolean> {
  const bookingId = jobId.replace(/^noshow:/, "");
  const booking = await getReservation(bookingId);

  if (!booking || booking.status !== "booked") {
    await markJobSent(jobId);
    return false;
  }

  const updated = await markNoShow(bookingId);
  if (!updated) {
    await markJobSent(jobId);
    return false;
  }

  await notifyOwner(bot, formatNoShowNotice(updated));
  await markJobSent(jobId);
  return true;
}

export async function processDueNoShows(bot: Bot<Ctx>): Promise<number> {
  let processed = 0;

  const dueJobs = await listDueJobs();
  for (const job of dueJobs.filter((entry) => isNoShowJob(entry.id))) {
    if (await processNoShowJob(bot, job.id)) {
      processed += 1;
    }
  }

  return processed;
}

export async function processPendingNoShows(bot: Bot<Ctx>): Promise<number> {
  let processed = 0;

  const pending = await listPendingJobs();
  for (const job of pending.filter((entry) => isNoShowJob(entry.id))) {
    if (await processNoShowJob(bot, job.id)) {
      processed += 1;
    }
  }

  return processed;
}

export function registerNoShowChecks(bot: Bot<Ctx>): void {
  bot.command("checknoshows", async (ctx) => {
    const ownerId = getOwnerTelegramId();
    if (ctx.from?.id !== ownerId) {
      await ctx.reply(
        "This command is only available to the restaurant owner.",
      );
      return;
    }

    const processed = await processPendingNoShows(bot);
    if (processed === 0) {
      await ctx.reply("No pending no-show checks to process.");
      return;
    }

    await ctx.reply(
      `Processed ${processed} no-show check${processed === 1 ? "" : "s"} and notified the owner.`,
    );
  });
}
