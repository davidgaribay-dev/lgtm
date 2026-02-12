import { drizzle as neonDrizzle } from "drizzle-orm/neon-http";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

const url = process.env.DATABASE_URL!;

// DEPLOYMENT_ENV=dev  → node-postgres for local Docker PostgreSQL
// DEPLOYMENT_ENV unset → neon-http for Vercel + NeonDB
export const db: PgDatabase<PgQueryResultHKT, typeof schema> =
  process.env.DEPLOYMENT_ENV === "dev"
    ? pgDrizzle(url, { schema })
    : neonDrizzle(url, { schema });
