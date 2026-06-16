export interface AdminConfig {
  ownerId?: number;
  timezone: string;
  bookingWindowDays: number;
}

export const adminConfig: AdminConfig = {
  timezone: "UTC",
  bookingWindowDays: 60,
};

export interface Session {
  step: string;
  selectedDate?: string;
  calendarYear?: number;
  calendarMonth?: number;
  adminSetupOwnerId?: number;
  adminSetupTimezone?: string;
  adminSetupWindow?: number;
}

export function initialSession(): Session {
  return { step: "idle" };
}