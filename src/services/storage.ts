import {
  resolveSessionStorage,
  MemorySessionStorage,
} from "@agntdev/bot-toolkit";
import type { StorageAdapter } from "grammy";

let _storage: StorageAdapter<unknown> | null = null;

export function getPersistentStorage(): StorageAdapter<unknown> {
  if (!_storage) {
    _storage = resolveSessionStorage(undefined) as unknown as StorageAdapter<unknown>;
  }
  return _storage!;
}

export function resetPersistentStorage(): void {
  _storage = new MemorySessionStorage();
}

const BKG_PREFIX = "bkg:";
const IDX_PREFIX = "idx:";
const SCHED_PREFIX = "sch:";

export function bookingKey(id: string): string {
  return `${BKG_PREFIX}${id}`;
}

export function nextNumKey(): string {
  return `${BKG_PREFIX}nextNum`;
}

export function dateIndexKey(date: string): string {
  return `${IDX_PREFIX}date:${date}`;
}

export function guestIndexKey(telegramId: number): string {
  return `${IDX_PREFIX}guest:${telegramId}`;
}

export function scheduleJobKey(id: string): string {
  return `${SCHED_PREFIX}${id}`;
}

export function scheduleJobIdsKey(): string {
  return `${SCHED_PREFIX}ids`;
}
