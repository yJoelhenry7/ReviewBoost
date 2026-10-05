import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";
import { db } from "@/lib/db";

// Meta webhook verification handshake
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === config.whatsappVerifyToken && config.whatsappVerifyToken) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type Payload = {
  entry?: {
    changes?: {
      value?: {
        statuses?: { id: string; status: string; errors?: { title?: string }[] }[];
        messages?: { from: string; text?: { body?: string } }[];
      };
    }[];
  }[];
};

const STOP_WORDS = new Set(["stop", "unsubscribe", "cancel", "opt out", "optout"]);

export async function POST(req: Request) {
  const raw = await req.text();

  if (config.whatsappAppSecret) {
    const sig = (req.headers.get("x-hub-signature-256") ?? "").replace("sha256=", "");
    const expected = createHmac("sha256", config.whatsappAppSecret).update(raw).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("bad signature", { status: 401 });
  } else if (config.whatsappProvider === "meta") {
    return new Response("WHATSAPP_APP_SECRET not configured", { status: 503 });
  }

  let payload: Payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const s of change.value?.statuses ?? []) {
        const status = ["delivered", "read", "failed"].includes(s.status) ? s.status : null;
        if (status) {
          await db.messageLog.updateMany({
            where: { providerId: s.id },
            data: { status, error: status === "failed" ? (s.errors?.[0]?.title ?? "failed") : undefined },
          });
        }
      }
      for (const m of change.value?.messages ?? []) {
        if (STOP_WORDS.has((m.text?.body ?? "").trim().toLowerCase())) {
          await db.customer.updateMany({ where: { phone: m.from }, data: { optedOut: true } });
        }
      }
    }
  }
  return Response.json({ ok: true });
}
