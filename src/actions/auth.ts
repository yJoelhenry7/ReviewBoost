"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PLANS, TRIAL_DAYS } from "@/lib/config";
import { db } from "@/lib/db";
import { parseGoogleInput, slugify } from "@/lib/links";
import { normalizePhone } from "@/lib/phone";
import { createSession, destroySession } from "@/lib/session";

export type FormState = { error?: string; ok?: string; details?: string[] } | undefined;

const signupSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name").max(80),
  city: z.string().trim().max(60).optional(),
  ownerName: z.string().trim().min(2, "Enter your name").max(80),
  email: z.email("Enter a valid email").transform((s) => s.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  ownerPhone: z.string().trim().min(1, "Enter the WhatsApp number for alerts"),
  google: z.string().trim().max(500).optional(),
});

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const phone = normalizePhone(d.ownerPhone);
  if (!phone) return { error: "Enter a valid WhatsApp number" };
  if (await db.user.findUnique({ where: { email: d.email } })) {
    return { error: "An account with this email already exists" };
  }

  const user = await db.user.create({
    data: {
      name: d.ownerName,
      email: d.email,
      passwordHash: await bcrypt.hash(d.password, 10),
      role: "OWNER",
      business: {
        create: {
          name: d.businessName,
          city: d.city || null,
          slug: slugify(d.businessName),
          ownerPhone: phone,
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400_000),
          monthlyMsgLimit: PLANS.trial.msgLimit,
          ...parseGoogleInput(d.google ?? ""),
        },
      },
    },
  });
  await createSession(user.id);
  redirect("/app");
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  // compare against a dummy hash when the user is missing so timing doesn't reveal accounts
  const hash = user?.passwordHash ?? "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) return { error: "Incorrect email or password" };
  await createSession(user.id);
  redirect(user.role === "OWNER" ? "/app" : "/app/requests");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
