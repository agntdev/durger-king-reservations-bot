import { inlineButton, inlineKeyboard } from "@agntdev/bot-toolkit";

export const WELCOME_TEXT = [
  "Welcome to Durger King Reservations!",
  "",
  "Book a table, view your bookings, or manage an existing reservation.",
  "Choose an option below to get started.",
].join("\n");

export function mainMenuKeyboard() {
  return inlineKeyboard([
    [inlineButton("Reserve a table", "menu:reserve")],
    [inlineButton("My bookings", "menu:bookings")],
  ]);
}