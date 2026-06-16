import {
  getPersistentStorage,
  scheduleJobKey,
  scheduleJobIdsKey,
} from "../services/storage";

export interface ScheduledJob {
  id: string;
  runAt: number;
  bookingId: string;
  guestTelegramId: number;
  sent: boolean;
}

async function readJobIds(): Promise<string[]> {
  const storage = getPersistentStorage();
  const raw = await storage.read(scheduleJobIdsKey());
  if (Array.isArray(raw)) return raw as string[];
  return [];
}

async function writeJobIds(ids: string[]): Promise<void> {
  const storage = getPersistentStorage();
  await storage.write(scheduleJobIdsKey(), ids);
}

async function readJob(id: string): Promise<ScheduledJob | undefined> {
  const storage = getPersistentStorage();
  const raw = await storage.read(scheduleJobKey(id));
  if (!raw) return undefined;
  return raw as ScheduledJob;
}

async function writeJob(job: ScheduledJob): Promise<void> {
  const storage = getPersistentStorage();
  await storage.write(scheduleJobKey(job.id), job);
}

async function deleteJobKey(id: string): Promise<void> {
  const storage = getPersistentStorage();
  await storage.delete(scheduleJobKey(id));
}

export async function scheduleJob(
  job: Omit<ScheduledJob, "sent">,
): Promise<ScheduledJob> {
  const scheduled: ScheduledJob = { ...job, sent: false };

  const ids = await readJobIds();
  if (!ids.includes(job.id)) {
    ids.push(job.id);
    await writeJobIds(ids);
  }

  await writeJob(scheduled);
  return scheduled;
}

export async function cancelJob(id: string): Promise<void> {
  const ids = await readJobIds();
  const filtered = ids.filter((entry) => entry !== id);
  if (filtered.length !== ids.length) {
    await writeJobIds(filtered);
  }
  await deleteJobKey(id);
}

export async function listPendingJobsForGuest(
  guestTelegramId: number,
): Promise<ScheduledJob[]> {
  const ids = await readJobIds();
  const results: ScheduledJob[] = [];
  for (const id of ids) {
    const job = await readJob(id);
    if (job && job.guestTelegramId === guestTelegramId && !job.sent) {
      results.push(job);
    }
  }
  return results;
}

export async function listPendingJobs(): Promise<ScheduledJob[]> {
  const ids = await readJobIds();
  const results: ScheduledJob[] = [];
  for (const id of ids) {
    const job = await readJob(id);
    if (job && !job.sent) {
      results.push(job);
    }
  }
  return results;
}

export async function listDueJobs(
  now = Date.now(),
): Promise<ScheduledJob[]> {
  const ids = await readJobIds();
  const results: ScheduledJob[] = [];
  for (const id of ids) {
    const job = await readJob(id);
    if (job && !job.sent && job.runAt <= now) {
      results.push(job);
    }
  }
  return results;
}

export async function markJobSent(id: string): Promise<void> {
  const job = await readJob(id);
  if (job) {
    job.sent = true;
    await writeJob(job);
  }
}
