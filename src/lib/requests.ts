import type { Business } from "@prisma/client";
import { canSendCustomerMessage } from "./billing";
import { REMINDER_DELAY_HOURS, REREQUEST_COOLDOWN_DAYS } from "./config";
import { db } from "./db";
import { publicLink, shortCode } from "./links";
import { normalizePhone } from "./phone";
import { sendWhatsApp } from "./whatsapp/send";

export type RequestOutcome =
  | { ok: true; name: string; phone: string }
  | { ok: false; name: string; phone: string; error: string };

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export async function createReviewRequest(
  business: Business,
  userId: string | null,
  input: { name: string; phone: string; consent: boolean },
): Promise<RequestOutcome> {
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 80);
  const raw = input.phone;
  const fail = (error: string): RequestOutcome => ({ ok: false, name, phone: raw, error });

  if (!name) return fail("Name is required");
  const phone = normalizePhone(raw);
  if (!phone) return fail("Invalid phone number");
  if (!input.consent) return fail("Customer consent is required");
  if (!business.placeId && !business.reviewUrl) {
    return fail("Add your Google Place ID or review link in Settings first");
  }

  const quota = await canSendCustomerMessage(business);
  if (!quota.ok) return fail(quota.reason);

  const existing = await db.customer.findUnique({
    where: { businessId_phone: { businessId: business.id, phone } },
  });
  if (existing?.optedOut) return fail("This customer opted out of messages");
  if (existing) {
    const recent = await db.reviewRequest.findFirst({
      where: {
        businessId: business.id,
        customerId: existing.id,
        createdAt: { gte: new Date(Date.now() - REREQUEST_COOLDOWN_DAYS * DAY) },
        status: { not: "failed" },
      },
    });
    if (recent) return fail(`Already asked in the last ${REREQUEST_COOLDOWN_DAYS} days`);
  }

  const customer = await db.customer.upsert({
    where: { businessId_phone: { businessId: business.id, phone } },
    update: { name, consent: true },
    create: { businessId: business.id, name, phone, consent: true },
  });

  const code = shortCode();
  const request = await db.reviewRequest.create({
    data: { businessId: business.id, customerId: customer.id, createdById: userId, code },
  });

  const res = await sendWhatsApp({
    businessId: business.id,
    to: phone,
    kind: "review_request",
    lang: business.language,
    vars: [firstName(name), business.name, publicLink(business.slug, code)],
  });

  if (!res.ok) {
    await db.reviewRequest.update({ where: { id: request.id }, data: { status: "failed" } });
    return fail(`WhatsApp send failed: ${res.error}`);
  }
  await db.reviewRequest.update({
    where: { id: request.id },
    data: {
      status: "sent",
      sentAt: new Date(),
      reminderDueAt: new Date(Date.now() + REMINDER_DELAY_HOURS * HOUR),
    },
  });
  return { ok: true, name, phone };
}

/** One reminder only, and only if the link was never opened. Run from the cron tick. */
export async function sendDueReminders(now = new Date()) {
  const due = await db.reviewRequest.findMany({
    where: {
      status: "sent",
      clickedAt: null,
      reminderSentAt: null,
      reminderDueAt: { lte: now },
    },
    include: { business: true, customer: true },
    take: 200,
  });

  let sent = 0;
  let skipped = 0;
  for (const r of due) {
    // claim the row first so overlapping cron runs can't double-send
    const claimed = await db.reviewRequest.updateMany({
      where: { id: r.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claimed.count === 0) continue;

    const quota = await canSendCustomerMessage(r.business);
    if (r.customer.optedOut || !quota.ok) {
      skipped++;
      continue;
    }
    const res = await sendWhatsApp({
      businessId: r.businessId,
      to: r.customer.phone,
      kind: "review_reminder",
      lang: r.business.language,
      vars: [firstName(r.customer.name), r.business.name, publicLink(r.business.slug, r.code)],
    });
    if (res.ok) sent++;
    else skipped++;
  }
  return { sent, skipped };
}
