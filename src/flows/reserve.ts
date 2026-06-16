import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { cancelNoShowCheck, scheduleNoShowCheck } from "../jobs/noShows";
import {
  cancelBookingReminder,
  scheduleBookingReminder,
} from "../jobs/reminders";
import { listBookings, listBookingsExcluding, rescheduleBooking } from "../services/bookings";
import { formatRescheduleNotice, notifyOwner } from "../services/owner";
import {
  canAccommodatePartySize,
  getAvailablePartySizes,
} from "../services/tables";
import {
  buildCalendarKeyboard,
  calendarPrompt,
  formatMonthLabel,
  isDateSelectable,
  parseMonthKey,
} from "../ui/calendar";
import { buildPartySizeKeyboard, PARTY_SIZE_PROMPT } from "../ui/partySize";
import { beginContactCollection } from "./contact";
import { buildTimeSlotKeyboard, generateTimeSlots } from "../ui/timeSlots";
import { RESERVE_STEPS, withStep } from "../ui/progress";
import { resetReservationSession } from "../utils/session";

function currentViewMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function bookingsForAvailability(ctx: Ctx) {
  return listBookingsExcluding(ctx.session.reschedulingBookingId);
}

function timeSlotPrompt(dateKey: string): string {
  return withStep(
    RESERVE_STEPS.time,
    `Date: ${dateKey}\n\nChoose an available time slot:`,
  );
}

async function showTimeSlots(ctx: Ctx, edit = true): Promise<void> {
  const dateKey = ctx.session.selectedDate;
  if (!dateKey) {
    return;
  }

  const slots = generateTimeSlots(dateKey, bookingsForAvailability(ctx));
  const keyboard = buildTimeSlotKeyboard(slots, ctx.session.expandedTimeHour);
  const text = timeSlotPrompt(dateKey);

  if (slots.length === 0) {
    const emptyText = `No available time slots for ${dateKey}. Please choose another date.`;
    if (edit && ctx.callbackQuery?.message) {
      await ctx.editMessageText(emptyText);
    } else {
      await ctx.reply(emptyText);
    }
    return;
  }

  if (edit && ctx.callbackQuery?.message) {
    await ctx.editMessageText(text, { reply_markup: keyboard });
    return;
  }

  await ctx.reply(text, { reply_markup: keyboard });
}

async function showCalendar(
  ctx: Ctx,
  year: number,
  month: number,
  edit = false,
  prompt = calendarPrompt(),
): Promise<void> {
  const view = parseMonthKey(year, month);
  ctx.session.step = "choosing_date";
  ctx.session.calendarYear = view.year;
  ctx.session.calendarMonth = view.month;

  const body = ctx.session.reschedulingBookingId
    ? prompt
    : withStep(RESERVE_STEPS.date, prompt);
  const text = `${body}\n\n${formatMonthLabel(view.year, view.month)}`;
  const keyboard = buildCalendarKeyboard(view.year, view.month);

  if (edit && ctx.callbackQuery?.message) {
    await ctx.editMessageText(text, { reply_markup: keyboard });
    return;
  }

  await ctx.reply(text, { reply_markup: keyboard });
}

export async function beginRescheduleFlow(ctx: Ctx, bookingId: string): Promise<void> {
  ctx.session.reschedulingBookingId = bookingId;
  const view = currentViewMonth();
  await showCalendar(
    ctx,
    view.year,
    view.month,
    true,
    "Choose a new date for your rescheduled reservation.",
  );
}

export async function beginReserveFlow(ctx: Ctx): Promise<void> {
  resetReservationSession(ctx.session);
  const view = currentViewMonth();
  await showCalendar(ctx, view.year, view.month);
}

export function registerReserveFlow(bot: Bot<Ctx>): void {
  bot.command("reserve", async (ctx) => {
    await beginReserveFlow(ctx);
  });

  bot.callbackQuery(/^cal:month:(\d{4})-(\d{2})$/, async (ctx) => {
    const year = Number(ctx.match[1]);
    const month = Number(ctx.match[2]);
    await ctx.answerCallbackQuery();
    const prompt = ctx.session.reschedulingBookingId
      ? "Choose a new date for your rescheduled reservation."
      : calendarPrompt();
    await showCalendar(ctx, year, month, true, prompt);
  });

  bot.callbackQuery(/^cal:date:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    const dateKey = ctx.match[1];
    const [year, month, day] = dateKey.split("-").map(Number);
    const selected = new Date(year, month - 1, day);

    if (!isDateSelectable(selected)) {
      await ctx.answerCallbackQuery({ text: "That date is not available." });
      return;
    }

    ctx.session.selectedDate = dateKey;
    ctx.session.step = "choosing_slot";
    ctx.session.expandedTimeHour = undefined;

    await ctx.answerCallbackQuery();
    await showTimeSlots(ctx, true);
  });

  bot.callbackQuery(/^slot:hour:(\d+)$/, async (ctx) => {
    const hour = Number(ctx.match[1]);

    if (!ctx.session.selectedDate || ctx.session.step !== "choosing_slot") {
      await ctx.answerCallbackQuery({ text: "Please start by selecting a date first." });
      return;
    }

    const dateKey = ctx.session.selectedDate;
    const slots = generateTimeSlots(dateKey, bookingsForAvailability(ctx));
    const availableHours = new Set(slots.map((slot) => slot.hour));

    if (!availableHours.has(hour)) {
      await ctx.answerCallbackQuery({ text: "No slots available for that hour." });
      return;
    }

    ctx.session.expandedTimeHour =
      ctx.session.expandedTimeHour === hour ? undefined : hour;
    await ctx.answerCallbackQuery();
    await showTimeSlots(ctx, true);
  });

  bot.callbackQuery(/^slot:(\d{2}:\d{2})$/, async (ctx) => {
    const slotLabel = ctx.match[1];
    const dateKey = ctx.session.selectedDate;

    if (!dateKey || ctx.session.step !== "choosing_slot") {
      await ctx.answerCallbackQuery({ text: "Please start by selecting a date first." });
      return;
    }

    const availableSizes = getAvailablePartySizes(
      dateKey,
      slotLabel,
      bookingsForAvailability(ctx),
    );
    if (availableSizes.length === 0) {
      await ctx.answerCallbackQuery({
        text: "No tables can accommodate a party at this time.",
      });
      await ctx.editMessageText(
        `Date: ${dateKey}\nTime: ${slotLabel}\n\nNo party sizes are available for this slot. Please choose another time.`,
      );
      return;
    }

    ctx.session.selectedSlot = slotLabel;
    ctx.session.step = "choosing_party_size";
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      withStep(
        RESERVE_STEPS.party,
        `Date: ${dateKey}\nTime: ${slotLabel}\n\n${PARTY_SIZE_PROMPT}`,
      ),
      { reply_markup: buildPartySizeKeyboard(availableSizes) },
    );
  });

  bot.callbackQuery(/^party:(\d)$/, async (ctx) => {
    const partySize = Number(ctx.match[1]);
    const dateKey = ctx.session.selectedDate;
    const slotLabel = ctx.session.selectedSlot;
    const reschedulingId = ctx.session.reschedulingBookingId;

    if (
      !dateKey ||
      !slotLabel ||
      ctx.session.step !== "choosing_party_size"
    ) {
      await ctx.answerCallbackQuery({ text: "Please choose a date and time first." });
      return;
    }

    if (
      !canAccommodatePartySize(
        partySize,
        dateKey,
        slotLabel,
        bookingsForAvailability(ctx),
      )
    ) {
      await ctx.answerCallbackQuery({
        text: "That party size cannot be seated at this time.",
      });
      return;
    }

    ctx.session.partySize = partySize;
    await ctx.answerCallbackQuery();

    if (reschedulingId) {
      const updated = rescheduleBooking(reschedulingId, {
        date: dateKey,
        slot: slotLabel,
        partySize,
      });

      if (!updated) {
        await ctx.editMessageText(
          "That reschedule could not be completed. Please try another date or time.",
        );
        return;
      }

      await cancelBookingReminder(reschedulingId);
      await cancelNoShowCheck(reschedulingId);
      await scheduleBookingReminder(updated);
      await scheduleNoShowCheck(updated);
      await notifyOwner(bot, formatRescheduleNotice(updated));

      ctx.session.reschedulingBookingId = undefined;
      ctx.session.step = "booking_confirmed";
      await ctx.editMessageText(
        `Booking ${reschedulingId} rescheduled to ${dateKey} at ${slotLabel} for ${partySize} guests.`,
      );
      return;
    }

    await ctx.editMessageText(
      `Date: ${dateKey}\nTime: ${slotLabel}\nParty size: ${partySize}`,
    );
    await beginContactCollection(ctx);
  });

  bot.callbackQuery("cal:noop", async (ctx) => {
    await ctx.answerCallbackQuery();
  });
}