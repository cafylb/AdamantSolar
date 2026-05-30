import { ENV } from "./_core/env";
import { Pool } from "pg";

let pool: Pool | null = null;

function ensurePool(): Pool | null {
  if (pool) return pool;
  const connectionString = ENV.databaseUrl;
  if (!connectionString) return null;
  pool = new Pool({ connectionString });
  pool.on("error", (err: unknown) => {
    console.error("Postgres pool error:", err);
    pool = null;
  });
  return pool;
}

// Map lowercased / snakecased SQL column names to camelCase JS fields.
function mapUserRow(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    openId: r.openid ?? r.openId,
    name: r.name ?? null,
    email: r.email ?? null,
    loginMethod: r.loginmethod ?? r.loginMethod ?? null,
    role: r.role ?? null,
    createdAt: r.createdat ?? r.createdAt ?? null,
    updatedAt: r.updatedat ?? r.updatedAt ?? null,
    lastSignedIn: r.lastsignedin ?? r.lastSignedIn ?? null,
  };
}

function mapOrderRow(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.userid ?? r.userId,
    location: r.location,
    day: r.day,
    month: r.month,
    year: r.year,
    hour: r.hour,
    minute: r.minute,
    mainTitle: r.maintitle ?? r.mainTitle,
    line1: r.line1,
    line2: r.line2,
    message: r.message ?? null,
    contactNumber: r.contactnumber ?? r.contactNumber ?? null,
    hideTime: r.hidetime ?? r.hideTime ?? false,
    deliveryAddress: r.deliveryaddress ?? r.deliveryAddress ?? null,
    status: r.status ?? null,
    createdAt: r.createdat ?? r.createdAt ?? null,
    updatedAt: r.updatedat ?? r.updatedAt ?? null,
  };
}

async function ensureSchema() {
  const p = ensurePool();
  if (!p) return;
  await p.query(`
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

    CREATE TABLE IF NOT EXISTS userProfiles (
      id SERIAL PRIMARY KEY,
      userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      location VARCHAR(255) NOT NULL,
      deliveryAddress VARCHAR(500) NOT NULL,
      createdAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updatedAt TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS userProfiles_userId_unique_idx ON userProfiles (userId);

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
}

export async function getPool(): Promise<Pool | null> {
  const p = ensurePool();
  if (!p) return null;
  try {
    await ensureSchema();
  } catch (e) {
    console.warn("[Database] Failed to ensure schema:", e);
  }
  return p;
}

export async function upsertUser(user: { openId: string; name?: string; email?: string; loginMethod?: string; role?: string; lastSignedIn?: Date; }) {
  if (!user.openId) throw new Error("openId required");
  const p = ensurePool();
  if (!p) return;
  await ensureSchema();
  try {
    await p.query(
      `INSERT INTO users (openId, name, email, loginMethod, role, lastSignedIn)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (openId) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, loginMethod = EXCLUDED.loginMethod, lastSignedIn = EXCLUDED.lastSignedIn`,
      [user.openId, user.name ?? null, user.email ?? null, user.loginMethod ?? null, user.role ?? 'user', user.lastSignedIn ?? new Date()]
    );
  } catch (e) {
    console.warn("[Database] upsertUser failed:", e);
    pool = null;
  }
}

export async function getUserByOpenId(openId: string) {
  const p = ensurePool();
  if (!p) return undefined;
  await ensureSchema();
  try {
    const res = await p.query(`SELECT * FROM users WHERE openId = $1 LIMIT 1`, [openId]);
    return res.rows[0] ? mapUserRow(res.rows[0]) : undefined;
  } catch (e) {
    console.warn("[Database] getUserByOpenId failed:", e);
    pool = null;
    return undefined;
  }
}

export async function getUserById(id: number) {
  const p = ensurePool();
  if (!p) return undefined;
  await ensureSchema();
  try {
    const res = await p.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
    return res.rows[0] ? mapUserRow(res.rows[0]) : undefined;
  } catch (e) {
    console.warn("[Database] getUserById failed:", e);
    pool = null;
    return undefined;
  }
}

export async function createOrder(data: any) {
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();
  try {
    const res = await p.query(
      `INSERT INTO orders (userId, location, day, month, year, hour, minute, mainTitle, line1, line2, message, contactNumber, hideTime, deliveryAddress, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [data.userId, data.location, data.day, data.month, data.year, data.hour, data.minute, data.mainTitle, data.line1, data.line2, data.message ?? null, data.contactNumber ?? null, data.hideTime ? true : false, data.deliveryAddress, data.status ?? 'pending']
    );
    return mapOrderRow(res.rows[0]) ?? null;
  } catch (e) {
    console.error("[Database] createOrder failed:", e);
    throw e;
  }
}

export async function getOrdersByUserId(userId: number) {
  const p = ensurePool();
  if (!p) return [];
  await ensureSchema();
  try {
    const res = await p.query(`SELECT * FROM orders WHERE userId = $1 ORDER BY createdAt DESC`, [userId]);
    return res.rows.map(mapOrderRow);
  } catch (e) {
    console.error("[Database] getOrdersByUserId failed:", e);
    return [];
  }
}

export async function getUserProfile(userId: number) {
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();
  try {
    const res = await p.query(`SELECT * FROM userProfiles WHERE userId = $1 LIMIT 1`, [userId]);
    return res.rows[0] ? mapUserRow(res.rows[0]) : null;
  } catch (e) {
    console.error("[Database] getUserProfile failed:", e);
    return null;
  }
}

export async function upsertUserProfile(data: { userId: number; location: string; deliveryAddress: string }) {
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();
  try {
    await p.query(
      `INSERT INTO userProfiles (userId, location, deliveryAddress, createdAt, updatedAt)
       VALUES ($1,$2,$3,now(),now())
       ON CONFLICT (userId) DO UPDATE SET location = EXCLUDED.location, deliveryAddress = EXCLUDED.deliveryAddress, updatedAt = now()`,
      [data.userId, data.location, data.deliveryAddress]
    );
    return await getUserProfile(data.userId);
  } catch (e) {
    console.error("[Database] upsertUserProfile failed:", e);
    throw e;
  }
}

export { getPool as getDb };
