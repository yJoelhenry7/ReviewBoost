import type { Business } from "@prisma/client";
import { PLANS } from "./config";
import { db } from "./db";

export type PlanKey = keyof typeof PLANS;

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isActive(b: Pick<Business, "plan" | "trialEndsAt" | "subscriptionStatus">) {
  if (b.subscriptionStatus === "active") return true;
  if (b.subscriptionStatus === "trialing") return b.trialEndsAt.getTime() > Date.now();
  return false;
}

/** Customer-facing messages (requests + reminders) sent this month. Owner alerts don't count. */
export async function messagesUsed(businessId: string) {
  return db.messageLog.count({
    where: {
      businessId,
      kind: { in: ["review_request", "review_reminder"] },
      status: { not: "failed" },
      createdAt: { gte: startOfMonth() },
    },
  });
}

export async function canSendCustomerMessage(b: Business) {
  if (!isActive(b)) {
    return { ok: false as const, reason: "Your trial or subscription has ended. Please upgrade to keep sending." };
  }
  const used = await messagesUsed(b.id);
  if (used >= b.monthlyMsgLimit) {
    return { ok: false as const, reason: `Monthly message limit of ${b.monthlyMsgLimit} reached. Upgrade your plan to send more.` };
  }
  return { ok: true as const, used, limit: b.monthlyMsgLimit };
}
