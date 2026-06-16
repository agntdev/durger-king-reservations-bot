import type { Bot } from "grammy";
import type { Ctx } from "../index";

export const UNEXPECTED_INPUT_TEXT =
  "I wasn't expecting text right now. Use the buttons in the message above, or type /reserve to start over.";

export const STALE_CALLBACK_TEXT =
  "That action is no longer valid. Type /reserve to start a new reservation or /start for the main menu.";

export const SYSTEM_ERROR_TEXT =
  "Something went wrong on our side. Please try again in a moment, or type /start to return to the main menu.";

const KEYBOARD_ONLY_STEPS = new Set([
  "choosing_date",
  "choosing_slot",
  "choosing_party_size",
]);

const CONTACT_STEPS = new Set(["collecting_name", "collecting_phone"]);

const ADMIN_STEPS = new Set([
  "admin_setup_owner_id",
  "admin_setup_timezone",
  "admin_setup_window",
  "admin_menu",
]);

export function registerErrorRecovery(bot: Bot<Ctx>): void {
  bot.on("message:text", async (ctx, next) => {
    const step = ctx.session.step;
    const text = ctx.message.text;

    if (text.startsWith("/")) {
      await next();
      return;
    }

    if (CONTACT_STEPS.has(step) || ADMIN_STEPS.has(step)) {
      await next();
      return;
    }

    if (KEYBOARD_ONLY_STEPS.has(step)) {
      await ctx.reply(UNEXPECTED_INPUT_TEXT);
      return;
    }

    if (step === "booking_confirmed") {
      await ctx.reply(
        "Your booking is already confirmed. Use the buttons on your confirmation message, or type /reserve to book another table.",
      );
      return;
    }

    await next();
  });

  bot.on("callback_query:data", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "That button is no longer active." });

    if (ctx.callbackQuery.message) {
      try {
        await ctx.editMessageText(STALE_CALLBACK_TEXT);
        return;
      } catch {
        // Fall back to a new message if the original message cannot be edited.
      }
    }

    await ctx.reply(STALE_CALLBACK_TEXT);
  });
}