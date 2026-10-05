import { createHash } from "node:crypto";
import { config } from "./config";

export type FetchedReview = {
  externalId: string;
  authorName: string;
  stars: number;
  text: string | null;
  reviewedAt: Date;
};

export type PlaceSummary = { rating: number | null; total: number | null; reviews: FetchedReview[] };

/**
 * Reads the 5 most recent reviews through the Places API (New). This is the
 * fallback until Google Business Profile API access is approved; that API
 * returns all reviews and allows posting replies.
 */
export async function fetchPlace(placeId: string): Promise<PlaceSummary | null> {
  if (!config.googlePlacesKey) return null;
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": config.googlePlacesKey,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
      },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    console.error("[google] places error", res.status, await res.text());
    return null;
  }
  const json = (await res.json()) as {
    rating?: number;
    userRatingCount?: number;
    reviews?: {
      name?: string;
      rating?: number;
      text?: { text?: string };
      originalText?: { text?: string };
      publishTime?: string;
      authorAttribution?: { displayName?: string };
    }[];
  };
  const reviews = (json.reviews ?? []).map((r) => {
    const author = r.authorAttribution?.displayName ?? "A customer";
    const text = r.originalText?.text ?? r.text?.text ?? null;
    return {
      externalId:
        r.name ?? createHash("sha1").update(`${author}|${r.publishTime}|${text}`).digest("hex"),
      authorName: author,
      stars: Math.min(5, Math.max(1, Math.round(r.rating ?? 5))),
      text,
      reviewedAt: r.publishTime ? new Date(r.publishTime) : new Date(),
    };
  });
  return { rating: json.rating ?? null, total: json.userRatingCount ?? null, reviews };
}
