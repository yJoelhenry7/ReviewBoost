import { sendRequest, uploadRequests } from "@/actions/requests";
import { ActionForm } from "@/components/Form";
import { Badge, Card, Field, Notice, inputCls } from "@/components/ui";
import { messagesUsed } from "@/lib/billing";
import { db } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Send requests – ReviewBoost" };

const tone = { queued: "slate", sent: "indigo", clicked: "amber", rated: "green", failed: "red" } as const;

export default async function RequestsPage() {
  const user = await requireUser();
  const b = user.business;
  const [recent, used] = await Promise.all([
    db.reviewRequest.findMany({
      where: { businessId: b.id },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    messagesUsed(b.id),
  ]);

  return (
    <>
      {!b.placeId && !b.reviewUrl && (
        <Notice>Add your Google Place ID or review link in Settings before sending requests.</Notice>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-1 font-semibold">Ask one patient / customer</h2>
          <p className="mb-4 text-sm text-slate-500">
            {used}/{b.monthlyMsgLimit} messages used this month
          </p>
          <ActionForm action={sendRequest} submit="Send WhatsApp request">
            <Field label="Name">
              <input name="name" required autoComplete="off" placeholder="Ravi" className={inputCls} />
            </Field>
            <Field label="WhatsApp number">
              <input name="phone" type="tel" required inputMode="tel" autoComplete="off" placeholder="98765 43210" className={inputCls} />
            </Field>
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input type="checkbox" name="consent" required className="mt-0.5" />
              Customer agreed to receive a WhatsApp message from us
            </label>
          </ActionForm>
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">Upload the day&apos;s list</h2>
          <p className="mb-4 text-sm text-slate-500">CSV with columns <b>name</b> and <b>phone</b> (max 200 rows).</p>
          <ActionForm action={uploadRequests} submit="Upload & send" variant="secondary">
            <input name="file" type="file" accept=".csv,text/csv" required className="block w-full text-sm" />
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input type="checkbox" name="consent" required className="mt-0.5" />
              These customers agreed to receive a WhatsApp message from us
            </label>
          </ActionForm>
          <a href="data:text/csv;charset=utf-8,name%2Cphone%0ARavi%2C9876543210%0A" download="sample.csv" className="mt-3 inline-block text-xs text-indigo-600 underline">
            Download sample CSV
          </a>
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Sent</th>
              <th className="px-4 py-2">Reminder</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recent.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No requests yet</td></tr>
            )}
            {recent.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2">
                  <div className="font-medium">{r.customer.name}</div>
                  <div className="text-xs text-slate-500">{formatPhone(r.customer.phone)}</div>
                </td>
                <td className="px-4 py-2"><Badge tone={tone[r.status as keyof typeof tone] ?? "slate"}>{r.status}</Badge></td>
                <td className="px-4 py-2 text-slate-600">{r.sentAt ? r.sentAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "–"}</td>
                <td className="px-4 py-2 text-slate-600">
                  {r.reminderSentAt ? "Sent" : r.status === "sent" && r.reminderDueAt ? `Due ${r.reminderDueAt.toLocaleDateString("en-IN")}` : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
