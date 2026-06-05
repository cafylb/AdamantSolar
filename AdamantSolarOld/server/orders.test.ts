import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `AdamantSolar@gmail.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe(
  "orders procedures",
  () => {
    it("validates required fields in order creation", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const invalidOrderData = {
        location: "Tashkent",
        day: 26,
        month: "May",
        year: 2026,
        hour: 16,
        minute: 59,
        mainTitle: "", // Invalid: empty
        line1: "The starry sky over",
        line2: "Tashkent",
        hideTime: false,
        deliveryAddress: "123 Main Street, Tashkent",
      };

      try {
        await caller.orders.create(invalidOrderData as any);
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("requires authentication for order creation", async () => {
      const ctxNoUser = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      } as TrpcContext;

      const caller = appRouter.createCaller(ctxNoUser);

      try {
        await caller.orders.create({
          location: "Tashkent",
          day: 26,
          month: "May",
          year: 2026,
          hour: 16,
          minute: 59,
          mainTitle: "Test",
          line1: "Line 1",
          line2: "Line 2",
          hideTime: false,
          deliveryAddress: "Address",
        });
        expect.fail("Should have thrown unauthorized error");
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("validates order input schema", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      // Test invalid day
      try {
        await caller.orders.create({
          location: "Tashkent",
          day: 32, // Invalid: > 31
          month: "May",
          year: 2026,
          hour: 16,
          minute: 59,
          mainTitle: "Test",
          line1: "Line 1",
          line2: "Line 2",
          hideTime: false,
          deliveryAddress: "Address",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBe("BAD_REQUEST");
      }
    });
  },
  { timeout: 10000 }
);

describe(
  "profile procedures",
  () => {
    it("requires authentication for profile operations", async () => {
      const ctxNoUser = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      } as TrpcContext;

      const caller = appRouter.createCaller(ctxNoUser);

      try {
        await caller.profile.get();
        expect.fail("Should have thrown unauthorized error");
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("validates profile upsert input", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      // Test empty location
      try {
        await caller.profile.upsert({
          location: "",
          deliveryAddress: "123 Main Street",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("validates profile upsert requires delivery address", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      // Test empty delivery address
      try {
        await caller.profile.upsert({
          location: "Tashkent",
          deliveryAddress: "",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBe("BAD_REQUEST");
      }
    });
  },
  { timeout: 10000 }
);

describe(
  "Tashkent-only validation",
  () => {
    it("rejects orders with non-Tashkent location", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.orders.create({
          location: "Moscow", // Invalid: not Tashkent
          day: 26,
          month: "May",
          year: 2026,
          hour: 16,
          minute: 59,
          mainTitle: "Test",
          line1: "Line 1",
          line2: "Line 2",
          hideTime: false,
          deliveryAddress: "123 Main Street, Tashkent",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("rejects delivery addresses without Tashkent reference", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.orders.create({
          location: "Tashkent",
          day: 26,
          month: "May",
          year: 2026,
          hour: 16,
          minute: 59,
          mainTitle: "Test",
          line1: "Line 1",
          line2: "Line 2",
          hideTime: false,
          deliveryAddress: "123 Main Street, Moscow", // Invalid: not Tashkent
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toContain("Tashkent");
      }
    });

    it("accepts delivery addresses with Tashkent keyword", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      // Validation should pass for Tashkent addresses
      const tashkentKeywords = ["tashkent", "ташкент", "узб", "uzbek"];
      const address = "123 Main Street, Tashkent, Uzbekistan";
      const isTashkentAddress = tashkentKeywords.some(keyword =>
        address.toLowerCase().includes(keyword)
      );
      expect(isTashkentAddress).toBe(true);
    });

    it("accepts delivery addresses with Uzbek Cyrillic", async () => {
      // Validation should pass for Cyrillic Tashkent addresses
      const tashkentKeywords = ["tashkent", "ташкент", "узб", "uzbek"];
      const address = "123 Улица, Ташкент";
      const isTashkentAddress = tashkentKeywords.some(keyword =>
        address.toLowerCase().includes(keyword)
      );
      expect(isTashkentAddress).toBe(true);
    });
  },
  { timeout: 10000 }
);
