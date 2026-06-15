import { ENV } from "./_core/env";
import { Pool } from "pg";

const DEFAULT_REFERRAL_PERCENT = 10;

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

function normalizeRefName(name: string) {
  return String(name || "").trim().toLowerCase();
}

function mapUserRow(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    openId: r.openid ?? r.openId,
    name: r.name ?? null,
    email: r.email ?? null,
    loginMethod: r.loginmethod ?? r.loginMethod ?? null,
    role: r.role ?? null,
    balance: typeof r.balance === "number" ? r.balance : Number(r.balance ?? 0),
    referredByUserId: r.referredbyuserid ?? r.referredByUserId ?? null,
    referralName: r.referralname ?? r.referralName ?? null,
    createdAt: r.createdat ?? r.createdAt ?? null,
    updatedAt: r.updatedat ?? r.updatedAt ?? null,
    lastSignedIn: r.lastsignedin ?? r.lastSignedIn ?? null,
  };
}

function mapUserProfileRow(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.userid ?? r.userId,
    location: r.location,
    deliveryAddress: r.deliveryaddress ?? r.deliveryAddress,
    createdAt: r.createdat ?? r.createdAt ?? null,
    updatedAt: r.updatedat ?? r.updatedAt ?? null,
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
    referralName: r.referralname ?? r.referralName ?? null,
    productType: r.producttype ?? r.productType ?? "small",
    price: r.price ?? 0,
    status: r.status ?? null,
    createdAt: r.createdat ?? r.createdAt ?? null,
    updatedAt: r.updatedat ?? r.updatedAt ?? null,
  };
}

function mapReferralRow(r: any) {
  if (!r) return null;
  return {
    name: r.name,
    type: r.type ?? "marketing",
    title: r.title ?? null,
    ownerUserId: r.owneruserid ?? r.ownerUserId ?? null,
    clicks: Number(r.clicks ?? 0),
    signups: Number(r.signups ?? 0),
    ordersBought: Number(r.ordersbought ?? r.ordersBought ?? 0),
    totalTopUp: Number(r.totaltopup ?? r.totalTopUp ?? 0),
    commissionPercent: Number(
      r.commissionpercent ?? r.commissionPercent ?? DEFAULT_REFERRAL_PERCENT
    ),
    commissionPaid: Number(r.commissionpaid ?? r.commissionPaid ?? 0),
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
      balance INTEGER NOT NULL DEFAULT 0,
      referredByUserId INTEGER,
      referralName VARCHAR(320),
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
      referralName VARCHAR(320),
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      createdAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updatedAt TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS referralLinks (
      name VARCHAR(320) PRIMARY KEY,
      type VARCHAR(32) NOT NULL DEFAULT 'marketing',
      title VARCHAR(320),
      ownerUserId INTEGER,
      clicks INTEGER NOT NULL DEFAULT 0,
      signups INTEGER NOT NULL DEFAULT 0,
      ordersBought INTEGER NOT NULL DEFAULT 0,
      totalTopUp INTEGER NOT NULL DEFAULT 0,
      commissionPercent INTEGER NOT NULL DEFAULT ${DEFAULT_REFERRAL_PERCENT},
      commissionPaid INTEGER NOT NULL DEFAULT 0,
      createdAt TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updatedAt TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS balance INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS referredByUserId INTEGER;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS referralName VARCHAR(320);

    ALTER TABLE orders ADD COLUMN IF NOT EXISTS referralName VARCHAR(320);

    ALTER TABLE orders ADD COLUMN IF NOT EXISTS productType VARCHAR(16) NOT NULL DEFAULT 'small';
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS price INTEGER NOT NULL DEFAULT 0;

    ALTER TABLE referralLinks ADD COLUMN IF NOT EXISTS type VARCHAR(32) NOT NULL DEFAULT 'marketing';
    ALTER TABLE referralLinks ADD COLUMN IF NOT EXISTS title VARCHAR(320);
    ALTER TABLE referralLinks ADD COLUMN IF NOT EXISTS ownerUserId INTEGER;
    ALTER TABLE referralLinks ADD COLUMN IF NOT EXISTS signups INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE referralLinks ADD COLUMN IF NOT EXISTS commissionPercent INTEGER NOT NULL DEFAULT ${DEFAULT_REFERRAL_PERCENT};
    ALTER TABLE referralLinks ADD COLUMN IF NOT EXISTS commissionPaid INTEGER NOT NULL DEFAULT 0;

    DELETE FROM referralLinks WHERE name = 'adamant-stars' AND type = 'marketing';
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

export async function ensureUserReferralLink(userId: number, email?: string | null) {
  const p = ensurePool();
  if (!p || !email) return null;
  await ensureSchema();

  const name = normalizeRefName(email);
  if (!name) return null;

  try {
    const res = await p.query(
      `INSERT INTO referralLinks (name, type, title, ownerUserId, commissionPercent)
       VALUES ($1, 'user', $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET
         type = 'user',
         title = EXCLUDED.title,
         ownerUserId = COALESCE(referralLinks.ownerUserId, EXCLUDED.ownerUserId),
         updatedAt = now()
       RETURNING *`,
      [name, email, userId, DEFAULT_REFERRAL_PERCENT]
    );
    return mapReferralRow(res.rows[0]);
  } catch (e) {
    console.warn("[Database] ensureUserReferralLink failed:", e);
    return null;
  }
}

export async function upsertUser(user: {
  openId: string;
  name?: string;
  email?: string;
  loginMethod?: string;
  role?: string;
  lastSignedIn?: Date;
}) {
  if (!user.openId) throw new Error("openId required");
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();

  try {
    const res = await p.query(
      `INSERT INTO users (openId, name, email, loginMethod, role, lastSignedIn)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (openId) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         loginMethod = EXCLUDED.loginMethod,
         lastSignedIn = EXCLUDED.lastSignedIn
       RETURNING *`,
      [
        user.openId,
        user.name ?? null,
        user.email ?? null,
        user.loginMethod ?? null,
        user.role ?? "user",
        user.lastSignedIn ?? new Date(),
      ]
    );

    const mapped = res.rows[0] ? mapUserRow(res.rows[0]) : null;

    if (mapped?.id && mapped?.email) {
      await ensureUserReferralLink(mapped.id, mapped.email);
    }

    return mapped;
  } catch (e) {
    console.warn("[Database] upsertUser failed:", e);
    pool = null;
    return null;
  }
}

export async function getUserByOpenId(openId: string) {
  const p = ensurePool();
  if (!p) return undefined;
  await ensureSchema();

  try {
    const res = await p.query(`SELECT * FROM users WHERE openId = $1 LIMIT 1`, [
      openId,
    ]);

    const user = res.rows[0] ? mapUserRow(res.rows[0]) : undefined;

    if (user?.id && user?.email) {
      await ensureUserReferralLink(user.id, user.email);
    }

    return user;
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

    const user = res.rows[0] ? mapUserRow(res.rows[0]) : undefined;

    if (user?.id && user?.email) {
      await ensureUserReferralLink(user.id, user.email);
    }

    return user;
  } catch (e) {
    console.warn("[Database] getUserById failed:", e);
    pool = null;
    return undefined;
  }
}

export async function getReferralInfo(name: string) {
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();

  const refName = normalizeRefName(name);
  if (!refName) return null;

  try {
    const link = await p.query(
      `SELECT * FROM referralLinks WHERE name = $1 LIMIT 1`,
      [refName]
    );

    if (!link.rows[0]) return null;

    const users = await p.query(
      `SELECT id, email, name, createdAt
       FROM users
       WHERE referralName = $1
       ORDER BY createdAt DESC`,
      [refName]
    );

    return {
      ...mapReferralRow(link.rows[0]),
      referredUsers: users.rows.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdat ?? u.createdAt,
      })),
    };
  } catch (e) {
    console.warn("[Database] getReferralInfo failed:", e);
    return null;
  }
}

export async function setReferralLink(
  name: string,
  title?: string,
  commissionPercent = DEFAULT_REFERRAL_PERCENT
) {
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();

  const refName = normalizeRefName(name);
  if (!refName) return null;

  try {
    const res = await p.query(
      `INSERT INTO referralLinks (name, type, title, commissionPercent)
       VALUES ($1, 'marketing', $2, $3)
       ON CONFLICT (name) DO UPDATE SET
         title = COALESCE(EXCLUDED.title, referralLinks.title),
         commissionPercent = EXCLUDED.commissionPercent,
         updatedAt = now()
       RETURNING *`,
      [refName, title ?? refName, commissionPercent]
    );

    return mapReferralRow(res.rows[0]);
  } catch (e) {
    console.warn("[Database] setReferralLink failed:", e);
    return null;
  }
}

export async function recordReferralClick(name: string) {
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();

  const refName = normalizeRefName(name);
  if (!refName) return null;

  try {
    const res = await p.query(
      `UPDATE referralLinks
       SET clicks = clicks + 1, updatedAt = now()
       WHERE name = $1
       RETURNING *`,
      [refName]
    );

    return res.rows[0] ? mapReferralRow(res.rows[0]) : null;
  } catch (e) {
    console.warn("[Database] recordReferralClick failed:", e);
    return null;
  }
}

export async function attachReferralToNewUser(userId: number, name: string) {
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();

  const refName = normalizeRefName(name);
  if (!refName) return null;

  try {
    const link = await p.query(
      `SELECT * FROM referralLinks WHERE name = $1 LIMIT 1`,
      [refName]
    );

    const ref = mapReferralRow(link.rows[0]);
    if (!ref) return null;

    if (ref.type === "user" && ref.ownerUserId === userId) {
      return { attached: false, reason: "self_referral", referral: ref };
    }

    const current = await p.query(
      `SELECT referralName FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    const alreadyHasReferral =
      current.rows[0]?.referralname ?? current.rows[0]?.referralName ?? null;

    if (alreadyHasReferral) {
      return { attached: false, reason: "already_registered", referral: ref };
    }

    await p.query(
      `UPDATE users
       SET referralName = $2, referredByUserId = $3, updatedAt = now()
       WHERE id = $1`,
      [userId, refName, ref.ownerUserId]
    );

    await p.query(
      `UPDATE referralLinks
       SET signups = signups + 1, updatedAt = now()
       WHERE name = $1`,
      [refName]
    );

    return { attached: true, referral: ref };
  } catch (e) {
    console.warn("[Database] attachReferralToNewUser failed:", e);
    return null;
  }
}

export async function recordReferralOrder(name: string | null | undefined) {
  if (!name) return null;

  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();

  const refName = normalizeRefName(name);
  if (!refName) return null;

  try {
    const res = await p.query(
      `UPDATE referralLinks
       SET ordersBought = ordersBought + 1, updatedAt = now()
       WHERE name = $1
       RETURNING *`,
      [refName]
    );

    return res.rows[0] ? mapReferralRow(res.rows[0]) : null;
  } catch (e) {
    console.warn("[Database] recordReferralOrder failed:", e);
    return null;
  }
}

export async function recordUserTopUp(userId: number, amount: number) {
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();

  const topUpAmount = Math.max(0, Math.floor(Number(amount || 0)));
  if (topUpAmount <= 0) return null;

  try {
    await p.query(
      `UPDATE users SET balance = balance + $2, updatedAt = now() WHERE id = $1`,
      [userId, topUpAmount]
    );

    const userRes = await p.query(
      `SELECT referralName, referredByUserId FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    const referralName =
      userRes.rows[0]?.referralname ?? userRes.rows[0]?.referralName ?? null;

    const referredByUserId =
      userRes.rows[0]?.referredbyuserid ??
      userRes.rows[0]?.referredByUserId ??
      null;

    if (!referralName) {
      return { amount: topUpAmount, commission: 0 };
    }

    const refRes = await p.query(
      `SELECT * FROM referralLinks WHERE name = $1 LIMIT 1`,
      [referralName]
    );

    const ref = mapReferralRow(refRes.rows[0]);
    if (!ref) {
      return { amount: topUpAmount, commission: 0 };
    }

    const commission = Math.floor((topUpAmount * ref.commissionPercent) / 100);

    await p.query(
      `UPDATE referralLinks
       SET totalTopUp = totalTopUp + $2,
           commissionPaid = commissionPaid + $3,
           updatedAt = now()
       WHERE name = $1`,
      [referralName, topUpAmount, commission]
    );

    if (referredByUserId && commission > 0) {
      await p.query(
        `UPDATE users SET balance = balance + $2, updatedAt = now() WHERE id = $1`,
        [referredByUserId, commission]
      );
    }

    return { amount: topUpAmount, commission, referralName };
  } catch (e) {
    console.warn("[Database] recordUserTopUp failed:", e);
    return null;
  }
}

export async function chargeUserBalance(userId: number, amount: number) {
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();

  const charge = Math.max(0, Math.floor(Number(amount || 0)));

  if (charge <= 0) {
    return { ok: true, balance: 0, charged: 0 };
  }

  try {
    const res = await p.query(
      `UPDATE users SET balance = balance - $2, updatedAt = now() WHERE id = $1 AND balance >= $2 RETURNING balance`,
      [userId, charge]
    );

    if (res.rows.length === 0) {
      const current = await p.query(
        `SELECT balance FROM users WHERE id = $1 LIMIT 1`,
        [userId]
      );

      return {
        ok: false,
        balance: Number(current.rows[0]?.balance ?? 0),
        charged: 0,
      };
    }

    return {
      ok: true,
      balance: Number(res.rows[0]?.balance ?? 0),
      charged: charge,
    };
  } catch (e) {
    console.warn("[Database] chargeUserBalance failed:", e);
    return null;
  }
}

export async function refundUserBalance(userId: number, amount: number) {
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();

  const refund = Math.max(0, Math.floor(Number(amount || 0)));
  if (refund <= 0) return null;

  try {
    await p.query(
      `UPDATE users SET balance = balance + $2, updatedAt = now() WHERE id = $1`,
      [userId, refund]
    );

    return true;
  } catch (e) {
    console.warn("[Database] refundUserBalance failed:", e);
    return null;
  }
}

export async function clearReferralTopUp(name: string) {
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();

  const refName = normalizeRefName(name);
  if (!refName) return null;

  try {
    const res = await p.query(
      `UPDATE referralLinks
       SET totalTopUp = 0, updatedAt = now()
       WHERE name = $1
       RETURNING *`,
      [refName]
    );

    return res.rows[0] ? mapReferralRow(res.rows[0]) : null;
  } catch (e) {
    console.warn("[Database] clearReferralTopUp failed:", e);
    return null;
  }
}

export async function getOverallRefInfo() {
  const p = ensurePool();

  if (!p) {
    return {
      users: 0,
      ordersBought: 0,
      totalTopUp: 0,
      commissionPaid: 0,
      links: [],
    };
  }

  await ensureSchema();

  try {
    const users = await p.query(`SELECT COUNT(*)::int AS count FROM users`);
    const orders = await p.query(`SELECT COUNT(*)::int AS count FROM orders`);

    const totals = await p.query(
      `SELECT
         COALESCE(SUM(totalTopUp), 0)::int AS totalTopUp,
         COALESCE(SUM(commissionPaid), 0)::int AS commissionPaid
       FROM referralLinks`
    );

    const links = await p.query(`SELECT * FROM referralLinks ORDER BY createdAt DESC`);

    return {
      users: Number(users.rows[0]?.count ?? 0),
      ordersBought: Number(orders.rows[0]?.count ?? 0),
      totalTopUp: Number(totals.rows[0]?.totaltopup ?? totals.rows[0]?.totalTopUp ?? 0),
      commissionPaid: Number(
        totals.rows[0]?.commissionpaid ?? totals.rows[0]?.commissionPaid ?? 0
      ),
      links: links.rows.map(mapReferralRow),
    };
  } catch (e) {
    console.warn("[Database] getOverallRefInfo failed:", e);

    return {
      users: 0,
      ordersBought: 0,
      totalTopUp: 0,
      commissionPaid: 0,
      links: [],
    };
  }
}

export async function createOrder(data: any) {
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();

  try {
    const userRes = await p.query(
      `SELECT referralName FROM users WHERE id = $1 LIMIT 1`,
      [data.userId]
    );

    const userReferralName =
      userRes.rows[0]?.referralname ?? userRes.rows[0]?.referralName ?? null;

    const referralName = userReferralName ? normalizeRefName(userReferralName) : null;
    const validReferral = referralName ? await getReferralInfo(referralName) : null;
    const storedReferralName = validReferral ? referralName : null;

    const res = await p.query(
      `INSERT INTO orders (
        userId,
        location,
        day,
        month,
        year,
        hour,
        minute,
        mainTitle,
        line1,
        line2,
        message,
        contactNumber,
        hideTime,
        deliveryAddress,
        referralName,
        status,
        productType,
        price
      )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        data.userId,
        data.location,
        data.day,
        data.month,
        data.year,
        data.hour,
        data.minute,
        data.mainTitle,
        data.line1,
        data.line2,
        data.message ?? null,
        data.contactNumber ?? null,
        data.hideTime ? true : false,
        data.deliveryAddress,
        storedReferralName,
        data.status ?? "pending",
        data.productType ?? "small",
        data.price ?? 0,
      ]
    );

    if (storedReferralName) {
      await recordReferralOrder(storedReferralName);
    }

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
    const res = await p.query(
      `SELECT * FROM orders WHERE userId = $1 ORDER BY createdAt DESC`,
      [userId]
    );

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
    const res = await p.query(
      `SELECT * FROM userProfiles WHERE userId = $1 LIMIT 1`,
      [userId]
    );

    return res.rows[0] ? mapUserProfileRow(res.rows[0]) : null;
  } catch (e) {
    console.error("[Database] getUserProfile failed:", e);
    return null;
  }
}

export async function upsertUserProfile(data: {
  userId: number;
  location: string;
  deliveryAddress: string;
}) {
  const p = ensurePool();
  if (!p) return null;
  await ensureSchema();

  try {
    await p.query(
      `INSERT INTO userProfiles (userId, location, deliveryAddress, createdAt, updatedAt)
       VALUES ($1,$2,$3,now(),now())
       ON CONFLICT (userId) DO UPDATE SET
         location = EXCLUDED.location,
         deliveryAddress = EXCLUDED.deliveryAddress,
         updatedAt = now()`,
      [data.userId, data.location, data.deliveryAddress]
    );

    return await getUserProfile(data.userId);
  } catch (e) {
    console.error("[Database] upsertUserProfile failed:", e);
    throw e;
  }
}

export { getPool as getDb };