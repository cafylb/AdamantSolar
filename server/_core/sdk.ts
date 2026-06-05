import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { decodeJwt, importPKCS8, jwtVerify, SignJWT } from "jose";
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

  async exchangeCodeForToken(
    provider: "google" | "apple",
    code: string,
    redirectUri: string
  ): Promise<any> {
    if (provider === "google") {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!response.ok) {
        throw new Error("Google token exchange failed");
      }

      return await response.json();
    }

    if (provider === "apple") {
      const clientSecret = await this.createAppleClientSecret();
      const response = await fetch("https://appleid.apple.com/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: ENV.appleClientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Apple token exchange failed: ${errorText}`);
      }

      return await response.json();
    }

    throw new Error("Unsupported OAuth provider");
  }

  async getUserInfo(provider: "google" | "apple", tokenResponse: any): Promise<any> {
    if (provider === "google") {
      if (!tokenResponse.access_token) {
        throw new Error("Google access token missing");
      }
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Google userinfo failed");
      }

      const profile = await response.json();
      return {
        openId: `google:${profile.sub}`,
        email: profile.email ?? null,
        name: profile.name ?? profile.email ?? null,
        loginMethod: "google",
      };
    }

    if (provider === "apple") {
      const idToken = tokenResponse.id_token;
      if (!idToken) {
        throw new Error("Apple id_token missing");
      }

      const decoded = decodeJwt(idToken);
      const appleSub = decoded.sub;
      const email = typeof decoded.email === "string" ? decoded.email : null;
      return {
        openId: `apple:${appleSub}`,
        email,
        name: email ? email.split("@")[0] : "Apple User",
        loginMethod: "apple",
      };
    }

    throw new Error("Unsupported OAuth provider");
  }

  private async createAppleClientSecret(): Promise<string> {
    const privateKey = ENV.applePrivateKey.replace(/\\n/g, "\n");
    const key = await importPKCS8(privateKey, "ES256");
    const now = Math.floor(Date.now() / 1000);

    return await new SignJWT({
      iss: ENV.appleTeamId,
      iat: now,
      exp: now + 60 * 60,
      aud: "https://appleid.apple.com",
      sub: ENV.appleClientId,
    })
      .setProtectedHeader({ alg: "ES256", kid: ENV.appleKeyId })
      .sign(key);
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
