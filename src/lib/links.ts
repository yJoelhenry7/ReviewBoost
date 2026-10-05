import { randomBytes } from "node:crypto";
import type { Business } from "@prisma/client";
import { config } from "./config";

export function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `${base || "biz"}-${randomBytes(2).toString("hex")}`;
}

export function shortCode(bytes = 5) {
  return randomBytes(bytes).toString("base64url");
}

export function googleReviewUrl(b: Pick<Business, "placeId" | "reviewUrl">): string | null {
  if (b.reviewUrl) return b.reviewUrl;
  if (b.placeId) return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(b.placeId)}`;
  return null;
}

/** Public short link. With a request code it is personalised and tracked. */
export function publicLink(slug: string, requestCode?: string, source?: "qr") {
  const q = requestCode ? `?t=${requestCode}` : source ? `?s=${source}` : "";
  return `${config.appUrl}/r/${slug}${q}`;
}

export function approveLink(token: string) {
  return `${config.appUrl}/reply/${token}`;
}

/** Accepts a Place ID (ChIJ...) or any Google review/short link and splits it into DB fields. */
export function parseGoogleInput(input: string): { placeId?: string; reviewUrl?: string } {
  const v = input.trim();
  if (!v) return {};
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      const pid = u.searchParams.get("placeid");
      if (pid) return { placeId: pid };
    } catch {
      /* fall through */
    }
    return { reviewUrl: v };
  }
  return { placeId: v };
}
