import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { reset } from "drizzle-seed";
import * as schema from "../db/schema";
import { seedAllData } from "../lib/demo-seed-data";

config({ path: ".env.local" });

if (process.env.NEXT_PUBLIC_IS_DEMO !== "true") {
  console.error("Seed script only runs when NEXT_PUBLIC_IS_DEMO=true");
  process.exit(1);
}

async function seedDatabase() {
  const db = drizzle(process.env.DATABASE_URL!, { schema });

  try {
    console.log("Resetting database...");
    await reset(db, schema);

    console.log("Seeding demo data (10 users, 3 teams, 60 test cases, ...)");
    const result = await seedAllData(db);

    console.log("Database seeded successfully");
    console.log(`   Demo login: demo@lgtm.dev / demodemo1234`);
    console.log(`   User ID:    ${result.userId}`);
    console.log(`   Org ID:     ${result.orgId}`);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

seedDatabase();
