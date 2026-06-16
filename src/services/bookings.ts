import { assignTableForParty } from "./tables";
import type { TableBooking } from "../types";

export type BookingStatus = "booked" | "cancelled" | "rescheduled";

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

export function listBookings(): TableBooking[] {
  return reservations
    .filter((booking) => booking.status === "booked")
    .map((booking) => ({
      date: booking.date,
      startHour: booking.startHour,
      startMinute: booking.startMinute,
      partySize: booking.partySize,
      tableSeats: booking.tableSeats,
    }));
}

export function listReservationsForGuest(telegramId: number): Reservation[] {
  return reservations.filter(
    (booking) =>
      booking.guestTelegramId === telegramId && booking.status === "booked",
  );
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