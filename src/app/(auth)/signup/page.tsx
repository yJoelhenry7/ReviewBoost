import Link from "next/link";
import { signup } from "@/actions/auth";
import { ActionForm } from "@/components/Form";
import { Card, Field, inputCls } from "@/components/ui";
import { TRIAL_DAYS } from "@/lib/config";

export const metadata = { title: "Start free trial – ReviewBoost" };

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 text-center text-xl font-semibold text-indigo-600">ReviewBoost</Link>
      <Card>
        <h1 className="text-lg font-semibold">Start your {TRIAL_DAYS}-day free trial</h1>
        <p className="mb-4 text-sm text-slate-500">No card needed. Set up in about 2 minutes.</p>
        <ActionForm action={signup} submit="Create account">
          <Field label="Business name">
            <input name="businessName" required placeholder="Smile Dental" className={inputCls} />
          </Field>
          <Field label="City">
            <input name="city" placeholder="Vijayawada" className={inputCls} />
          </Field>
          <Field label="Google review link or Place ID" hint="Optional now, you can add it later in Settings. Find your Place ID at developers.google.com/maps/documentation/places/web-service/place-id">
            <input name="google" placeholder="ChIJ… or https://g.page/r/…/review" className={inputCls} />
          </Field>
          <Field label="Your WhatsApp number" hint="Low-rating and new-review alerts are sent here.">
            <input name="ownerPhone" type="tel" required placeholder="98765 43210" className={inputCls} />
          </Field>
          <hr className="border-slate-200" />
          <Field label="Your name">
            <input name="ownerName" required autoComplete="name" className={inputCls} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required autoComplete="email" className={inputCls} />
          </Field>
          <Field label="Password" hint="At least 8 characters">
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
          </Field>
        </ActionForm>
      </Card>
      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account? <Link href="/login" className="font-medium text-indigo-600">Log in</Link>
      </p>
    </main>
  );
}
