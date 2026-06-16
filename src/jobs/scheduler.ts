export interface ScheduledJob {
  id: string;
  runAt: number;
  bookingId: string;
  guestTelegramId: number;
  sent: boolean;
}

const jobs: ScheduledJob[] = [];

export function scheduleJob(
  job: Omit<ScheduledJob, "sent">,
): ScheduledJob {
  const existingIndex = jobs.findIndex((entry) => entry.id === job.id);
  const scheduled: ScheduledJob = { ...job, sent: false };

  if (existingIndex >= 0) {
    jobs[existingIndex] = scheduled;
    return scheduled;
  }

  jobs.push(scheduled);
  return scheduled;
}

export function cancelJob(id: string): void {
  const index = jobs.findIndex((entry) => entry.id === id);
  if (index >= 0) {
    jobs.splice(index, 1);
  }
}

export function listPendingJobsForGuest(guestTelegramId: number): ScheduledJob[] {
  return jobs.filter(
    (job) => job.guestTelegramId === guestTelegramId && !job.sent,
  );
}

export function listPendingJobs(): ScheduledJob[] {
  return jobs.filter((job) => !job.sent);
}

export function listDueJobs(now = Date.now()): ScheduledJob[] {
  return jobs.filter((job) => !job.sent && job.runAt <= now);
}

export function markJobSent(id: string): void {
  const job = jobs.find((entry) => entry.id === id);
  if (job) {
    job.sent = true;
  }
}