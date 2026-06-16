import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { scheduleNoShowCheck } from "../jobs/noShows";
import { scheduleBookingReminder } from "../jobs/reminders";
import { createBooking } from "../services/bookings";
import {
  bookingActionsKeyboard,
  formatBookingConfirmation,
} from "../ui/confirmation";
import { NAME_PROMPT, PHONE_PROMPT, phoneKeyboard } from "../ui/contact";
import { normalizePhone } from "../utils/phone";

async function completeContactCollection(ctx: Ctx, phone: string): Promise<void> {
  const date = ctx.session.selectedDate;
  const slot = ctx.session.selectedSlot;
  const partySize = ctx.session.partySize;
  const guestName = ctx.session.guestName;
  const guestTelegramId = ctx.from?.id;

  if (!date || !slot || !partySize || !guestName || !guestTelegramId) {
    await ctx.reply(
      "Something went wrong while saving your details. Please start again with /reserve.",
      { reply_markup: { remove_keyboard: true } },
    );
    return;
  }

  ctx.session.guestPhone = phone;
  ctx.session.guestTelegramId = guestTelegramId;

  const booking = createBooking({
    date,
    slot,
    partySize,
    guestName,
    guestPhone: phone,
    guestTelegramId,
  });
  scheduleBookingReminder(booking);
  scheduleNoShowCheck(booking);

  ctx.session.bookingId = booking.id;
  ctx.session.step = "booking_confirmed";

  await ctx.reply(formatBookingConfirmation(booking), {
    reply_markup: bookingActionsKeyboard(booking.id),
  });
}

export async function beginContactCollection(ctx: Ctx): Promise<void> {
  if (ctx.from) {
    ctx.session.guestTelegramId = ctx.from.id;
  }
  ctx.session.step = "collecting_name";
  await ctx.reply(NAME_PROMPT);
}

export function registerContactFlow(bot: Bot<Ctx>): void {
  bot.on("message:text", async (ctx, next) => {
    if (ctx.session.step === "collecting_name") {
      const name = ctx.message.text.trim();
      if (name.length < 2) {
        await ctx.reply("Please enter a valid name (at least 2 characters).");
        return;
      }

      ctx.session.guestName = name;
      ctx.session.step = "collecting_phone";
      await ctx.reply(PHONE_PROMPT, { reply_markup: phoneKeyboard() });
      return;
    }

    if (ctx.session.step === "collecting_phone") {
      const phone = normalizePhone(ctx.message.text);
      if (!phone) {
        await ctx.reply(
          "Please enter a valid phone number or tap Share phone number.",
        );
        return;
      }

      await completeContactCollection(ctx, phone);
      return;
    }

    await next();
  });

  bot.on("message:contact", async (ctx, next) => {
    if (ctx.session.step !== "collecting_phone") {
      await next();
      return;
    }

    const contact = ctx.message.contact;
    if (!contact.phone_number) {
      await ctx.reply(
        "That contact does not include a phone number. Please type your phone instead.",
      );
      return;
    }

    await completeContactCollection(ctx, contact.phone_number);
  });
}