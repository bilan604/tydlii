export const JOB_STATUSES = ["enroute", "arrived", "cleaning", "done"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  enroute: "En route",
  arrived: "Arrived",
  cleaning: "Cleaning",
  done: "Done",
};

/** GPS is allowed only while the job is active. Done stops the stream. */
export function isGpsActive(status: JobStatus): boolean {
  return status !== "done";
}

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return JOB_STATUSES.indexOf(to) === JOB_STATUSES.indexOf(from) + 1;
}

/** Move one step forward. Any other request stays put, including skips and Done. */
export function transitionJobStatus(from: JobStatus, to: JobStatus): JobStatus {
  return canTransition(from, to) ? to : from;
}

export function advanceJobStatus(from: JobStatus): JobStatus {
  const index = JOB_STATUSES.indexOf(from);
  return index < JOB_STATUSES.length - 1 ? JOB_STATUSES[index + 1] : from;
}
