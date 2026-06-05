import { getDb } from "./db";
import { users, userProfiles, orders } from "../drizzle/schema";

async function clearDatabase() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  try {
    console.log("Clearing database...");

    // Delete in order to respect foreign key constraints
    await db.delete(orders);
    console.log("✓ Cleared orders table");

    await db.delete(userProfiles);
    console.log("✓ Cleared userProfiles table");

    await db.delete(users);
    console.log("✓ Cleared users table");

    console.log("Database cleared successfully!");
  } catch (error) {
    console.error("Error clearing database:", error);
    process.exit(1);
  }
}

clearDatabase();
