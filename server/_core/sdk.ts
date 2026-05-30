import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  userId: string;
  name?: string;
};


class SDKServer {
  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ userId: string; name?: string } | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { userId, name } = payload as Record<string, unknown>;

      if (!isNonEmptyString(userId)) {
        return null;
      }

      return {
        userId,
        name: isNonEmptyString(name) ? name : undefined,
      };
    } catch (error) {
      return null;
    }
  }

  async exchangeCodeForToken(code: string, state: string): Promise<any> {
    throw new Error("OAuth exchangeCodeForToken is not implemented");
  }

  async getUserInfo(accessToken: string): Promise<any> {
    throw new Error("OAuth getUserInfo is not implemented");
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        userId: openId,
        name: options.name || "",
      },
      options
    );
  }

  async signSession(
    payload: { userId: string; name: string },
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      userId: payload.userId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const userId = parseInt(session.userId, 10);
    if (isNaN(userId)) {
      throw ForbiddenError("Invalid user ID in session");
    }

    // Check if database is available first
    const dbInstance = await db.getPool();
    if (!dbInstance) {
      // Return fallback user if database is not available
      return {
        id: userId,
        openId: session.userId,
        name: session.name ?? null,
        email: null,
        loginMethod: "local",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as User;
    }

    let user = await db.getUserById(userId);

    if (!user) {
      const fallbackUser = {
        id: userId,
        openId: `user-${userId}`,
        name: session.name ?? null,
        email: null,
        loginMethod: "local",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as User;

      await db.upsertUser({
        openId: fallbackUser.openId,
        name: fallbackUser.name ?? undefined,
        email: undefined,
        loginMethod: "local",
        lastSignedIn: new Date(),
      });
      user = await db.getUserById(userId);
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    return user;
  }
}

export const sdk = new SDKServer();
