import { describe, expect, it } from "vitest";
import { templateReply } from "../src/lib/ai";
import { googleReviewUrl, parseGoogleInput, slugify } from "../src/lib/links";
import { formatPhone, normalizePhone } from "../src/lib/phone";
import { renderTemplate } from "../src/lib/whatsapp/templates";

describe("normalizePhone", () => {
  it("handles common Indian formats", () => {
    expect(normalizePhone("98765 43210")).toBe("919876543210");
    expect(normalizePhone("+91 98765-43210")).toBe("919876543210");
    expect(normalizePhone("09876543210")).toBe("919876543210");
    expect(normalizePhone("919876543210")).toBe("919876543210");
    expect(normalizePhone("0091 9876543210")).toBe("919876543210");
  });
  it("rejects bad numbers", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("abcdefghij")).toBeNull();
    expect(normalizePhone("5876543210")).toBeNull(); // Indian mobiles start 6-9
    expect(normalizePhone("")).toBeNull();
  });
  it("keeps other countries with +", () => {
    expect(normalizePhone("+14155552671")).toBe("14155552671");
  });
  it("formats", () => {
    expect(formatPhone("919876543210")).toBe("+91 98765 43210");
  });
});

describe("links", () => {
  it("parses place ids and urls", () => {
    expect(parseGoogleInput("ChIJabc")).toEqual({ placeId: "ChIJabc" });
    expect(parseGoogleInput("https://g.page/r/xyz/review")).toEqual({ reviewUrl: "https://g.page/r/xyz/review" });
    expect(parseGoogleInput("https://search.google.com/local/writereview?placeid=ChIJq")).toEqual({ placeId: "ChIJq" });
    expect(parseGoogleInput("  ")).toEqual({});
  });
  it("builds the review url", () => {
    expect(googleReviewUrl({ placeId: "ChIJ x", reviewUrl: null })).toBe(
      "https://search.google.com/local/writereview?placeid=ChIJ%20x",
    );
    expect(googleReviewUrl({ placeId: "a", reviewUrl: "https://g.page/r/z" })).toBe("https://g.page/r/z");
    expect(googleReviewUrl({ placeId: null, reviewUrl: null })).toBeNull();
  });
  it("slugifies uniquely", () => {
    const a = slugify("Smile Dental!");
    expect(a).toMatch(/^smile-dental-[0-9a-f]{4}$/);
    expect(slugify("తెలుగు")).toMatch(/^biz-/);
  });
});

describe("templates", () => {
  it("renders variables and includes opt-out", () => {
    const m = renderTemplate("review_request", "en", ["Ravi", "Smile Dental", "https://x/r/a?t=b"]);
    expect(m).toContain("Smile Dental, Ravi!");
    expect(m).toContain("https://x/r/a?t=b");
    expect(m).toContain("STOP");
  });
  it("renders telugu", () => {
    expect(renderTemplate("review_reminder", "te", ["రవి", "స్మైల్", "L"])).toContain("రవి");
  });
});

describe("templateReply", () => {
  const base = { businessName: "Smile Dental", authorName: "Priya Rao", text: "Great" };
  it("thanks happy customers", () => {
    expect(templateReply({ ...base, stars: 5 })).toMatch(/Thank you so much, Priya/);
  });
  it("apologises to unhappy customers", () => {
    expect(templateReply({ ...base, stars: 1 })).toMatch(/sorry/i);
  });
});
