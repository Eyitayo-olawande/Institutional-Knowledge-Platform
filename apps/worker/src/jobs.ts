// Background job registry. Jobs are added by later work packages
// (notifications in E6, change alerts in E10, evidence packs in E12).
// The job queue itself is chosen in ADR 0006.

export interface Job {
  readonly name: string;
  run(): Promise<void>;
}

export function createRegistry(jobs: readonly Job[] = []): ReadonlyMap<string, Job> {
  const registry = new Map<string, Job>();
  for (const job of jobs) {
    if (registry.has(job.name)) {
      throw new Error(`Duplicate job name: ${job.name}`);
    }
    registry.set(job.name, job);
  }
  return registry;
}
