import { readFile } from "node:fs/promises";
import { matchArea } from "../areas";
import { waitlistStorePath } from "../waitlist-store";

export type NeighbourhoodCount = {
  name: string;
  customers: number;
  cleaners: number;
};

export type WaitlistSummary =
  | {
      status: "ok";
      confirmedCustomers: number;
      confirmedCleaners: number;
      unconfirmedReserves: number;
      neighbourhoods: NeighbourhoodCount[];
    }
  | { status: "absent"; reason: string }
  | { status: "unavailable"; reason: string };

function emptyCounts(): Map<string, NeighbourhoodCount> {
  return new Map();
}

export async function summarizeWaitlist(env: NodeJS.ProcessEnv = process.env): Promise<WaitlistSummary> {
  const filePath = waitlistStorePath(env);
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { status: "absent", reason: "No waitlist file in this environment. Customer and cleaner counts are unavailable." };
    }
    return { status: "unavailable", reason: "The waitlist file could not be read." };
  }
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    return { status: "unavailable", reason: "The waitlist file could not be read." };
  }
  if (typeof data !== "object" || data === null || !("entries" in data)) {
    return { status: "unavailable", reason: "The waitlist file could not be read." };
  }
  const entries = (data as { entries?: unknown }).entries;
  if (typeof entries !== "object" || entries === null) {
    return { status: "unavailable", reason: "The waitlist file could not be read." };
  }
  let confirmedCustomers = 0;
  let confirmedCleaners = 0;
  let unconfirmedReserves = 0;
  const counts = emptyCounts();
  for (const value of Object.values(entries)) {
    if (typeof value !== "object" || value === null) {
      return { status: "unavailable", reason: "The waitlist file could not be read." };
    }
    const row = value as { type?: unknown; pendingUntil?: unknown; neighbourhoods?: unknown };
    const pending = row.pendingUntil != null;
    if (pending) {
      unconfirmedReserves += 1;
      continue;
    }
    const bucket = row.type === "customer" ? "customers" : row.type === "cleaner" ? "cleaners" : null;
    if (!bucket) return { status: "unavailable", reason: "The waitlist file could not be read." };
    if (bucket === "customers") confirmedCustomers += 1;
    else confirmedCleaners += 1;
    const names = Array.isArray(row.neighbourhoods) ? row.neighbourhoods : [];
    const seen = new Set<string>();
    for (const name of names) {
      if (typeof name !== "string") continue;
      const matched = matchArea(name);
      if (!matched || seen.has(matched)) continue;
      seen.add(matched);
      const current = counts.get(matched) ?? { name: matched, customers: 0, cleaners: 0 };
      current[bucket] += 1;
      counts.set(matched, current);
    }
  }
  return {
    status: "ok",
    confirmedCustomers,
    confirmedCleaners,
    unconfirmedReserves,
    neighbourhoods: [...counts.values()],
  };
}
