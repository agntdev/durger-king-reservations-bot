import type { Ctx } from "../index";
import { getOwnerTelegramId } from "../config";

export function isOwner(ctx: Ctx): boolean {
  const userId = ctx.from?.id;
  return userId !== undefined && userId === getOwnerTelegramId();
}

export async function denyUnlessOwner(ctx: Ctx): Promise<boolean> {
  if (isOwner(ctx)) {
    return true;
  }

  await ctx.reply("This command is only available to the restaurant owner.");
  return false;
}