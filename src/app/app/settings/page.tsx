import { addStaff, removeStaff, subscribe, updateBusiness } from "@/actions/settings";
import { ActionForm } from "@/components/Form";
import { Badge, Button, Card, Field, Notice, inputCls } from "@/components/ui";
import { PLANS } from "@/lib/config";
import { db } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { requireOwner } from "@/lib/session";

export const metadata = { title: "Settings – ReviewBoost" };

export default async function SettingsPage({ searchParams }: PageProps<"/app/settings">) {
  const user = await requireOwner();
  const sp = await searchParams;
  const b = user.business;
  const staff = await db.user.findMany({ where: { businessId: b.id, role: "RECEPTIONIST" } });
  const google = b.reviewUrl ?? b.placeId ?? "";

  return (
    <>
      {sp.billing === "unconfigured" && <Notice>Online payments aren&apos;t set up yet. Add the Razorpay keys and plan IDs to your environment.</Notice>}
      {sp.billing === "error" && <Notice tone="red">Couldn&apos;t start the subscription. Please try again.</Notice>}

      <Card>
        <h2 className="mb-4 font-semibold">Business</h2>
        <ActionForm action={updateBusiness} submit="Save changes">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Business name"><input name="name" defaultValue={b.name} required className={inputCls} /></Field>
            <Field label="City"><input name="city" defaultValue={b.city ?? ""} className={inputCls} /></Field>
          </div>
          <Field label="Google Place ID or review link" hint="Needed for the QR code, WhatsApp links and review monitoring.">
            <input name="google" defaultValue={google} placeholder="ChIJ… or https://g.page/r/…/review" className={inputCls} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="WhatsApp number for alerts">
              <input name="ownerPhone" defaultValue={b.ownerPhone ? formatPhone(b.ownerPhone) : ""} required className={inputCls} />
            </Field>
            <Field label="Customer message language">
              <select name="language" defaultValue={b.language} className={inputCls}>
                <option value="en">English</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </Field>
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" name="funnelEnabled" defaultChecked={b.funnelEnabled} className="mt-0.5" />
            <span>
              Ask &quot;How was your experience?&quot; before the Google page
              <span className="block text-xs text-slate-500">
                Everyone can still post on Google: unhappy customers see a private feedback form plus a visible Google link, as Google&apos;s policy requires.
              </span>
            </span>
          </label>
        </ActionForm>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-semibold">Plan</h2>
          <Badge tone={b.subscriptionStatus === "active" ? "green" : "amber"}>{b.subscriptionStatus}</Badge>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Current: <b>{PLANS[b.plan as keyof typeof PLANS]?.label ?? b.plan}</b> · {b.monthlyMsgLimit} messages/month
          {b.subscriptionStatus === "trialing" && ` · trial ends ${b.trialEndsAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}`}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {(["starter", "growth"] as const).map((k) => (
            <div key={k} className="rounded-lg border border-slate-200 p-4">
              <div className="font-medium">{PLANS[k].label}</div>
              <div className="text-2xl font-semibold">₹{PLANS[k].price}<span className="text-sm font-normal text-slate-500">/month</span></div>
              <div className="mb-3 text-xs text-slate-500">{PLANS[k].msgLimit} customer messages per month</div>
              <form action={subscribe}>
                <input type="hidden" name="plan" value={k} />
                <Button disabled={b.subscriptionStatus === "active" && b.plan === k}>
                  {b.subscriptionStatus === "active" && b.plan === k ? "Current plan" : `Choose ${PLANS[k].label}`}
                </Button>
              </form>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Reception staff</h2>
        <p className="mb-4 text-sm text-slate-500">Staff can only send review requests. They can&apos;t see ratings, reviews or settings.</p>
        {staff.length > 0 && (
          <ul className="mb-4 divide-y divide-slate-100 text-sm">
            {staff.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span>{s.name} <span className="text-slate-500">· {s.email}</span></span>
                <form action={removeStaff}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button variant="ghost" className="text-rose-600">Remove</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={addStaff} submit="Add staff login" variant="secondary">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Name"><input name="name" required className={inputCls} /></Field>
            <Field label="Email"><input name="email" type="email" required className={inputCls} /></Field>
            <Field label="Password"><input name="password" type="password" minLength={8} required className={inputCls} /></Field>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
