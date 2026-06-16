import { defaultRedisStorage, MemorySessionStorage } from "@agntdev/bot-toolkit";
import type { StorageAdapter } from "grammy";

export interface ScheduledJob {
  id: string;
  runAt: number;
  bookingId: string;
  guestTelegramId: number;
  sent: boolean;
}

const JOB_PREFIX = "job:";

function createJobStore(): StorageAdapter<ScheduledJob> {
  const url = process.env.REDIS_URL;
  if (url) {
    return defaultRedisStorage<ScheduledJob>(url);
  }
  return new MemorySessionStorage<ScheduledJob>();
}

const jobStore: StorageAdapter<ScheduledJob> = createJobStore();

function jobKey(id: string): string {
  return `${JOB_PREFIX}${id}`;
}

async function storeJob(id: string, job: ScheduledJob): Promise<void> {
  await jobStore.write(jobKey(id), job);
}

async function loadJob(id: string): Promise<ScheduledJob | undefined> {
  return jobStore.read(jobKey(id));
}

async function removeJob(id: string): Promise<void> {
  await jobStore.delete(jobKey(id));
}

async function allJobs(): Promise<ScheduledJob[]> {
  if (!jobStore.readAllKeys) {
    return [];
  }
  const raw = jobStore.readAllKeys();
  const keys: string[] = [];
  if (Symbol.asyncIterator in Object(raw)) {
    for await (const key of raw as AsyncIterable<string>) {
      if (typeof key === "string" && key.startsWith(JOB_PREFIX)) {
        keys.push(key);
      }
    }
  } else {
    for (const key of raw as Iterable<string>) {
      if (typeof key === "string" && key.startsWith(JOB_PREFIX)) {
        keys.push(key);
      }
    }
  }
  const jobs: ScheduledJob[] = [];
  for (const key of keys) {
    const job = await jobStore.read(key);
    if (job) {
      jobs.push(job);
    }
  }
  return jobs;
}

export async function scheduleJob(
  job: Omit<ScheduledJob, "sent">,
): Promise<ScheduledJob> {
  const scheduled: ScheduledJob = { ...job, sent: false };
  await storeJob(job.id, scheduled);
  return scheduled;
}

export async function cancelJob(id: string): Promise<void> {
  await removeJob(id);
}

export async function listPendingJobsForGuest(
  guestTelegramId: number,
): Promise<ScheduledJob[]> {
  const jobs = await allJobs();
  return jobs.filter(
    (job) => job.guestTelegramId === guestTelegramId && !job.sent,
  );
}

export async function listPendingJobs(): Promise<ScheduledJob[]> {
  const jobs = await allJobs();
  return jobs.filter((job) => !job.sent);
}

export async function listDueJobs(now = Date.now()): Promise<ScheduledJob[]> {
  const jobs = await allJobs();
  return jobs.filter((job) => !job.sent && job.runAt <= now);
}

export async function markJobSent(id: string): Promise<void> {
  const job = await loadJob(id);
  if (job) {
    job.sent = true;
    await storeJob(id, job);
  }
}
