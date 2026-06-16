import { adminConfig } from "./types";

export function getOwnerTelegramId(): number {
  if (adminConfig.ownerId !== undefined) {
    return adminConfig.ownerId;
  }

  const raw = process.env.OWNER_TELEGRAM_ID ?? "1";
  const ownerId = Number(raw);
  return Number.isFinite(ownerId) ? ownerId : 1;
}