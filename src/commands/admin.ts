import type { Bot } from "grammy";
import type { Ctx } from "../index";
import { adminConfig } from "../types";
import { denyUnlessOwner } from "../utils/adminAccess";

function adminConfigText(): string {
  return [
    "Admin Configuration",
    "",
    `Owner ID: ${adminConfig.ownerId ?? "(not set)"}`,
    `Timezone: ${adminConfig.timezone}`,
    `Booking window: ${adminConfig.bookingWindowDays} days`,
  ].join("\n");
}

function adminEditKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "Change Owner ID", callback_data: "admin:edit_owner" },
        { text: "Change Timezone", callback_data: "admin:edit_tz" },
      ],
      [
        { text: "Change Booking Window", callback_data: "admin:edit_window" },
      ],
      [{ text: "Done", callback_data: "admin:done" }],
    ],
  };
}

async function promptOwnerId(ctx: Ctx): Promise<void> {
  ctx.session.step = "admin_setup_owner_id";
  await ctx.reply("Please send the owner's Telegram ID (a number).");
}

async function promptTimezone(ctx: Ctx): Promise<void> {
  ctx.session.step = "admin_setup_timezone";
  await ctx.reply("Please send the timezone (e.g., UTC+3, Europe/Moscow).");
}

async function promptBookingWindow(ctx: Ctx): Promise<void> {
  ctx.session.step = "admin_setup_window";
  await ctx.reply(
    "How many days ahead should bookings be allowed? (e.g., 30, 60, 90)",
  );
}

async function finishAdminSetup(ctx: Ctx): Promise<void> {
  ctx.session.step = "idle";
  adminConfig.ownerId = ctx.session.adminSetupOwnerId;
  adminConfig.timezone = ctx.session.adminSetupTimezone ?? adminConfig.timezone;
  adminConfig.bookingWindowDays =
    ctx.session.adminSetupWindow ?? adminConfig.bookingWindowDays;
  await ctx.reply(`Admin configuration saved:\n\n${adminConfigText()}`);
}

export function registerAdmin(bot: Bot<Ctx>): void {
  bot.command("admin", async (ctx) => {
    if (adminConfig.ownerId !== undefined) {
      if (!(await denyUnlessOwner(ctx))) {
        return;
      }

      ctx.session.step = "admin_menu";
      await ctx.reply(`${adminConfigText()}\n\nChoose what to change:`, {
        reply_markup: adminEditKeyboard(),
      });
      return;
    }

    await ctx.reply(
      "Admin Setup\n\nNo owner has been configured yet. Let's set up the admin.",
    );
    await promptOwnerId(ctx);
  });

  bot.callbackQuery("admin:edit_owner", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (adminConfig.ownerId !== undefined && !(await denyUnlessOwner(ctx))) {
      return;
    }
    await promptOwnerId(ctx);
  });

  bot.callbackQuery("admin:edit_tz", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (adminConfig.ownerId !== undefined && !(await denyUnlessOwner(ctx))) {
      return;
    }
    await promptTimezone(ctx);
  });

  bot.callbackQuery("admin:edit_window", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (adminConfig.ownerId !== undefined && !(await denyUnlessOwner(ctx))) {
      return;
    }
    await promptBookingWindow(ctx);
  });

  bot.callbackQuery("admin:done", async (ctx) => {
    await ctx.answerCallbackQuery();
    if (adminConfig.ownerId !== undefined && !(await denyUnlessOwner(ctx))) {
      return;
    }
    ctx.session.step = "idle";
    await ctx.editMessageText(
      `${adminConfigText()}\n\nConfiguration unchanged.`,
    );
  });

  bot.on("message:text", async (ctx, next) => {
    const step = ctx.session.step;

    if (step === "admin_setup_owner_id") {
      const id = Number(ctx.message.text);
      if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) {
        await ctx.reply(
          "That doesn't look like a valid Telegram ID. Please send a numeric ID.",
        );
        return;
      }
      ctx.session.adminSetupOwnerId = id;
      await ctx.reply(`Owner ID set to ${id}.`);
      await promptTimezone(ctx);
      return;
    }

    if (step === "admin_setup_timezone") {
      const tz = ctx.message.text.trim();
      if (!tz) {
        await ctx.reply("Please enter a valid timezone.");
        return;
      }
      ctx.session.adminSetupTimezone = tz;
      await ctx.reply(`Timezone set to ${tz}.`);
      await promptBookingWindow(ctx);
      return;
    }

    if (step === "admin_setup_window") {
      const days = Number(ctx.message.text);
      if (!Number.isFinite(days) || days <= 0 || !Number.isInteger(days)) {
        await ctx.reply(
          "Please enter a valid number of days (e.g., 30, 60, 90).",
        );
        return;
      }
      ctx.session.adminSetupWindow = days;
      await ctx.reply(`Booking window set to ${days} days.`);
      await finishAdminSetup(ctx);
      return;
    }

    await next();
  });
}