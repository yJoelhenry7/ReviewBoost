import QRCode from "qrcode";
import { findBusinessBySlug } from "@/lib/funnel";
import { publicLink } from "@/lib/links";

export async function GET(req: Request, ctx: RouteContext<"/api/qr/[slug]">) {
  const { slug } = await ctx.params;
  const business = await findBusinessBySlug(slug);
  if (!business) return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const size = Math.min(2000, Math.max(200, Number(url.searchParams.get("size")) || 800));
  const png = await QRCode.toBuffer(publicLink(business.slug), {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
      ...(url.searchParams.get("download") && {
        "Content-Disposition": `attachment; filename="${business.slug}-qr.png"`,
      }),
    },
  });
}
