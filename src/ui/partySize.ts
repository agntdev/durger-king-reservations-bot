import { inlineButton, inlineKeyboard } from "@agntdev/bot-toolkit";

export const PARTY_SIZE_PROMPT = "How many guests will be dining?";

export function buildPartySizeKeyboard(sizes: number[]) {
  if (sizes.length === 0) {
    return inlineKeyboard([]);
  }

  const rows = sizes.map((size) => [
    inlineButton(`${size} guest${size === 1 ? "" : "s"}`, `party:${size}`),
  ]);

  return inlineKeyboard(rows);
}