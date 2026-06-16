import { inlineButton, inlineKeyboard } from "@agntdev/bot-toolkit";
import { adminConfig } from "../types";

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseMonthKey(year: number, month: number): { year: number; month: number } {
  const normalized = new Date(year, month - 1, 1);
  return {
    year: normalized.getFullYear(),
    month: normalized.getMonth() + 1,
  };
}

export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function isDateSelectable(date: Date, today = startOfDay(new Date())): boolean {
  const target = startOfDay(date);
  const lastBookable = addDays(today, adminConfig.bookingWindowDays);
  return target >= today && target <= lastBookable;
}

export function buildCalendarKeyboard(
  year: number,
  month: number,
  today = startOfDay(new Date()),
) {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  rows.push([
    inlineButton("Mon", "cal:noop"),
    inlineButton("Tue", "cal:noop"),
    inlineButton("Wed", "cal:noop"),
    inlineButton("Thu", "cal:noop"),
    inlineButton("Fri", "cal:noop"),
    inlineButton("Sat", "cal:noop"),
    inlineButton("Sun", "cal:noop"),
  ]);

  let week: Array<{ text: string; callback_data: string }> = [];
  for (let i = 0; i < startOffset; i += 1) {
    week.push(inlineButton(" ", "cal:noop"));
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    const key = toDateKey(date);
    if (isDateSelectable(date, today)) {
      week.push(inlineButton(String(day), `cal:date:${key}`));
    } else {
      week.push(inlineButton("·", "cal:noop"));
    }

    if (week.length === 7) {
      rows.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) {
      week.push(inlineButton(" ", "cal:noop"));
    }
    rows.push(week);
  }

  const prev = new Date(year, month - 2, 1);
  const next = new Date(year, month, 1);
  const navRow = [];

  if (isDateSelectable(new Date(prev.getFullYear(), prev.getMonth(), 1), today) ||
      isDateSelectable(new Date(prev.getFullYear(), prev.getMonth(), 28), today)) {
    navRow.push(
      inlineButton(
        "◀",
        `cal:month:${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`,
      ),
    );
  } else {
    navRow.push(inlineButton(" ", "cal:noop"));
  }

  navRow.push(inlineButton(formatMonthLabel(year, month), "cal:noop"));

  if (isDateSelectable(new Date(next.getFullYear(), next.getMonth(), 1), today)) {
    navRow.push(
      inlineButton(
        "▶",
        `cal:month:${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
      ),
    );
  } else {
    navRow.push(inlineButton(" ", "cal:noop"));
  }

  rows.push(navRow);

  return inlineKeyboard(rows);
}

export function calendarPrompt(): string {
  return `Choose a date for your reservation. Available dates are shown for the next ${adminConfig.bookingWindowDays} days.`;
}

export const CALENDAR_PROMPT = calendarPrompt();