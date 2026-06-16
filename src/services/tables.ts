import { BOOKING_DURATION_MINUTES } from "../ui/timeSlots";
import type { TableBooking } from "../types";

export const TABLE_INVENTORY: number[] = [2, 2, 4, 4, 4, 4];
export const MIN_PARTY_SIZE = 1;
export const MAX_PARTY_SIZE = 4;

function toMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function parseSlot(slot: string): { hour: number; minute: number } {
  const [hour, minute] = slot.split(":").map(Number);
  return { hour, minute };
}

function overlapsSlot(
  booking: TableBooking,
  date: string,
  slot: string,
): boolean {
  if (booking.date !== date) {
    return false;
  }

  const { hour, minute } = parseSlot(slot);
  const slotStart = toMinutes(hour, minute);
  const slotEnd = slotStart + BOOKING_DURATION_MINUTES;
  const bookingStart = toMinutes(booking.startHour, booking.startMinute);
  const bookingEnd = bookingStart + BOOKING_DURATION_MINUTES;

  return slotStart < bookingEnd && slotEnd > bookingStart;
}

function smallestFittingTable(
  partySize: number,
  available: number[],
): number | null {
  const fit = available.filter((seats) => seats >= partySize).sort((a, b) => a - b);
  return fit[0] ?? null;
}

export function remainingTables(
  date: string,
  slot: string,
  bookings: TableBooking[],
): number[] {
  const tables = [...TABLE_INVENTORY];
  const overlapping = bookings.filter((booking) => overlapsSlot(booking, date, slot));

  for (const booking of overlapping) {
    const tableSeats =
      booking.tableSeats ?? smallestFittingTable(booking.partySize, tables);
    if (tableSeats === null) {
      continue;
    }

    const index = tables.indexOf(tableSeats);
    if (index >= 0) {
      tables.splice(index, 1);
    }
  }

  return tables;
}

export function canAccommodatePartySize(
  partySize: number,
  date: string,
  slot: string,
  bookings: TableBooking[],
): boolean {
  if (partySize < MIN_PARTY_SIZE || partySize > MAX_PARTY_SIZE) {
    return false;
  }

  const tables = remainingTables(date, slot, bookings);
  return smallestFittingTable(partySize, tables) !== null;
}

export function assignTableForParty(
  partySize: number,
  date: string,
  slot: string,
  bookings: TableBooking[],
): number | null {
  const tables = remainingTables(date, slot, bookings);
  return smallestFittingTable(partySize, tables);
}

export function getAvailablePartySizes(
  date: string,
  slot: string,
  bookings: TableBooking[],
): number[] {
  const sizes: number[] = [];

  for (let partySize = MIN_PARTY_SIZE; partySize <= MAX_PARTY_SIZE; partySize += 1) {
    if (canAccommodatePartySize(partySize, date, slot, bookings)) {
      sizes.push(partySize);
    }
  }

  return sizes;
}