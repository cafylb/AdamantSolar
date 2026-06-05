import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  createOrder,
  getOrdersByUserId,
  upsertUserProfile,
  getUserProfile,
} from "./db";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  orders: router({
    create: protectedProcedure
      .input(
        z.object({
          location: z.string().refine(val => val === "Tashkent", {
            message: "Orders are only available in Tashkent",
          }),
          day: z.number().min(1).max(31),
          month: z.string().min(1),
          year: z.number().min(2000),
          hour: z.number().min(0).max(23),
          minute: z.number().min(0).max(59),
          mainTitle: z.string().min(1, "Main title is required"),
          line1: z.string().min(1, "Line 1 is required"),
          line2: z.string().min(1, "Line 2 is required"),
          message: z.string().optional(),
          hideTime: z.boolean().default(false),
          deliveryAddress: z.string().min(1, "Delivery address is required"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Validate delivery address contains Tashkent reference
        const tashkentKeywords = ["tashkent", "ташкент", "узб", "uzbek"];
        const addressLower = input.deliveryAddress.toLowerCase();
        const isTashkentAddress = tashkentKeywords.some(keyword =>
          addressLower.includes(keyword)
        );

        if (!isTashkentAddress) {
          throw new Error(
            "Delivery address must be in Tashkent. Please provide a valid Tashkent address."
          );
        }

        const order = await createOrder({
          userId: ctx.user.id,
          location: input.location,
          day: input.day,
          month: input.month,
          year: input.year,
          hour: input.hour,
          minute: input.minute,
          mainTitle: input.mainTitle,
          line1: input.line1,
          line2: input.line2,
          message: input.message || null,
          hideTime: input.hideTime ? 1 : 0,
          deliveryAddress: input.deliveryAddress,
          status: "pending",
        });

        // Notify owner
        await notifyOwner({
          title: "New Order Received",
          content: `New order from ${ctx.user.name || ctx.user.email}: ${input.mainTitle}. Delivery address: ${input.deliveryAddress}`,
        });

        return order;
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getOrdersByUserId(ctx.user.id);
    }),
  }),

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await getUserProfile(ctx.user.id);
    }),
    upsert: protectedProcedure
      .input(
        z.object({
          location: z.string().refine(val => val === "Tashkent", {
            message: "Location must be Tashkent",
          }),
          deliveryAddress: z.string().min(1, "Delivery address is required"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Validate delivery address contains Tashkent reference
        const tashkentKeywords = ["tashkent", "ташкент", "узб", "uzbek"];
        const addressLower = input.deliveryAddress.toLowerCase();
        const isTashkentAddress = tashkentKeywords.some(keyword =>
          addressLower.includes(keyword)
        );

        if (!isTashkentAddress) {
          throw new Error(
            "Delivery address must be in Tashkent. Please provide a valid Tashkent address."
          );
        }

        return await upsertUserProfile({
          userId: ctx.user.id,
          location: input.location,
          deliveryAddress: input.deliveryAddress,
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
