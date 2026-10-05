import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Runs against a throwaway SQLite file with the mock WhatsApp provider.
process.env.DATABASE_URL = "file:./flowtest.db";
process.env.WHATSAPP_PROVIDER = "mock";
process.env.ANTHROPIC_API_KEY = "";
process.env.APP_URL = "http://test.local";

type Db = typeof import("../src/lib/db").db;
let db: Db;
let business: Awaited<ReturnType<Db["business"]["create"]>>;

beforeAll(async () => {
  for (const f of ["flowtest.db", "flowtest.db-journal"]) rmSync(`prisma/${f}`, { force: true });
  execSync("npx prisma db push --skip-generate", { stdio: "pipe", env: process.env });
  db = (await import("../src/lib/db")).db;
  business = await db.business.create({
    data: {
      name: "Smile Dental",
      slug: "smile-dental-test",
      placeId: "ChIJtest",
      ownerPhone: "919000000001",
      trialEndsAt: new Date(Date.now() + 86400_000),
      monthlyMsgLimit: 3,
    },
  });
}, 60_000);

afterAll(async () => {
  await db?.$disconnect();
  for (const f of ["flowtest.db", "flowtest.db-journal"]) rmSync(`prisma/${f}`, { force: true });
});

describe("review request flow", () => {
  let code = "";

  it("validates input", async () => {
    const { createReviewRequest } = await import("../src/lib/requests");
    expect((await createReviewRequest(business, null, { name: "A", phone: "123", consent: true })).ok).toBe(false);
    expect((await createReviewRequest(business, null, { name: "A", phone: "9876543210", consent: false })).ok).toBe(false);
  });

  it("sends a request, logs the message, schedules a reminder", async () => {
    const { createReviewRequest } = await import("../src/lib/requests");
    const out = await createReviewRequest(business, null, { name: "Ravi Kumar", phone: "98765 43210", consent: true });
    expect(out.ok).toBe(true);
    const req = await db.reviewRequest.findFirstOrThrow({ include: { customer: true } });
    code = req.code;
    expect(req.status).toBe("sent");
    expect(req.reminderDueAt).not.toBeNull();
    expect(req.customer.phone).toBe("919876543210");
    const log = await db.messageLog.findFirstOrThrow({ where: { kind: "review_request" } });
    expect(log.body).toContain(`http://test.local/r/smile-dental-test?t=${code}`);
    expect(log.body).toContain("Smile Dental, Ravi!");
  });

  it("blocks a duplicate within the cooldown", async () => {
    const { createReviewRequest } = await import("../src/lib/requests");
    const out = await createReviewRequest(business, null, { name: "Ravi", phone: "9876543210", consent: true });
    expect(out.ok).toBe(false);
  });

  it("sends one reminder only when unclicked and due", async () => {
    const { sendDueReminders } = await import("../src/lib/requests");
    expect(await sendDueReminders()).toEqual({ sent: 0, skipped: 0 }); // not due yet
    const later = new Date(Date.now() + 4 * 86400_000);
    expect((await sendDueReminders(later)).sent).toBe(1);
    expect((await sendDueReminders(later)).sent).toBe(0); // never twice
    expect(await db.messageLog.count({ where: { kind: "review_reminder" } })).toBe(1);
  });

  it("enforces the monthly message limit", async () => {
    const { createReviewRequest } = await import("../src/lib/requests");
    expect((await createReviewRequest(business, null, { name: "B", phone: "9876543211", consent: true })).ok).toBe(true); // 3rd message
    const over = await createReviewRequest(business, null, { name: "C", phone: "9876543212", consent: true });
    expect(over.ok).toBe(false);
    expect(over.ok === false && over.error).toMatch(/limit/);
  });

  it("skips the reminder for customers who clicked", async () => {
    const { trackVisit } = await import("../src/lib/funnel");
    const { sendDueReminders } = await import("../src/lib/requests");
    const b = await db.reviewRequest.findFirstOrThrow({ where: { customer: { phone: "919876543211" } } });
    await trackVisit(business.id, b.code);
    const before = await db.messageLog.count({ where: { kind: "review_reminder" } });
    await sendDueReminders(new Date(Date.now() + 10 * 86400_000));
    expect(await db.messageLog.count({ where: { kind: "review_reminder" } })).toBe(before);
  });
});

describe("rating funnel", () => {
  it("sends 4-5 stars to Google without alerting the owner", async () => {
    const { submitRating } = await import("../src/lib/funnel");
    const out = await submitRating({ businessId: business.id, stars: 5, source: "qr" });
    expect(out.goToGoogle).toBe(true);
    expect(out.googleUrl).toContain("placeid=ChIJtest");
    expect(await db.messageLog.count({ where: { kind: "owner_low_rating" } })).toBe(0);
  });

  it("alerts the owner on a low rating and keeps the Google link available", async () => {
    const { submitRating, submitFeedback } = await import("../src/lib/funnel");
    const req = await db.reviewRequest.findFirstOrThrow({ include: { customer: true } });
    const out = await submitRating({ businessId: business.id, code: req.code, stars: 2, source: "whatsapp" });
    expect(out.goToGoogle).toBe(false);
    expect(out.googleUrl).toBeTruthy(); // review gating is not allowed
    const alert = await db.messageLog.findFirstOrThrow({ where: { kind: "owner_low_rating" } });
    expect(alert.to).toBe("919000000001");
    expect(alert.body).toContain("Ravi Kumar");
    expect(alert.body).toContain("+91 98765 43210");
    expect(await submitFeedback({ businessId: business.id, ratingId: out.ratingId, feedback: "Waited too long" })).toBe(true);
    expect((await db.rating.findUniqueOrThrow({ where: { id: out.ratingId } })).feedback).toBe("Waited too long");
  });

  it("rejects feedback for another business's rating", async () => {
    const { submitFeedback } = await import("../src/lib/funnel");
    const r = await db.rating.findFirstOrThrow();
    expect(await submitFeedback({ businessId: "someone-else", ratingId: r.id, feedback: "x" })).toBe(false);
  });
});

describe("review monitoring", () => {
  it("ingests once, drafts a reply and alerts the owner", async () => {
    const { ingestReview } = await import("../src/lib/reviews");
    const r = { externalId: "g1", authorName: "Priya Rao", stars: 5, text: "Painless root canal", reviewedAt: new Date() };
    const created = await ingestReview(business, r, { alert: true });
    expect(created?.suggestedReply).toContain("Priya");
    expect(await ingestReview(business, r, { alert: true })).toBeNull(); // idempotent
    const alert = await db.messageLog.findFirstOrThrow({ where: { kind: "owner_new_review" } });
    expect(alert.body).toContain(`http://test.local/reply/${created!.approveToken}`);
    expect((await db.googleReview.findUniqueOrThrow({ where: { id: created!.id } })).alertedAt).not.toBeNull();
  });

  it("does not alert for the first-sync backlog", async () => {
    const { ingestReview } = await import("../src/lib/reviews");
    const before = await db.messageLog.count({ where: { kind: "owner_new_review" } });
    await ingestReview(business, { externalId: "old1", authorName: "Old", stars: 4, text: null, reviewedAt: new Date() }, { alert: false });
    expect(await db.messageLog.count({ where: { kind: "owner_new_review" } })).toBe(before);
  });
});

describe("stats", () => {
  it("summarises the funnel", async () => {
    const { dashboardStats } = await import("../src/lib/stats");
    const s = await dashboardStats(business.id);
    expect(s.funnel.sent).toBe(2);
    expect(s.funnel.clicked).toBeGreaterThanOrEqual(1);
    expect(s.lowRatings).toBe(1);
    expect(s.messages.used).toBe(3); // 2 requests + 1 reminder (owner alerts are not counted)
  });
});
