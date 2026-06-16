import { assignTableForParty } from "./tables";
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

let nextBookingNumber = 1;
const reservations: Reservation[] = [];

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

export function listBookings(): TableBooking[] {
  return reservations
    .filter((booking) => booking.status === "booked")
    .map(toTableBooking);
}

export function listBookingsExcluding(excludeId?: string): TableBooking[] {
  return reservations
    .filter(
      (booking) => booking.status === "booked" && booking.id !== excludeId,
    )
    .map(toTableBooking);
}

export function listReservationsForGuest(telegramId: number): Reservation[] {
  return reservations.filter(
    (booking) =>
      booking.guestTelegramId === telegramId && booking.status === "booked",
  );
}

export function listReservationsByDate(date: string): Reservation[] {
  return reservations.filter(
    (booking) => booking.date === date && booking.status === "booked",
  );
}

export function listNoShowBookings(): Reservation[] {
  return reservations.filter((booking) => booking.status === "no-show");
}

export function getReservation(id: string): Reservation | undefined {
  return reservations.find((booking) => booking.id === id);
}

export interface CreateBookingInput {
  date: string;
  slot: string;
  partySize: number;
  guestName: string;
  guestPhone: string;
  guestTelegramId: number;
}

export function createBooking(input: CreateBookingInput): Reservation {
  const tableSeats = assignTableForParty(
    input.partySize,
    input.date,
    input.slot,
    listBookings(),
  );

  if (tableSeats === null) {
    throw new Error("No table available for the requested party size.");
  }

  const { startHour, startMinute } = parseSlot(input.slot);
  const booking: Reservation = {
    id: `DK-${String(nextBookingNumber).padStart(4, "0")}`,
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

  nextBookingNumber += 1;
  reservations.push(booking);
  return booking;
}

export function cancelBooking(id: string): Reservation | undefined {
  const booking = getReservation(id);
  if (!booking || booking.status !== "booked") {
    return undefined;
  }

  booking.status = "cancelled";
  return booking;
}

export function markArrived(id: string): Reservation | undefined {
  const booking = getReservation(id);
  if (!booking || booking.status !== "booked") {
    return undefined;
  }

  booking.status = "arrived";
  return booking;
}

export interface RescheduleBookingInput {
  date: string;
  slot: string;
  partySize: number;
}

export function rescheduleBooking(
  id: string,
  input: RescheduleBookingInput,
): Reservation | undefined {
  const booking = getReservation(id);
  if (!booking || booking.status !== "booked") {
    return undefined;
  }

  const tableSeats = assignTableForParty(
    input.partySize,
    input.date,
    input.slot,
    listBookingsExcluding(id),
  );

  if (tableSeats === null) {
    return undefined;
  }

  const { startHour, startMinute } = parseSlot(input.slot);
  booking.date = input.date;
  booking.slot = input.slot;
  booking.startHour = startHour;
  booking.startMinute = startMinute;
  booking.partySize = input.partySize;
  booking.tableSeats = tableSeats;

  return booking;
}

export function markNoShow(id: string): Reservation | undefined {
  const booking = getReservation(id);
  if (!booking || booking.status !== "booked") {
    return undefined;
  }

  booking.status = "no-show";
  return booking;
}