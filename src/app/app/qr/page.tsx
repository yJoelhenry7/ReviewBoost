import { Card, Notice } from "@/components/ui";
import { CopyButton, PrintButton } from "@/components/QrTools";
import { googleReviewUrl, publicLink } from "@/lib/links";
import { requireOwner } from "@/lib/session";

export const metadata = { title: "QR & link – ReviewBoost" };

export default async function QrPage() {
  const { business: b } = await requireOwner();
  const link = publicLink(b.slug);
  const te = b.language === "te";

  return (
    <>
      <div className="print:hidden">
        <h1 className="text-lg font-semibold">Review link &amp; QR code</h1>
        <p className="text-sm text-slate-500">Put the poster at reception. Customers scan and land straight on your review page.</p>
      </div>

      {!googleReviewUrl(b) && (
        <Notice>Add your Google Place ID or review link in Settings so the link can reach Google.</Notice>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_320px] print:block">
        <Card className="print:hidden">
          <div className="text-xs font-medium uppercase text-slate-500">Your short link</div>
          <div className="mt-1 break-all rounded-lg bg-slate-50 p-3 font-mono text-sm">{link}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={link} />
            <PrintButton />
            <a href={`/api/qr/${b.slug}?size=1200&download=1`} className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Download QR (PNG)
            </a>
          </div>
        </Card>

        <div className="mx-auto w-full max-w-sm rounded-2xl border-2 border-indigo-600 bg-white p-8 text-center print:max-w-none print:border-4 print:p-16">
          <div className="text-2xl font-bold text-slate-900 print:text-5xl">{b.name}</div>
          <div className="mt-2 text-slate-600 print:mt-6 print:text-2xl">
            {te ? "మా సేవ నచ్చిందా? రివ్యూ ఇవ్వడానికి స్కాన్ చేయండి." : "Happy with our service? Scan to review us."}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/qr/${b.slug}?size=800`} alt="QR code" className="mx-auto mt-5 w-56 print:mt-10 print:w-96" />
          <div className="mt-4 text-yellow-500 print:text-5xl">★★★★★</div>
        </div>
      </div>
    </>
  );
}
