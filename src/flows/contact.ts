import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { NAME_PROMPT, PHONE_PROMPT, phoneKeyboard } from "../ui/contact";
import { normalizePhone } from "../utils/phone";

async function completeContactCollection(ctx: Ctx, phone: string): Promise<void> {
  ctx.session.guestPhone = phone;
  if (ctx.from) {
    ctx.session.guestTelegramId = ctx.from.id;
  }
  ctx.session.step = "contact_collected";

  await ctx.reply(
    `Thanks, ${ctx.session.guestName}! We saved your phone (${phone}) and Telegram contact details.`,
    { reply_markup: { remove_keyboard: true } },
  );
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