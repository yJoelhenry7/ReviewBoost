import { resolveFeedback } from "@/actions/feedback";
import { Badge, Button, Card, Stars } from "@/components/ui";
import { db } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { requireOwner } from "@/lib/session";

export const metadata = { title: "Feedback – ReviewBoost" };

export default async function FeedbackPage() {
  const user = await requireOwner();
  const items = await db.rating.findMany({
    where: { businessId: user.businessId, stars: { lte: 3 } },
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">Private feedback</h1>
        <p className="text-sm text-slate-500">Ratings of 1 to 3 stars. Call them back while the visit is fresh.</p>
      </div>
      {items.length === 0 && <Card className="text-center text-sm text-slate-500">No low ratings. 🎉</Card>}
      {items.map((r) => (
        <Card key={r.id} className={`space-y-2 ${r.resolved ? "opacity-60" : ""}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{r.contactName || "Anonymous"}</div>
              {r.contactPhone && (
                <a href={`tel:+${r.contactPhone}`} className="text-sm text-indigo-600">{formatPhone(r.contactPhone)}</a>
              )}
            </div>
            <div className="text-right">
              <Stars n={r.stars} />
              <div className="text-xs text-slate-500">{r.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
            </div>
          </div>
          <p className="text-sm text-slate-700">{r.feedback || <em className="text-slate-400">No message left</em>}</p>
          <div className="flex items-center gap-2">
            <Badge tone={r.source === "qr" ? "slate" : "indigo"}>{r.source === "qr" ? "QR scan" : "WhatsApp"}</Badge>
            {r.wentToGoogle && <Badge tone="amber">Also went to Google</Badge>}
            <form action={resolveFeedback} className="ml-auto">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="resolved" value={String(!r.resolved)} />
              <Button variant="secondary" className="px-3 py-1 text-xs">{r.resolved ? "Reopen" : "Mark resolved"}</Button>
            </form>
          </div>
        </Card>
      ))}
    </>
  );
}
