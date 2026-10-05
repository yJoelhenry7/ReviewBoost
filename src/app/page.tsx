import Link from "next/link";
import { PLANS, TRIAL_DAYS } from "@/lib/config";

const FEATURES = [
  ["QR code & short link", "A printable poster for reception that opens your Google review box in one scan."],
  ["WhatsApp review requests", "Enter a name and number after the visit (or upload the day's list). We send a polite message and one reminder."],
  ["Unhappy-customer alerts", "1–3 star customers get a private feedback form and you get a WhatsApp alert to call and fix it. Everyone can still post on Google."],
  ["Review alerts + AI replies", "A WhatsApp ping for each new review with a ready reply. Approve in one tap. Replying helps you rank higher."],
  ["Simple dashboard", "Total reviews, average rating, this month vs last, and how many requests were opened. Proof it's working."],
  ["English & తెలుగు", "Customer messages and the rating page work in Telugu too."],
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-4">
      <header className="flex items-center justify-between py-5">
        <span className="text-xl font-semibold text-indigo-600">ReviewBoost</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-slate-600 hover:text-slate-900">Log in</Link>
          <Link href="/signup" className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Start free trial</Link>
        </nav>
      </header>

      <section className="py-16 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Get more Google reviews, on autopilot
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Happy customers will review you if someone simply asks at the right time. ReviewBoost asks for you on WhatsApp, flags unhappy customers
          so you can fix problems, and helps you reply to every review.
        </p>
        <Link href="/signup" className="mt-8 inline-block rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700">
          Start your {TRIAL_DAYS}-day free trial
        </Link>
        <p className="mt-2 text-xs text-slate-500">No card needed</p>
      </section>

      <section className="grid gap-4 pb-16 md:grid-cols-3">
        {FEATURES.map(([t, d]) => (
          <div key={t} className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-slate-600">{d}</p>
          </div>
        ))}
      </section>

      <section className="pb-20 text-center">
        <h2 className="text-2xl font-semibold">Simple pricing</h2>
        <div className="mx-auto mt-6 grid max-w-2xl gap-4 md:grid-cols-2">
          {(["starter", "growth"] as const).map((k) => (
            <div key={k} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="font-medium">{PLANS[k].label}</div>
              <div className="mt-1 text-3xl font-bold">₹{PLANS[k].price}<span className="text-sm font-normal text-slate-500">/month</span></div>
              <div className="mt-1 text-sm text-slate-600">{PLANS[k].msgLimit} WhatsApp requests per month</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} ReviewBoost · Not affiliated with Google. Google and Google Maps are trademarks of Google LLC.
      </footer>
    </main>
  );
}
