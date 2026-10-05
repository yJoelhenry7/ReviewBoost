"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ingestReview, syncBusinessReviews } from "@/lib/reviews";
import { requireOwner } from "@/lib/session";
import { suggestReply } from "@/lib/ai";
import type { FormState } from "./auth";

const replySchema = z.string().trim().min(1, "Reply can't be empty").max(4000);

/** Used by both the owner dashboard (by id, session-checked) and the public one-tap page (by secret token). */
export async function approveByToken(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get("token") ?? "");
  const text = replySchema.safeParse(fd.get("reply"));
  if (!text.success) return { error: text.error.issues[0].message };
  const r = await db.googleReview.updateMany({
    where: { approveToken: token },
    data: { replyText: text.data, replyStatus: "approved" },
  });
  if (!r.count) return { error: "This link is no longer valid" };
  revalidatePath(`/reply/${token}`);
  revalidatePath("/app/reviews");
  return { ok: "Approved. Copy the reply and paste it on Google (see steps below)." };
}

export async function setReviewStatus(fd: FormData) {
  const user = await requireOwner();
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  if (!["posted", "skipped", "pending"].includes(status)) return;
  await db.googleReview.updateMany({
    where: { id, businessId: user.businessId },
    data: { replyStatus: status },
  });
  revalidatePath("/app/reviews");
}

export async function regenerateReply(fd: FormData) {
  const user = await requireOwner();
  const review = await db.googleReview.findFirst({
    where: { id: String(fd.get("id")), businessId: user.businessId },
  });
  if (!review) return;
  const suggestedReply = await suggestReply({
    businessName: user.business.name,
    authorName: review.authorName,
    stars: review.stars,
    text: review.text,
  });
  await db.googleReview.update({ where: { id: review.id }, data: { suggestedReply } });
  revalidatePath("/app/reviews");
}

export async function syncNow(): Promise<FormState> {
  const user = await requireOwner();
  if (!user.business.placeId) return { error: "Add your Google Place ID in Settings first" };
  const out = await syncBusinessReviews(user.business);
  revalidatePath("/app/reviews");
  revalidatePath("/app");
  if (out.fetched === 0) {
    return { error: "Nothing fetched. Check GOOGLE_PLACES_API_KEY and your Place ID, or add reviews manually below." };
  }
  return { ok: `Checked ${out.fetched} recent reviews, ${out.added} new.` };
}

/** Manual entry: lets owners paste a review (and doubles as a demo/test tool). Triggers the real alert flow. */
export async function addManualReview(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireOwner();
  const stars = Number(fd.get("stars"));
  const author = String(fd.get("author") ?? "").trim().slice(0, 80);
  const text = String(fd.get("text") ?? "").trim().slice(0, 4000);
  if (!author || !(stars >= 1 && stars <= 5)) return { error: "Enter the reviewer's name and a rating" };
  await ingestReview(
    user.business,
    {
      externalId: `manual_${randomBytes(6).toString("hex")}`,
      authorName: author,
      stars: Math.round(stars),
      text: text || null,
      reviewedAt: new Date(),
    },
    { alert: true },
  );
  revalidatePath("/app/reviews");
  return { ok: "Review added. The owner alert and a suggested reply have been generated." };
}
