import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

type OAuthState = {
  provider: "google" | "apple";
  returnUrl: string;
  refName?: string;
};

const DEFAULT_RETURN_URL = "/dashboard";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getRequestBaseUrl(req: Request) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol =
    typeof forwardedProto === "string" ? forwardedProto : req.protocol || "http";
  const host = req.headers.host || ENV.appUrl.replace(/https?:\/\//, "");
  return `${protocol}://${host}`;
}

function encodeState(state: OAuthState) {
  return Buffer.from(JSON.stringify(state), "utf-8").toString("base64url");
}

function decodeState(value: string): OAuthState | null {
  try {
    const json = Buffer.from(value, "base64url").toString("utf-8");
    const parsed = JSON.parse(json) as OAuthState;
    if (!parsed.provider || !parsed.returnUrl) return null;
    return parsed;
  } catch {
    return null;
  }
}

function assertOAuthConfig(provider: "google" | "apple") {
  if (provider === "google") {
    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      throw new Error("Google OAuth is not configured");
    }
  }

  if (provider === "apple") {
    if (
      !ENV.appleClientId ||
      !ENV.appleTeamId ||
      !ENV.appleKeyId ||
      !ENV.applePrivateKey
    ) {
      throw new Error("Apple OAuth is not configured");
    }
  }
}

function buildOAuthRedirectUrl(req: Request, provider: "google" | "apple") {
  const baseUrl = getRequestBaseUrl(req);

  const rawRef = getQueryParam(req, "ref");
  const refName =
    rawRef && /^[a-zA-Z0-9@._+-]{1,320}$/.test(rawRef)
      ? rawRef.trim().toLowerCase()
      : undefined;

  if (provider === "google") {
    const redirectUri = `${baseUrl}/api/auth/callback`;
    const state = encodeState({
      provider,
      returnUrl: DEFAULT_RETURN_URL,
      refName,
    });

    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  const redirectUri = `${baseUrl}/api/auth/callback`;
  const state = encodeState({
    provider,
    returnUrl: DEFAULT_RETURN_URL,
    refName,
  });

  const params = new URLSearchParams({
    response_type: "code",
    response_mode: "form_post",
    client_id: ENV.appleClientId,
    redirect_uri: redirectUri,
    scope: "name email",
    state,
  });

  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/google", async (req: Request, res: Response) => {
    try {
      assertOAuthConfig("google");
      const url = buildOAuthRedirectUrl(req, "google");
      res.redirect(url);
    } catch (error) {
      console.error("[OAuth] Google auth start failed", error);
      res.status(500).json({ error: "Google auth start failed" });
    }
  });

  app.get("/api/auth/apple", async (req: Request, res: Response) => {
    try {
      assertOAuthConfig("apple");
      const url = buildOAuthRedirectUrl(req, "apple");
      res.redirect(url);
    } catch (error) {
      console.error("[OAuth] Apple auth start failed", error);
      res.status(500).json({ error: "Apple auth start failed" });
    }
  });

  app.all("/api/auth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code") || (req.body && req.body.code);
    const stateValue =
      getQueryParam(req, "state") || (req.body && req.body.state);

    if (!code || !stateValue) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const state = decodeState(stateValue);

    if (!state) {
      res.status(400).json({ error: "Invalid OAuth state" });
      return;
    }

    try {
      assertOAuthConfig(state.provider);

      const redirectUri = `${getRequestBaseUrl(req)}/api/auth/callback`;
      const tokenResponse = await sdk.exchangeCodeForToken(
        state.provider,
        code,
        redirectUri
      );

      const userInfo = await sdk.getUserInfo(state.provider, tokenResponse);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      const existingUser = await db.getUserByOpenId(userInfo.openId);
      const isNewUser = !existingUser;

      const user = await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name ?? undefined,
        email: userInfo.email ?? undefined,
        loginMethod: userInfo.loginMethod ?? state.provider,
        lastSignedIn: new Date(),
      });

      if (!user) {
        throw new Error("Failed to create or update user");
      }

      if (isNewUser && state.refName) {
        await db.attachReferralToNewUser(user.id, state.refName);
      }

      const sessionToken = await sdk.createSessionToken(user.id.toString(), {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);

      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, state.returnUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}