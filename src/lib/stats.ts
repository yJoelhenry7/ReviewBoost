import { db } from "./db";
import { messagesUsed, startOfMonth } from "./billing";

function monthKey(d: Date) {
  const pad = (n: number) => String(n + 1).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth())}`;
}

export async function dashboardStats(businessId: string) {
  const now = new Date();
  const thisMonth = startOfMonth(now);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });

  const [sent, clicked, rated, toGoogle, lowRatings, scans, used, reqThis, reqLast] = await Promise.all([
    db.reviewRequest.count({ where: { businessId, status: { not: "failed" }, createdAt: { gte: thisMonth } } }),
    db.reviewRequest.count({ where: { businessId, clickedAt: { gte: thisMonth } } }),
    db.reviewRequest.count({ where: { businessId, ratedAt: { gte: thisMonth } } }),
    db.rating.count({ where: { businessId, wentToGoogle: true, createdAt: { gte: thisMonth } } }),
    db.rating.count({ where: { businessId, stars: { lte: 3 }, resolved: false } }),
    db.linkEvent.count({ where: { businessId, type: "scan", createdAt: { gte: thisMonth } } }),
    messagesUsed(businessId),
    db.reviewRequest.count({ where: { businessId, status: { not: "failed" }, createdAt: { gte: thisMonth } } }),
    db.reviewRequest.count({
      where: { businessId, status: { not: "failed" }, createdAt: { gte: lastMonth, lt: thisMonth } },
    }),
  ]);

  // Reviews gained: use daily snapshots of Google's total when available, else count stored reviews.
  const snaps = await db.reviewSnapshot.findMany({
    where: { businessId, day: { gte: `${monthKey(lastMonth)}-01` } },
    orderBy: { day: "asc" },
  });
  const firstOf = (key: string) => snaps.find((s) => s.day.startsWith(key));
  const lastOf = (key: string) => [...snaps].reverse().find((s) => s.day.startsWith(key));
  const tm = monthKey(thisMonth);
  const lm = monthKey(lastMonth);
  let gainedThis: number;
  let gainedLast: number | null;
  if (snaps.length >= 2 && firstOf(tm) && lastOf(tm)) {
    const base = lastOf(lm) ?? firstOf(tm)!;
    gainedThis = lastOf(tm)!.count - base.count;
    gainedLast = lastOf(lm) && firstOf(lm) ? lastOf(lm)!.count - firstOf(lm)!.count : null;
  } else {
    gainedThis = await db.googleReview.count({ where: { businessId, reviewedAt: { gte: thisMonth } } });
    gainedLast = await db.googleReview.count({ where: { businessId, reviewedAt: { gte: lastMonth, lt: thisMonth } } });
  }

  const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));
  return {
    business,
    totalReviews: business.googleReviewCount,
    averageRating: business.googleRating,
    gainedThis,
    gainedLast,
    funnel: { sent, clicked, rated, toGoogle, clickRate: pct(clicked, sent) },
    scans,
    lowRatings,
    messages: { used, limit: business.monthlyMsgLimit },
    requests: { thisMonth: reqThis, lastMonth: reqLast },
  };
}
