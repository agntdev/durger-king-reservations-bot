import { inlineButton, inlineKeyboard } from "@agntdev/bot-toolkit";

export const SLOT_INTERVAL_MINUTES = 15;
export const BOOKING_DURATION_MINUTES = 90;
export const OPENING_HOUR = 10;
export const CLOSING_HOUR = 22;
export const HOURS_PER_ROW = 4;
export const MINUTES_PER_ROW = 4;

export interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

export interface Booking {
  date: string;
  startHour: number;
  startMinute: number;
}

function toMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function formatSlot(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function generateTimeSlots(
  dateKey: string,
  existingBookings: Booking[] = [],
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const lastStartMin = toMinutes(CLOSING_HOUR, 0) - BOOKING_DURATION_MINUTES;
  const openMin = toMinutes(OPENING_HOUR, 0);

  for (let min = openMin; min <= lastStartMin; min += SLOT_INTERVAL_MINUTES) {
    const hour = Math.floor(min / 60);
    const minute = min % 60;
    slots.push({ hour, minute, label: formatSlot(hour, minute) });
  }

  const dateBookings = existingBookings.filter((b) => b.date === dateKey);

  return slots.filter((slot) => {
    const slotStart = toMinutes(slot.hour, slot.minute);
    const slotEnd = slotStart + BOOKING_DURATION_MINUTES;

    return !dateBookings.some((booking) => {
      const bookingStart = toMinutes(booking.startHour, booking.startMinute);
      const bookingEnd = bookingStart + BOOKING_DURATION_MINUTES;
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
  });
}

export function groupSlotsByHour(slots: TimeSlot[]): Map<number, TimeSlot[]> {
  const byHour = new Map<number, TimeSlot[]>();
  for (const slot of slots) {
    const hourSlots = byHour.get(slot.hour) ?? [];
    hourSlots.push(slot);
    byHour.set(slot.hour, hourSlots);
  }
  return byHour;
}

export function buildTimeSlotKeyboard(slots: TimeSlot[], expandedHour?: number) {
  if (slots.length === 0) {
    return inlineKeyboard([]);
  }

  const byHour = groupSlotsByHour(slots);
  const hours = [...byHour.keys()].sort((a, b) => a - b);
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  for (let i = 0; i < hours.length; i += HOURS_PER_ROW) {
    const chunk = hours.slice(i, i + HOURS_PER_ROW);
    rows.push(
      chunk.map((hour) => {
        const expanded = expandedHour === hour;
        const icon = expanded ? "▼" : "▶";
        return inlineButton(`${hour} ${icon}`, `slot:hour:${hour}`);
      }),
    );

    if (expandedHour !== undefined && chunk.includes(expandedHour)) {
      const minuteSlots = byHour.get(expandedHour) ?? [];
      for (let j = 0; j < minuteSlots.length; j += MINUTES_PER_ROW) {
        const minuteChunk = minuteSlots.slice(j, j + MINUTES_PER_ROW);
        rows.push(
          minuteChunk.map((slot) => inlineButton(slot.label, `slot:${slot.label}`)),
        );
      }
    }
  }

  return inlineKeyboard(rows);
}