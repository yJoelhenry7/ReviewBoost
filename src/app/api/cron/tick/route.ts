import { timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";
import { sendDueReminders } from "@/lib/requests";
import { syncAllBusinesses } from "@/lib/reviews";

export const maxDuration = 60;

function authorized(req: Request) {
  if (!config.cronSecret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${config.cronSecret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

/** Hit every 15-60 min by Vercel Cron / an external pinger. Sends due reminders and syncs reviews. */
async function tick(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  const [reminders, reviews] = await Promise.all([sendDueReminders(), syncAllBusinesses()]);
  return Response.json({ reminders, reviews });
}

export const GET = tick;
export const POST = tick;
