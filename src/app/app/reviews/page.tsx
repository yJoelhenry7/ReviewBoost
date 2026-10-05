import Link from "next/link";
import { addManualReview, regenerateReply, setReviewStatus, syncNow } from "@/actions/reviews";
import { ActionForm } from "@/components/Form";
import { Badge, Button, Card, Field, inputCls, Stars } from "@/components/ui";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/session";

export const metadata = { title: "Reviews – ReviewBoost" };

const statusTone = { pending: "amber", approved: "indigo", posted: "green", skipped: "slate" } as const;

export default async function ReviewsPage() {
  const user = await requireOwner();
  const reviews = await db.googleReview.findMany({
    where: { businessId: user.businessId },
    orderBy: { reviewedAt: "desc" },
    take: 50,
  });

  return (
    <>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Google reviews</h2>
          <p className="text-xs text-slate-500">
            New reviews are checked automatically and you get a WhatsApp alert with a ready reply.
            {user.business.lastSyncedAt && ` Last checked ${user.business.lastSyncedAt.toLocaleString("en-IN")}.`}
          </p>
        </div>
        <ActionForm action={syncNow} submit="Check for new reviews" variant="secondary" className="flex flex-col items-end gap-2">
          <></>
        </ActionForm>
      </Card>

      {reviews.length === 0 && (
        <Card className="text-center text-sm text-slate-500">
          No reviews yet. They appear after the first sync, or add one manually below.
        </Card>
      )}

      {reviews.map((r) => (
        <Card key={r.id} className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{r.authorName}</div>
              <div className="text-xs text-slate-500">{r.reviewedAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}</div>
            </div>
            <div className="flex items-center gap-2">
              <Stars n={r.stars} />
              <Badge tone={statusTone[r.replyStatus as keyof typeof statusTone]}>{r.replyStatus}</Badge>
            </div>
          </div>
          <p className="text-sm text-slate-700">{r.text || <em className="text-slate-400">Rating only</em>}</p>
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <div className="mb-1 text-xs font-medium uppercase text-slate-500">
              {r.replyText ? "Approved reply" : "Suggested reply"}
            </div>
            {r.replyText ?? r.suggestedReply}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/reply/${r.approveToken}`}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {r.replyStatus === "pending" ? "Review & approve" : "Open reply"}
            </Link>
            {r.replyStatus === "approved" && (
              <form action={setReviewStatus}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="status" value="posted" />
                <Button variant="secondary">Mark as posted on Google</Button>
              </form>
            )}
            {r.replyStatus === "pending" && (
              <>
                <form action={regenerateReply}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button variant="ghost">Regenerate</Button>
                </form>
                <form action={setReviewStatus}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="skipped" />
                  <Button variant="ghost">Skip</Button>
                </form>
              </>
            )}
          </div>
        </Card>
      ))}

      <Card>
        <h3 className="mb-1 font-semibold">Add a review manually</h3>
        <p className="mb-3 text-xs text-slate-500">
          Useful until automatic reading is set up, or to test the alert + reply flow.
        </p>
        <ActionForm action={addManualReview} submit="Add review" variant="secondary">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Reviewer name"><input name="author" required className={inputCls} /></Field>
            <Field label="Stars">
              <select name="stars" defaultValue="5" className={inputCls}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Review text"><textarea name="text" rows={3} className={inputCls} /></Field>
        </ActionForm>
      </Card>
    </>
  );
}
