import { config } from "./config";
import { db } from "./db";
import { googleReviewUrl } from "./links";
import { formatPhone } from "./phone";
import { sendWhatsApp } from "./whatsapp/send";

export async function findBusinessBySlug(slug: string) {
  return db.business.findUnique({ where: { slug } });
}

/** Records a scan (QR, no request) or a click (personalised WhatsApp link). Idempotent per request. */
export async function trackVisit(businessId: string, code?: string | null) {
  if (code) {
    const req = await db.reviewRequest.findFirst({ where: { code, businessId } });
    if (req) {
      if (!req.clickedAt) {
        await db.reviewRequest.update({
          where: { id: req.id },
          data: { clickedAt: new Date(), status: req.status === "rated" ? "rated" : "clicked" },
        });
        await db.linkEvent.create({ data: { businessId, requestId: req.id, type: "click" } });
      }
      return;
    }
  }
  await db.linkEvent.create({ data: { businessId, type: "scan" } });
}

export async function submitRating(opts: {
  businessId: string;
  code?: string | null;
  stars: number;
  source: "qr" | "whatsapp";
}) {
  const business = await db.business.findUniqueOrThrow({ where: { id: opts.businessId } });
  const request = opts.code
    ? await db.reviewRequest.findFirst({
        where: { code: opts.code, businessId: business.id },
        include: { customer: true },
      })
    : null;

  const rating = await db.rating.create({
    data: {
      businessId: business.id,
      requestId: request?.id,
      stars: opts.stars,
      source: request ? "whatsapp" : opts.source,
      contactName: request?.customer.name,
      contactPhone: request?.customer.phone,
      wentToGoogle: opts.stars >= 4,
    },
  });

  if (request) {
    await db.reviewRequest.update({
      where: { id: request.id },
      data: { status: "rated", ratedAt: new Date() },
    });
  }
  if (opts.stars >= 4) {
    await db.linkEvent.create({ data: { businessId: business.id, requestId: request?.id, type: "google" } });
  }

  // Low rating: tell the owner right away so they can call and fix it.
  if (opts.stars <= 3 && business.ownerPhone) {
    await sendWhatsApp({
      businessId: business.id,
      to: business.ownerPhone,
      kind: "owner_low_rating",
      lang: "en",
      vars: [
        request?.customer.name ?? "A customer",
        String(opts.stars),
        business.name,
        request ? formatPhone(request.customer.phone) : "not shared yet",
        `${config.appUrl}/app/feedback`,
      ],
    });
  }

  return {
    ratingId: rating.id,
    googleUrl: googleReviewUrl(business),
    goToGoogle: opts.stars >= 4,
  };
}

export async function submitFeedback(opts: {
  businessId: string;
  ratingId: string;
  feedback: string;
  name?: string;
  phone?: string;
}) {
  const rating = await db.rating.findFirst({
    where: { id: opts.ratingId, businessId: opts.businessId },
  });
  if (!rating) return false;
  await db.rating.update({
    where: { id: rating.id },
    data: {
      feedback: opts.feedback.slice(0, 2000),
      contactName: opts.name?.slice(0, 80) || rating.contactName,
      contactPhone: opts.phone?.slice(0, 20) || rating.contactPhone,
    },
  });
  return true;
}

export async function markWentToGoogle(businessId: string, ratingId: string) {
  const r = await db.rating.updateMany({
    where: { id: ratingId, businessId },
    data: { wentToGoogle: true },
  });
  if (r.count) await db.linkEvent.create({ data: { businessId, type: "google" } });
}
