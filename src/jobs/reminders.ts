import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { getReservation, type Reservation } from "../services/bookings";
import {
  cancelJob,
  listDueJobs,
  listPendingJobsForGuest,
  markJobSent,
  scheduleJob,
} from "./scheduler";

const REMINDER_LEAD_MS = 2 * 60 * 60 * 1000;
const REMINDER_POLL_MS = 60 * 1000;

function bookingDateTime(booking: Reservation): Date {
  const [year, month, day] = booking.date.split("-").map(Number);
  return new Date(year, month - 1, day, booking.startHour, booking.startMinute);
}

export function reminderJobId(bookingId: string): string {
  return `reminder:${bookingId}`;
}

export function formatReminderMessage(booking: Reservation): string {
  return [
    "Reminder: your Durger King reservation is coming up.",
    "",
    `Booking ID: ${booking.id}`,
    `Date: ${booking.date}`,
    `Time: ${booking.slot}`,
    `Party size: ${booking.partySize}`,
    "We look forward to seeing you!",
  ].join("\n");
}

export function scheduleBookingReminder(booking: Reservation): void {
  const runAt = bookingDateTime(booking).getTime() - REMINDER_LEAD_MS;
  scheduleJob({
    id: reminderJobId(booking.id),
    runAt,
    bookingId: booking.id,
    guestTelegramId: booking.guestTelegramId,
  });
}

export function cancelBookingReminder(bookingId: string): void {
  cancelJob(reminderJobId(bookingId));
}

async function sendReminder(
  bot: Bot<Ctx>,
  booking: Reservation,
  jobId: string,
): Promise<void> {
  await bot.api.sendMessage(
    booking.guestTelegramId,
    formatReminderMessage(booking),
  );
  markJobSent(jobId);
}

export async function processDueReminders(bot: Bot<Ctx>): Promise<number> {
  let delivered = 0;

  for (const job of listDueJobs().filter((entry) => entry.id.startsWith("reminder:"))) {
    const booking = getReservation(job.bookingId);
    if (!booking || booking.status !== "booked") {
      markJobSent(job.id);
      continue;
    }

    await sendReminder(bot, booking, job.id);
    delivered += 1;
  }

  return delivered;
}

export async function deliverPendingRemindersForGuest(
  bot: Bot<Ctx>,
  guestTelegramId: number,
): Promise<number> {
  let delivered = 0;

  for (const job of listPendingJobsForGuest(guestTelegramId).filter((entry) =>
    entry.id.startsWith("reminder:"),
  )) {
    const booking = getReservation(job.bookingId);
    if (!booking || booking.status !== "booked") {
      markJobSent(job.id);
      continue;
    }

    await sendReminder(bot, booking, job.id);
    delivered += 1;
  }

  return delivered;
}

export function startReminderWorker(bot: Bot<Ctx>): NodeJS.Timeout {
  return setInterval(() => {
    void processDueReminders(bot);
  }, REMINDER_POLL_MS);
}

export function registerReminders(bot: Bot<Ctx>): void {
  bot.command("reminders", async (ctx) => {
    const guestId = ctx.from?.id;
    if (!guestId) {
      await ctx.reply("Unable to identify your Telegram account.");
      return;
    }

    const delivered = await deliverPendingRemindersForGuest(bot, guestId);
    if (delivered === 0) {
      await ctx.reply("No reminders are due for your bookings right now.");
      return;
    }

    await ctx.reply(
      `Delivered ${delivered} reservation reminder${delivered === 1 ? "" : "s"}.`,
    );
  });
}