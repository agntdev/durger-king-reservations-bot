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
    ctx.session.step = "date_selected";
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `Date selected: ${dateKey}.\n\nNext you'll choose an available time slot.`,
    );
  });

  bot.callbackQuery("cal:noop", async (ctx) => {
    await ctx.answerCallbackQuery();
  });
}

