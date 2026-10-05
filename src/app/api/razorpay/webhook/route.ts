import { createHmac, timingSafeEqual } from "node:crypto";
import { PLANS, config } from "@/lib/config";
import { db } from "@/lib/db";

type Event = {
  event: string;
  payload?: { subscription?: { entity?: { id: string; notes?: { businessId?: string; plan?: string } } } };
};

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  if (!config.razorpay.webhookSecret) return new Response("not configured", { status: 503 });

  const expected = createHmac("sha256", config.razorpay.webhookSecret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("bad signature", { status: 401 });

  const evt = JSON.parse(raw) as Event;
  const sub = evt.payload?.subscription?.entity;
  if (!sub) return Response.json({ ok: true });

  const business = await db.business.findFirst({ where: { razorpaySubId: sub.id } });
  if (!business) return Response.json({ ok: true });

  switch (evt.event) {
    case "subscription.activated":
    case "subscription.charged": {
      const plan = (sub.notes?.plan === "growth" ? "growth" : "starter") as "starter" | "growth";
      await db.business.update({
        where: { id: business.id },
        data: { subscriptionStatus: "active", plan, monthlyMsgLimit: PLANS[plan].msgLimit },
      });
      break;
    }
    case "subscription.halted":
    case "subscription.pending":
      await db.business.update({ where: { id: business.id }, data: { subscriptionStatus: "past_due" } });
      break;
    case "subscription.cancelled":
    case "subscription.completed":
      await db.business.update({ where: { id: business.id }, data: { subscriptionStatus: "canceled" } });
      break;
  }
  return Response.json({ ok: true });
}
