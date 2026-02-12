import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function resetDatabase() {
  console.log("⚠️  WARNING: This will delete ALL data from the database!");
  console.log("Starting database reset in 3 seconds...");

  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    console.log("Dropping all tables...");

    // Drop all tables in correct order (respecting foreign keys)
    await sql`DROP SCHEMA public CASCADE`;
    await sql`CREATE SCHEMA public`;
    await sql`GRANT ALL ON SCHEMA public TO public`;

    console.log("✅ Database reset complete!");
    console.log("Run 'npm run db:push' or 'npm run db:migrate' to recreate tables");
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    process.exit(1);
  }
}

resetDatabase();
