import { notFound } from "next/navigation";
import ReplyEditor from "@/components/ReplyEditor";
import { Card, Stars } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Approve reply", robots: { index: false } };

export default async function ReplyPage({ params }: PageProps<"/reply/[token]">) {
  const { token } = await params;
  const review = await db.googleReview.findUnique({
    where: { approveToken: token },
    include: { business: true },
  });
  if (!review) notFound();

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-8">
      <div className="text-sm font-semibold text-indigo-600">{review.business.name}</div>
      <Card>
        <div className="flex items-center justify-between">
          <div className="font-medium">{review.authorName}</div>
          <Stars n={review.stars} />
        </div>
        <p className="mt-2 text-sm text-slate-700">{review.text || <em className="text-slate-400">Rating only, no text</em>}</p>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Suggested reply</h2>
        <ReplyEditor
          token={token}
          initial={review.replyText ?? review.suggestedReply ?? ""}
          approved={review.replyStatus === "approved" || review.replyStatus === "posted"}
        />
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-slate-500">
          <li>Approve (saves your final wording) and tap Copy reply.</li>
          <li>Open Google reviews, find this review, tap Reply and paste.</li>
        </ol>
      </Card>
    </main>
  );
}
