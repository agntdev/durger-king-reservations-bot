import { assignTableForParty } from "./tables";
import {
  getPersistentStorage,
  bookingKey,
  nextNumKey,
  dateIndexKey,
  guestIndexKey,
} from "./storage";
import type { TableBooking } from "../types";

export type BookingStatus =
  | "booked"
  | "arrived"
  | "cancelled"
  | "rescheduled"
  | "no-show";

export interface Reservation extends TableBooking {
  id: string;
  slot: string;
  guestName: string;
  guestPhone: string;
  guestTelegramId: number;
  status: BookingStatus;
}

function parseSlot(slot: string): { startHour: number; startMinute: number } {
  const [startHour, startMinute] = slot.split(":").map(Number);
  return { startHour, startMinute };
}

function toTableBooking(booking: Reservation): TableBooking {
  return {
    date: booking.date,
    startHour: booking.startHour,
    startMinute: booking.startMinute,
    partySize: booking.partySize,
    tableSeats: booking.tableSeats,
  };
}

async function readAllReservations(): Promise<Reservation[]> {
  const storage = getPersistentStorage();
  const results: Reservation[] = [];
  const allKeys = storage.readAllKeys?.();
  if (!allKeys) return results;
  for await (const key of allKeys) {
    if (typeof key !== "string") continue;
    if (key.startsWith("bkg:DK-")) {
      const booking = await storage.read(key);
      if (booking) {
        results.push(booking as Reservation);
      }
    }
  }
  return results;
}

async function readIndex(key: string): Promise<string[]> {
  const storage = getPersistentStorage();
  const raw = await storage.read(key);
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

async function writeIndex(key: string, ids: string[]): Promise<void> {
  const storage = getPersistentStorage();
  await storage.write(key, ids);
}

async function addToIndex(indexKey: string, bookingId: string): Promise<void> {
  const ids = await readIndex(indexKey);
  if (!ids.includes(bookingId)) {
    ids.push(bookingId);
    await writeIndex(indexKey, ids);
  }
}

async function removeFromIndex(
  indexKey: string,
  bookingId: string,
): Promise<void> {
  const ids = await readIndex(indexKey);
  const filtered = ids.filter((id) => id !== bookingId);
  if (filtered.length !== ids.length) {
    await writeIndex(indexKey, filtered);
  }
}

export async function listBookings(): Promise<TableBooking[]> {
  const all = await readAllReservations();
  return all.filter((b) => b.status === "booked").map(toTableBooking);
}

export async function listBookingsExcluding(
  excludeId?: string,
): Promise<TableBooking[]> {
  const all = await readAllReservations();
  return all
    .filter((b) => b.status === "booked" && b.id !== excludeId)
    .map(toTableBooking);
}

export async function listReservationsForGuest(
  telegramId: number,
): Promise<Reservation[]> {
  const ids = await readIndex(guestIndexKey(telegramId));
  const storage = getPersistentStorage();
  const results: Reservation[] = [];
  for (const id of ids) {
    const booking = await storage.read(bookingKey(id));
    if (booking && (booking as Reservation).status === "booked") {
      results.push(booking as Reservation);
    }
  }
  return results;
}

export async function listReservationsByDate(
  date: string,
): Promise<Reservation[]> {
  const ids = await readIndex(dateIndexKey(date));
  const storage = getPersistentStorage();
  const results: Reservation[] = [];
  for (const id of ids) {
    const booking = await storage.read(bookingKey(id));
    if (booking && (booking as Reservation).status === "booked") {
      results.push(booking as Reservation);
    }
  }
  return results;
}

export async function listNoShowBookings(): Promise<Reservation[]> {
  const all = await readAllReservations();
  return all.filter((b) => b.status === "no-show");
}

export async function getReservation(
  id: string,
): Promise<Reservation | undefined> {
  const storage = getPersistentStorage();
  const booking = await storage.read(bookingKey(id));
  if (!booking) return undefined;
  return booking as Reservation;
}

export interface CreateBookingInput {
  date: string;
  slot: string;
  partySize: number;
  guestName: string;
  guestPhone: string;
  guestTelegramId: number;
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<Reservation> {
  const storage = getPersistentStorage();

  const currentNumRaw = await storage.read(nextNumKey());
  const nextBookingNumber = typeof currentNumRaw === "number" ? currentNumRaw : 1;

  const tableSeats = assignTableForParty(
    input.partySize,
    input.date,
    input.slot,
    await listBookings(),
  );

  if (tableSeats === null) {
    throw new Error("No table available for the requested party size.");
  }

  const { startHour, startMinute } = parseSlot(input.slot);
  const id = `DK-${String(nextBookingNumber).padStart(4, "0")}`;
  const booking: Reservation = {
    id,
    date: input.date,
    slot: input.slot,
    startHour,
    startMinute,
    partySize: input.partySize,
    tableSeats,
    guestName: input.guestName,
    guestPhone: input.guestPhone,
    guestTelegramId: input.guestTelegramId,
    status: "booked",
  };

  await storage.write(nextNumKey(), nextBookingNumber + 1);
  await storage.write(bookingKey(id), booking);
  await addToIndex(dateIndexKey(input.date), id);
  await addToIndex(guestIndexKey(input.guestTelegramId), id);

  return booking;
}

async function saveReservation(booking: Reservation): Promise<void> {
  const storage = getPersistentStorage();
  await storage.write(bookingKey(booking.id), booking);
}

export async function cancelBooking(
  id: string,
): Promise<Reservation | undefined> {
  const booking = await getReservation(id);
  if (!booking || booking.status !== "booked") {
    return undefined;
  }

  booking.status = "cancelled";
  await saveReservation(booking);
  return booking;
}

export async function markArrived(
  id: string,
): Promise<Reservation | undefined> {
  const booking = await getReservation(id);
  if (!booking || booking.status !== "booked") {
    return undefined;
  }

  booking.status = "arrived";
  await saveReservation(booking);
  return booking;
}

export interface RescheduleBookingInput {
  date: string;
  slot: string;
  partySize: number;
}

export async function rescheduleBooking(
  id: string,
  input: RescheduleBookingInput,
): Promise<Reservation | undefined> {
  const booking = await getReservation(id);
  if (!booking || booking.status !== "booked") {
    return undefined;
  }

  const tableSeats = assignTableForParty(
    input.partySize,
    input.date,
    input.slot,
    await listBookingsExcluding(id),
  );

  if (tableSeats === null) {
    return undefined;
  }

  const oldDate = booking.date;

  const { startHour, startMinute } = parseSlot(input.slot);
  booking.date = input.date;
  booking.slot = input.slot;
  booking.startHour = startHour;
  booking.startMinute = startMinute;
  booking.partySize = input.partySize;
  booking.tableSeats = tableSeats;

  await saveReservation(booking);

  if (oldDate !== input.date) {
    await removeFromIndex(dateIndexKey(oldDate), id);
    await addToIndex(dateIndexKey(input.date), id);
  }

  return booking;
}

export async function markNoShow(
  id: string,
): Promise<Reservation | undefined> {
  const booking = await getReservation(id);
  if (!booking || booking.status !== "booked") {
    return undefined;
  }

  booking.status = "no-show";
  await saveReservation(booking);
  return booking;
}
