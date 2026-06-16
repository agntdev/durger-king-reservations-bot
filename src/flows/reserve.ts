import type { Bot } from "grammy";
import type { Ctx } from "../index";
import {
  buildCalendarKeyboard,
  CALENDAR_PROMPT,
  formatMonthLabel,
  isDateSelectable,
  parseMonthKey,
  toDateKey,
} from "../ui/calendar";
import { listBookings } from "../services/bookings";
import {
  canAccommodatePartySize,
  getAvailablePartySizes,
} from "../services/tables";
import { buildPartySizeKeyboard, PARTY_SIZE_PROMPT } from "../ui/partySize";
import { beginContactCollection } from "./contact";
import { buildTimeSlotKeyboard, generateTimeSlots } from "../ui/timeSlots";

function currentViewMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

async function showCalendar(
  ctx: Ctx,
  year: number,
  month: number,
  edit = false,
): Promise<void> {
  const view = parseMonthKey(year, month);
  ctx.session.step = "choosing_date";
  ctx.session.calendarYear = view.year;
  ctx.session.calendarMonth = view.month;

  const text = `${CALENDAR_PROMPT}\n\n${formatMonthLabel(view.year, view.month)}`;
  const keyboard = buildCalendarKeyboard(view.year, view.month);

  if (edit && ctx.callbackQuery?.message) {
    await ctx.editMessageText(text, { reply_markup: keyboard });
    return;
  }

  await ctx.reply(text, { reply_markup: keyboard });
}

export function registerReserveFlow(bot: Bot<Ctx>): void {
  bot.command("reserve", async (ctx) => {
    const view = currentViewMonth();
    await showCalendar(ctx, view.year, view.month);
  });

  bot.callbackQuery(/^cal:month:(\d{4})-(\d{2})$/, async (ctx) => {
    const year = Number(ctx.match[1]);
    const month = Number(ctx.match[2]);
    await ctx.answerCallbackQuery();
    await showCalendar(ctx, year, month, true);
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

    const slots = generateTimeSlots(dateKey, listBookings());
    const keyboard = buildTimeSlotKeyboard(slots);

    await ctx.answerCallbackQuery();

    if (slots.length === 0) {
      await ctx.editMessageText(
        `No available time slots for ${dateKey}. Please choose another date.`,
      );
      return;
    }

    await ctx.editMessageText(
      `Date: ${dateKey}\n\nChoose an available time slot:`,
      { reply_markup: keyboard },
    );
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
      listBookings(),
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
      `Date: ${dateKey}\nTime: ${slotLabel}\n\n${PARTY_SIZE_PROMPT}`,
      { reply_markup: buildPartySizeKeyboard(availableSizes) },
    );
  });

  bot.callbackQuery(/^party:(\d)$/, async (ctx) => {
    const partySize = Number(ctx.match[1]);
    const dateKey = ctx.session.selectedDate;
    const slotLabel = ctx.session.selectedSlot;

    if (
      !dateKey ||
      !slotLabel ||
      ctx.session.step !== "choosing_party_size"
    ) {
      await ctx.answerCallbackQuery({ text: "Please choose a date and time first." });
      return;
    }

    if (!canAccommodatePartySize(partySize, dateKey, slotLabel, listBookings())) {
      await ctx.answerCallbackQuery({
        text: "That party size cannot be seated at this time.",
      });
      return;
    }

    ctx.session.partySize = partySize;
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `Date: ${dateKey}\nTime: ${slotLabel}\nParty size: ${partySize}`,
    );
    await beginContactCollection(ctx);
  });

  bot.callbackQuery("cal:noop", async (ctx) => {
    await ctx.answerCallbackQuery();
  });
}

