import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "@/db/schema";

export type SeedDb = PgDatabase<PgQueryResultHKT, typeof schema>;

export const DEMO_PASSWORD = "demodemo1234";

/** Returns a Date `n` days before now (negative = future). */
export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

/** Returns a Date `n` hours before now. */
export function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3_600_000);
}

/** Shorthand for crypto.randomUUID() */
export function uid(): string {
  return crypto.randomUUID();
}
