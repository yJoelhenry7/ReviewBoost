"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { createReviewRequest } from "@/lib/requests";
import { requireUser } from "@/lib/session";
import type { FormState } from "./auth";

const MAX_ROWS = 200;

export async function sendRequest(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const res = await createReviewRequest(user.business, user.id, {
    name: String(fd.get("name") ?? ""),
    phone: String(fd.get("phone") ?? ""),
    consent: fd.get("consent") === "on",
  });
  revalidatePath("/app/requests");
  if (!res.ok) return { error: res.error };
  return { ok: `Review request sent to ${res.name}` };
}

export async function uploadRequests(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file" };
  if (file.size > 1_000_000) return { error: "File is too large (max 1 MB)" };
  if (fd.get("consent") !== "on") return { error: "Please confirm the customers agreed to be contacted" };

  const parsed = Papa.parse<Record<string, string>>(await file.text(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const rows = parsed.data;
  if (rows.length === 0) return { error: "No rows found. The file needs a header row with 'name' and 'phone' columns" };
  if (rows.length > MAX_ROWS) return { error: `Too many rows (max ${MAX_ROWS} per upload)` };

  const pick = (r: Record<string, string>, keys: string[]) => {
    for (const k of keys) if (r[k]) return r[k];
    return "";
  };
  if (!rows.some((r) => pick(r, ["phone", "mobile", "number", "whatsapp"]))) {
    return { error: "Couldn't find a 'phone' column in the header row" };
  }

  let sent = 0;
  const problems: string[] = [];
  for (const [i, r] of rows.entries()) {
    const name = pick(r, ["name", "patient", "customer"]);
    const phone = pick(r, ["phone", "mobile", "number", "whatsapp"]);
    const res = await createReviewRequest(user.business, user.id, { name, phone, consent: true });
    if (res.ok) sent++;
    else problems.push(`Row ${i + 2} (${name || "no name"}, ${phone || "no phone"}): ${res.error}`);
  }
  revalidatePath("/app/requests");
  return {
    ok: `Sent ${sent} of ${rows.length}.${problems.length ? ` ${problems.length} skipped:` : ""}`,
    details: problems,
  };
}
