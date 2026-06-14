import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./auth";
import { registerOAuthRoutes } from "./oauth";
import { sdk } from "./sdk";
import {
  clearReferralTopUp,
  getOverallRefInfo,
  getPool,
  getReferralInfo,
  recordReferralClick,
  recordUserTopUp,
  setReferralLink,
} from "../db";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerAuthRoutes(app);

  app.get("/api/debug/orders", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const p = await getPool();

      if (!p) {
        return res.status(500).json({ error: "database unavailable" });
      }

      const rows = await p.query(
        "SELECT * FROM orders WHERE userId = $1 ORDER BY createdAt DESC",
        [user.id]
      );

      return res.json({
        user: {
          id: user.id,
          openId: user.openId,
          name: user.name,
        },
        orders: rows.rows,
      });
    } catch (err) {
      return res.status(401).json({ error: "unauthenticated" });
    }
  });

  app.get("/api/ref/get", async (_req, res) => {
    const info = await getOverallRefInfo();
    res.json(info);
  });

  app.get("/api/ref/get/:name", async (req, res) => {
    const info = await getReferralInfo(req.params.name);

    if (!info) {
      return res.status(404).json({ error: "ref link not found" });
    }

    res.json(info);
  });

  app.get("/api/ref/clear/:name", async (req, res) => {
    const info = await clearReferralTopUp(req.params.name);

    if (!info) {
      return res.status(404).json({ error: "ref link not found" });
    }

    res.json(info);
  });

  app.get("/api/ref/set/:name", async (req, res) => {
    const name = String(req.params.name || "").trim();

    if (!/^[a-zA-Z0-9@._+-]{1,320}$/.test(name)) {
      return res.status(400).json({ error: "invalid ref name" });
    }

    const info = await setReferralLink(name, "Marketing team");

    if (!info) {
      return res.status(500).json({ error: "failed to set ref link" });
    }

    res.json(info);
  });

  app.get("/api/ref/click/:name", async (req, res) => {
    const info = await recordReferralClick(req.params.name);

    if (!info) {
      return res.json({ counted: false });
    }

    res.json({
      counted: true,
      ...info,
    });
  });

  app.get("/api/balance/topup/:amount", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const amount = Number(req.params.amount || 0);
      const result = await recordUserTopUp(user.id, amount);

      if (!result) {
        return res.status(400).json({ error: "invalid top up amount" });
      }

      res.json(result);
    } catch (err) {
      res.status(401).json({ error: "unauthenticated" });
    }
  });

  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);