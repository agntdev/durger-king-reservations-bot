export function getOwnerTelegramId(): number {
  const raw = process.env.OWNER_TELEGRAM_ID ?? "1";
  const ownerId = Number(raw);
  return Number.isFinite(ownerId) ? ownerId : 1;
}