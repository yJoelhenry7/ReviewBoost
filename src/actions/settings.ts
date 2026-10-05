"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { parseGoogleInput } from "@/lib/links";
import { normalizePhone } from "@/lib/phone";
import { requireOwner } from "@/lib/session";
import type { FormState } from "./auth";

export async function updateBusiness(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireOwner();
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter your business name" };
  const phone = normalizePhone(String(fd.get("ownerPhone") ?? ""));
  if (!phone) return { error: "Enter a valid WhatsApp number for alerts" };
  const google = parseGoogleInput(String(fd.get("google") ?? ""));
  const lang = fd.get("language") === "te" ? "te" : "en";

  await db.business.update({
    where: { id: user.businessId },
    data: {
      name: name.slice(0, 80),
      city: String(fd.get("city") ?? "").trim().slice(0, 60) || null,
      ownerPhone: phone,
      language: lang,
      funnelEnabled: fd.get("funnelEnabled") === "on",
      placeId: google.placeId ?? null,
      reviewUrl: google.reviewUrl ?? null,
    },
  });
  revalidatePath("/app", "layout");
  return { ok: "Saved" };
}

const staffSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  email: z.email("Enter a valid email").transform((s) => s.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function addStaff(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireOwner();
  const p = staffSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  if (await db.user.findUnique({ where: { email: p.data.email } })) {
    return { error: "That email is already registered" };
  }
  await db.user.create({
    data: {
      businessId: user.businessId,
      name: p.data.name,
      email: p.data.email,
      passwordHash: await bcrypt.hash(p.data.password, 10),
      role: "RECEPTIONIST",
    },
  });
  revalidatePath("/app/settings");
  return { ok: `Added ${p.data.name}. They can log in and send requests.` };
}

export async function removeStaff(fd: FormData) {
  const user = await requireOwner();
  await db.user.deleteMany({
    where: { id: String(fd.get("id")), businessId: user.businessId, role: "RECEPTIONIST" },
  });
  revalidatePath("/app/settings");
}

export async function subscribe(fd: FormData) {
  const user = await requireOwner();
  const plan = String(fd.get("plan"));
  if (plan !== "starter" && plan !== "growth") return;
  const planId = config.razorpay.plans[plan];
  if (!config.razorpay.keyId || !planId) {
    redirect("/app/settings?billing=unconfigured");
  }
  const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString("base64"),
    },
    body: JSON.stringify({
      plan_id: planId,
      total_count: 120,
      customer_notify: 1,
      notes: { businessId: user.businessId, plan },
    }),
  });
  const json = (await res.json()) as { id?: string; short_url?: string; error?: { description?: string } };
  if (!res.ok || !json.short_url || !json.id) {
    console.error("[razorpay] create subscription failed", json);
    redirect("/app/settings?billing=error");
  }
  await db.business.update({ where: { id: user.businessId }, data: { razorpaySubId: json.id } });
  redirect(json.short_url);
}
