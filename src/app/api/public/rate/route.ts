import { z } from "zod";
import { findBusinessBySlug, submitRating } from "@/lib/funnel";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  slug: z.string().max(80),
  code: z.string().max(40).nullish(),
  stars: z.number().int().min(1).max(5),
});

export async function POST(req: Request) {
  if (!rateLimit(`rate:${clientIp(req)}`, 20, 60_000)) return Response.json({ error: "slow down" }, { status: 429 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });
  const business = await findBusinessBySlug(body.data.slug);
  if (!business) return Response.json({ error: "not found" }, { status: 404 });

  const out = await submitRating({
    businessId: business.id,
    code: body.data.code,
    stars: body.data.stars,
    source: "qr",
  });
  return Response.json(out);
}
