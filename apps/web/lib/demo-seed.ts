import { db } from "@/db";
import * as schema from "@/db/schema";
import { reset } from "drizzle-seed";
import { seedAllData } from "./demo-seed-data";

export async function resetAndSeed() {
  await reset(db, schema);
  return seedAllData(db);
}
