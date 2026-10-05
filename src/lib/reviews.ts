import { randomBytes } from "node:crypto";
import type { Business } from "@prisma/client";
import { suggestReply } from "./ai";
import { db } from "./db";
import { fetchPlace, type FetchedReview } from "./google";
import { approveLink } from "./links";
import { sendWhatsApp } from "./whatsapp/send";

/**
 * Stores a review (idempotent on externalId), drafts an AI reply, and alerts the
 * owner. `alert: false` is used for the first sync so old reviews don't spam.
 */
export async function ingestReview(business: Business, r: FetchedReview, opts: { alert: boolean }) {
  const exists = await db.googleReview.findUnique({
    where: { businessId_externalId: { businessId: business.id, externalId: r.externalId } },
  });
  if (exists) return null;

  const suggestedReply = await suggestReply({
    businessName: business.name,
    authorName: r.authorName,
    stars: r.stars,
    text: r.text,
    language: business.language,
  });
  const review = await db.googleReview.create({
    data: {
      businessId: business.id,
      externalId: r.externalId,
      authorName: r.authorName,
      stars: r.stars,
      text: r.text,
      reviewedAt: r.reviewedAt,
      suggestedReply,
      approveToken: randomBytes(16).toString("base64url"),
      alertedAt: opts.alert ? null : new Date(),
    },
  });

  if (opts.alert && business.ownerPhone) {
    const res = await sendWhatsApp({
      businessId: business.id,
      to: business.ownerPhone,
      kind: "owner_new_review",
      lang: "en",
      vars: [
        String(r.stars),
        r.authorName,
        (r.text ?? "(rating only)").replace(/\s+/g, " ").slice(0, 120),
        approveLink(review.approveToken),
      ],
    });
    if (res.ok) await db.googleReview.update({ where: { id: review.id }, data: { alertedAt: new Date() } });
  }
  return review;
}

export async function syncBusinessReviews(business: Business) {
  if (!business.placeId) return { fetched: 0, added: 0 };
  const place = await fetchPlace(business.placeId);
  if (!place) return { fetched: 0, added: 0 };

  const day = new Date().toISOString().slice(0, 10);
  if (place.total != null) {
    await db.business.update({
      where: { id: business.id },
      data: { googleRating: place.rating, googleReviewCount: place.total, lastSyncedAt: new Date() },
    });
    await db.reviewSnapshot.upsert({
      where: { businessId_day: { businessId: business.id, day } },
      update: { count: place.total, rating: place.rating },
      create: { businessId: business.id, day, count: place.total, rating: place.rating },
    });
  }

  const isFirstSync = (await db.googleReview.count({ where: { businessId: business.id } })) === 0;
  let added = 0;
  // oldest first so alerts arrive in order
  for (const r of [...place.reviews].sort((a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime())) {
    const created = await ingestReview(business, r, { alert: !isFirstSync });
    if (created) added++;
  }
  return { fetched: place.reviews.length, added };
}

export async function syncAllBusinesses() {
  const businesses = await db.business.findMany({ where: { placeId: { not: null } } });
  let added = 0;
  for (const b of businesses) added += (await syncBusinessReviews(b)).added;
  return { businesses: businesses.length, added };
}
