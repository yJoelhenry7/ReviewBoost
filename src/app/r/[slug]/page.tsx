import { notFound } from "next/navigation";
import { findBusinessBySlug } from "@/lib/funnel";
import { googleReviewUrl } from "@/lib/links";
import Funnel from "./Funnel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const b = await findBusinessBySlug(slug);
  return { title: b ? `Review ${b.name}` : "Review", robots: { index: false } };
}

export default async function ReviewPage({ params, searchParams }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const business = await findBusinessBySlug(slug);
  if (!business) notFound();
  const code = typeof sp.t === "string" ? sp.t : undefined;

  return (
    <Funnel
      slug={business.slug}
      code={code}
      name={business.name}
      lang={business.language === "te" ? "te" : "en"}
      googleUrl={googleReviewUrl(business)}
      funnel={business.funnelEnabled}
    />
  );
}
