import { Pool } from "pg";
import { ENV } from "./_core/env";
import "dotenv/config.js";

const connectionString = process.env.DATABASE_URL || ENV.databaseUrl;

if (!connectionString) {
  console.error("❌ DATABASE_URL is not set!");
  console.error("Make sure DATABASE_URL is defined in .env file");
  process.exit(1);
}

const pool = new Pool({ connectionString });

export async function clearDatabase() {
  const client = await pool.connect();
  try {
    console.log("🗑️  Clearing entire database...");
    
    // Disable foreign key constraints temporarily
    await client.query("SET CONSTRAINTS ALL DEFERRED");
    
    // Drop all tables in correct order
    await client.query("DROP TABLE IF EXISTS orders CASCADE");
    await client.query("DROP TABLE IF EXISTS userProfiles CASCADE");
    await client.query("DROP TABLE IF EXISTS users CASCADE");
    
    console.log("✅ Database cleared successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function clearOrders() {
  const client = await pool.connect();
  try {
    console.log("🗑️  Clearing orders table...");
    
    const result = await client.query("DELETE FROM orders");
    console.log(`✅ Deleted ${result.rowCount} orders`);
    return result.rowCount;
  } catch (error) {
    console.error("❌ Error clearing orders:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function clearUsers() {
  const client = await pool.connect();
  try {
    console.log("🗑️  Clearing users table...");
    
    const result = await client.query("DELETE FROM users CASCADE");
    console.log(`✅ Deleted ${result.rowCount} users`);
    return result.rowCount;
  } catch (error) {
    console.error("❌ Error clearing users:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function createDatabase() {
  const client = await pool.connect();
  try {
    console.log("🔨 Creating/restoring database schema...");
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        openId VARCHAR(128) NOT NULL UNIQUE,
        name TEXT,
        email VARCHAR(320),
        loginMethod VARCHAR(64),
        role VARCHAR(32) NOT NULL DEFAULT 'user',
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updatedAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
        lastSignedIn TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);
    
    // Create userProfiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS userProfiles (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        location VARCHAR(255) NOT NULL,
        deliveryAddress VARCHAR(500) NOT NULL,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updatedAt TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);
    
    // Create unique index on userProfiles
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS userProfiles_userId_unique_idx ON userProfiles (userId);
    `);
    
    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        location VARCHAR(255) NOT NULL,
        day INTEGER NOT NULL,
        month VARCHAR(20) NOT NULL,
        year INTEGER NOT NULL,
        hour INTEGER NOT NULL,
        minute INTEGER NOT NULL,
        mainTitle VARCHAR(255) NOT NULL,
        line1 VARCHAR(255) NOT NULL,
        line2 VARCHAR(255) NOT NULL,
        message TEXT,
        contactNumber VARCHAR(64),
        hideTime BOOLEAN NOT NULL DEFAULT false,
        deliveryAddress VARCHAR(500) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updatedAt TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);
    
    console.log("✅ Database schema created/restored successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error creating database:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function resetDatabase() {
  try {
    console.log("🔄 Resetting database...");
    await clearDatabase();
    await createDatabase();
    console.log("✅ Database reset successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    throw error;
  }
}

// Run command based on process.argv
async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case "clear":
        await clearDatabase();
        break;
      case "clear:orders":
        await clearOrders();
        break;
      case "clear:users":
        await clearUsers();
        break;
      case "create":
        await createDatabase();
        break;
      case "reset":
        await resetDatabase();
        break;
      default:
        console.log(`
Available commands:
  clear        - Clear entire database
  clear:orders - Clear orders table only
  clear:users  - Clear users table only
  create       - Create/restore database schema
  reset        - Clear and recreate entire database
        `);
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
