import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * staffSessionProcedure — requires a valid staff session JWT cookie.
 * This is the gatekeeper for all staff-facing operations.
 * Staff must have logged in via PIN to get a session.
 * The staffId is extracted server-side from the JWT — never from client input.
 * Also loads the staff record for role-based access checks.
 */
const requireStaffSession = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.staffId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Staff session required. Please log in with your PIN.",
    });
  }

  // Load staff record for role checks (cached per request)
  const { getStaffByIdInternal } = await import("../db");
  const staffRecord = await getStaffByIdInternal(ctx.staffId);

  return next({
    ctx: {
      ...ctx,
      staffId: ctx.staffId,
      staffRecord: staffRecord ?? null,
    },
  });
});

export const staffSessionProcedure = t.procedure.use(requireStaffSession);

/**
 * staffOrAuthProcedure — requires EITHER a valid staff session OR OAuth user session.
 * Used for endpoints that managers (OAuth) or staff (PIN) can both access.
 */
const requireStaffOrAuth = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.staffId && !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required. Log in with PIN or OAuth.",
    });
  }

  return next({ ctx });
});

export const staffOrAuthProcedure = t.procedure.use(requireStaffOrAuth);
