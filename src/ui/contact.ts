import { Keyboard } from "grammy";

export const NAME_PROMPT = "Please enter your full name for the reservation.";
export const PHONE_PROMPT =
  "Please share your phone number using the button below, or type it manually.";

export function phoneKeyboard() {
  return new Keyboard()
    .requestContact("Share phone number")
    .resized()
    .oneTime();
}