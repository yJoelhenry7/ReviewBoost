import Link from "next/link";
import { Card, Notice, Stars, Stat } from "@/components/ui";
import { googleReviewUrl } from "@/lib/links";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/session";
import { dashboardStats } from "@/lib/stats";

export const metadata = { title: "Dashboard – ReviewBoost" };

function delta(a: number, b: number | null) {
  if (b === null) return null;
  const d = a - b;
  return `${d >= 0 ? "▲" : "▼"} ${Math.abs(d)} vs last month`;
}

export default async function Dashboard() {
  const user = await requireOwner();
  const s = await dashboardStats(user.businessId);
  const pendingReplies = await db.googleReview.count({
    where: { businessId: user.businessId, replyStatus: "pending" },
  });
  const setupMissing = !googleReviewUrl(s.business);
  const f = s.funnel;

  return (
    <>
      {setupMissing && (
        <Notice>
          Add your Google Place ID or review link in <Link href="/app/settings" className="font-medium underline">Settings</Link> to start sending requests.
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total Google reviews" value={s.totalReviews ?? "–"} sub={s.totalReviews == null ? "Appears after the first sync" : undefined} />
        <Stat
          label="Average rating"
          value={s.averageRating ? s.averageRating.toFixed(1) : "–"}
          sub={s.averageRating ? <Stars n={Math.round(s.averageRating)} /> : undefined}
        />
        <Stat label="New reviews this month" value={s.gainedThis} sub={delta(s.gainedThis, s.gainedLast)} />
        <Stat
          label="Requests this month"
          value={s.requests.thisMonth}
          sub={delta(s.requests.thisMonth, s.requests.lastMonth)}
        />
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">This month&apos;s funnel</h2>
        <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-5">
          {[
            ["Requests sent", f.sent],
            ["Link opened", f.clicked],
            ["Rated", f.rated],
            ["Sent to Google", f.toGoogle],
            ["QR scans", s.scans],
          ].map(([label, n]) => (
            <div key={label as string}>
              <div className="text-2xl font-semibold">{n}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Open rate: {f.clickRate}% · Messages used: {s.messages.used}/{s.messages.limit}
        </p>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Link href="/app/feedback">
          <Card className="transition hover:border-indigo-300">
            <div className="text-sm text-slate-500">Unresolved low ratings</div>
            <div className={`text-2xl font-semibold ${s.lowRatings ? "text-rose-600" : ""}`}>{s.lowRatings}</div>
          </Card>
        </Link>
        <Link href="/app/reviews">
          <Card className="transition hover:border-indigo-300">
            <div className="text-sm text-slate-500">Reviews waiting for a reply</div>
            <div className={`text-2xl font-semibold ${pendingReplies ? "text-amber-600" : ""}`}>{pendingReplies}</div>
          </Card>
        </Link>
      </div>
    </>
  );
}
