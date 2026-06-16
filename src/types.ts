export interface AdminConfig {
  ownerId?: number;
  timezone: string;
  bookingWindowDays: number;
}

export const adminConfig: AdminConfig = {
  timezone: "UTC",
  bookingWindowDays: 60,
};

export function resetAdminConfig(): void {
  adminConfig.ownerId = undefined;
  adminConfig.timezone = "UTC";
  adminConfig.bookingWindowDays = 60;
}

export const BOOKING_WINDOW_DAYS = adminConfig.bookingWindowDays;

export interface TableBooking {
  date: string;
  startHour: number;
  startMinute: number;
  partySize: number;
  tableSeats?: number;
}

export interface Session {
  step: string;
  selectedDate?: string;
  selectedSlot?: string;
  partySize?: number;
  guestName?: string;
  guestPhone?: string;
  guestTelegramId?: number;
  bookingId?: string;
  reschedulingBookingId?: string;
  calendarYear?: number;
  calendarMonth?: number;
  adminSetupOwnerId?: number;
  adminSetupTimezone?: string;
  adminSetupWindow?: number;
}

export function initialSession(): Session {
  return { step: "idle" };
}