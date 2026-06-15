import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
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
  getUserByOpenId,
  recordReferralClick,
  recordUserTopUp,
  setReferralLink,
  updateOrderStatus,
} from "../db";
import { API_PASSWORD, REQUIRE_LOGIN, TEST_USER_EMAIL } from "@shared/const";
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

  // Shared-password gate for the sensitive REST endpoints. The password can be
  // provided via the "x-api-password" header, a "?password=" query parameter,
  // or a "password" field in the request body.
  const requireApiPassword = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const headerValue = req.headers["x-api-password"];
    const provided =
      (typeof req.query.password === "string" && req.query.password) ||
      (typeof headerValue === "string" && headerValue) ||
      (req.body && typeof req.body.password === "string" && req.body.password) ||
      "";

    if (provided !== API_PASSWORD) {
      return res
        .status(401)
        .json({ error: "invalid or missing API password" });
    }

    return next();
  };

  app.get("/api/debug/orders", requireApiPassword, async (req, res) => {
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

  app.get("/api/ref/get", requireApiPassword, async (_req, res) => {
    const info = await getOverallRefInfo();
    res.json(info);
  });

  app.get("/api/ref/get/:name", requireApiPassword, async (req, res) => {
    const info = await getReferralInfo(req.params.name);

    if (!info) {
      return res.status(404).json({ error: "ref link not found" });
    }

    res.json(info);
  });

  app.get("/api/ref/clear/:name", requireApiPassword, async (req, res) => {
    const info = await clearReferralTopUp(req.params.name);

    if (!info) {
      return res.status(404).json({ error: "ref link not found" });
    }

    res.json(info);
  });

  app.get("/api/ref/set/:name", requireApiPassword, async (req, res) => {
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

  app.get(
    "/api/balance/topup/:amount",
    requireApiPassword,
    async (req, res) => {
      try {
        let user: any = null;

        try {
          user = await sdk.authenticateRequest(req);
        } catch {
          user = null;
        }

        if (!user && !REQUIRE_LOGIN) {
          user = await getUserByOpenId(`test-user-${TEST_USER_EMAIL}`);
        }

        if (!user) {
          return res.status(401).json({ error: "unauthenticated" });
        }

        const amount = Number(req.params.amount || 0);
        const result = await recordUserTopUp(user.id, amount);

        if (!result) {
          return res.status(400).json({ error: "invalid top up amount" });
        }

        res.json({ ok: true, userId: user.id, ...result });
      } catch (err) {
        res.status(500).json({ error: "top up failed" });
      }
    }
  );

  // Update an order's status by its numeric id.
  // status code: 0 -> pending, 1 -> creating, 2 -> delivering, 3 -> delivered
  const ORDER_STATUS_BY_CODE: Record<string, string> = {
    "0": "pending",
    "1": "creating",
    "2": "delivering",
    "3": "delivered",
  };

  app.all(
    "/api/:orderid(\\d+)/:status(\\d+)",
    requireApiPassword,
    async (req: Request, res: Response) => {
      try {
        const newStatus = ORDER_STATUS_BY_CODE[String(req.params.status)];
        if (!newStatus) {
          return res.status(400).json({
            error:
              "invalid status (use 0=pending, 1=creating, 2=delivering, 3=delivered)",
          });
        }

        const orderId = Number(req.params.orderid);
        const updated = await updateOrderStatus(orderId, newStatus);

        if (!updated) {
          return res.status(404).json({ error: "order not found" });
        }

        res.json({ ok: true, orderId, status: newStatus, order: updated });
      } catch (err) {
        res.status(500).json({ error: "failed to update order status" });
      }
    }
  );

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