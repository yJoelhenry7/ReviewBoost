import { z } from "zod";
import { findBusinessBySlug, markWentToGoogle, trackVisit } from "@/lib/funnel";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  slug: z.string().max(80),
  code: z.string().max(40).nullish(),
  ratingId: z.string().max(40).optional(),
  type: z.enum(["visit", "google"]).default("visit"),
});

export async function POST(req: Request) {
  if (!rateLimit(`track:${clientIp(req)}`, 60, 60_000)) return Response.json({ error: "slow down" }, { status: 429 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });
  const business = await findBusinessBySlug(body.data.slug);
  if (!business) return Response.json({ error: "not found" }, { status: 404 });

  if (body.data.type === "google" && body.data.ratingId) {
    await markWentToGoogle(business.id, body.data.ratingId);
  } else {
    await trackVisit(business.id, body.data.code);
  }
  return Response.json({ ok: true });
}
