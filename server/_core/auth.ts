import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as jose from "jose";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";

const secret = new TextEncoder().encode(ENV.cookieSecret);

export async function createSessionToken(userId: string): Promise<string> {
  return await new jose.SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1y")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
  try {
    const verified = await jose.jwtVerify(token, secret);
    return { userId: verified.payload.userId as string };
  } catch {
    return null;
  }
}

export function registerAuthRoutes(app: Express) {
  // Simple login endpoint - creates a test user
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // For demo purposes, create a fallback test user without relying on the database.
      const fallbackUser = {
        id: 1,
        openId: "test-user-001",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "demo",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };

      const sessionToken = await createSessionToken(fallbackUser.id.toString());
      const cookieOptions = getSessionCookieOptions(req);

      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({
        success: true,
        user: fallbackUser,
      }); 
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
  });
}