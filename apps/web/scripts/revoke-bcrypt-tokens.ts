import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function revokeBcryptTokens() {
  try {
    await sql`
      UPDATE api_token
      SET status = 'revoked', deleted_at = NOW(), updated_at = NOW()
      WHERE deleted_at IS NULL
    `;
    console.log("Revoked all existing bcrypt-hashed tokens.");
    console.log("Users must regenerate their API tokens (now using SHA-256).");
  } catch (error) {
    console.error("Error revoking tokens:", error);
    process.exit(1);
  }
}

revokeBcryptTokens();
