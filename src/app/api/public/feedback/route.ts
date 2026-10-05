import { z } from "zod";
import { findBusinessBySlug, submitFeedback } from "@/lib/funnel";
import { normalizePhone } from "@/lib/phone";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  slug: z.string().max(80),
  ratingId: z.string().max(40),
  feedback: z.string().trim().min(1).max(2000),
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(20).optional(),
});

export async function POST(req: Request) {
  if (!rateLimit(`fb:${clientIp(req)}`, 10, 60_000)) return Response.json({ error: "slow down" }, { status: 429 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });
  const business = await findBusinessBySlug(body.data.slug);
  if (!business) return Response.json({ error: "not found" }, { status: 404 });

  const ok = await submitFeedback({
    businessId: business.id,
    ratingId: body.data.ratingId,
    feedback: body.data.feedback,
    name: body.data.name,
    phone: body.data.phone ? (normalizePhone(body.data.phone) ?? undefined) : undefined,
  });
  return Response.json({ ok }, { status: ok ? 200 : 404 });
}
