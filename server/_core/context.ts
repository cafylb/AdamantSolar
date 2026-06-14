import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { REQUIRE_LOGIN, TEST_USER_EMAIL } from "@shared/const";
import { getUserByOpenId, upsertUser } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (!REQUIRE_LOGIN) {
    const openId = `test-user-${TEST_USER_EMAIL}`;
    try {
      let dbUser = await getUserByOpenId(openId);
      if (!dbUser) {
        dbUser = await upsertUser({
          openId,
          name: "Adamant Solar Test",
          email: TEST_USER_EMAIL,
          loginMethod: "local",
          role: "user",
        });
      }
      user = dbUser;
    } catch (error) {
      console.warn("Failed to get/create test user on bypass login:", error);
      user = {
        id: 99999,
        openId,
        name: "Adamant Solar Test",
        email: TEST_USER_EMAIL,
        loginMethod: "local",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as any;
    }
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
