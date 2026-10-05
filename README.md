# ReviewBoost

Google review growth for local businesses: QR/short link, WhatsApp review requests with one reminder,
a star-rating step with private feedback for unhappy customers, review alerts with AI-suggested replies,
and a dashboard. Next.js 16 + Prisma. Features 1 to 5 of the plan.

## Run locally

```bash
npm install
cp .env.example .env        # set AUTH_SECRET to a long random string
npx prisma db push          # creates prisma/dev.db (SQLite)
npx tsx --env-file=.env scripts/seed.ts   # optional demo data
npm run dev                 # http://localhost:3000
npm test                    # unit + flow tests (throwaway DB)
```

Demo logins after seeding: `owner@demo.test` / `demo12345` (owner), `desk@demo.test` / `demo12345` (reception).
Public rating page: `/r/smile-dental-demo`.

With `WHATSAPP_PROVIDER=mock` (default) messages are only logged to the console and the `MessageLog` table.
Run `npm run tick` to process due reminders and review sync by hand.

## Where things are

| Area | Files |
|---|---|
| Rating funnel (public) | `src/app/r/[slug]`, `src/lib/funnel.ts`, `src/app/api/public/*` |
| Requests + reminders | `src/lib/requests.ts`, `src/actions/requests.ts` |
| WhatsApp | `src/lib/whatsapp/` (templates, mock + Meta providers) |
| Reviews + AI replies | `src/lib/reviews.ts`, `src/lib/google.ts`, `src/lib/ai.ts`, `src/app/reply/[token]` |
| Dashboard | `src/lib/stats.ts`, `src/app/app/page.tsx` |
| Billing | `src/lib/billing.ts`, `src/actions/settings.ts`, `src/app/api/razorpay/webhook` |
| Scheduled work | `src/app/api/cron/tick` (`vercel.json`, every 30 min) |

## Go-live checklist (things only you can do)

1. **WhatsApp**: create a Meta Business account + WhatsApp Cloud API number, then submit the 4 templates from
   `src/lib/whatsapp/templates.ts` (`review_request` and `review_reminder` in en + te, `owner_low_rating`
   and `owner_new_review` in en). Set `WHATSAPP_PROVIDER=meta`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`,
   `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`; point the webhook at `/api/whatsapp/webhook`
   (handles delivery status and STOP opt-outs).
2. **Google**: set `GOOGLE_PLACES_API_KEY` (reads the 5 latest reviews and the rating/total).
   Apply for Google Business Profile API access to read all reviews and post replies automatically.
   Until then, "approve" saves the reply and the owner pastes it into Google (one tap to copy + open).
3. **AI replies**: set `ANTHROPIC_API_KEY` (falls back to built-in templates without it).
4. **Database**: switch `provider` in `prisma/schema.prisma` to `postgresql`, set `DATABASE_URL`
   (Supabase/Neon, Mumbai region), run `npx prisma db push`.
5. **Payments**: create 2 Razorpay plans, set the `RAZORPAY_*` vars, add the webhook `/api/razorpay/webhook`
   (events: `subscription.activated`, `charged`, `halted`, `cancelled`).
6. **Deploy** on Vercel, set `APP_URL`, a strong `AUTH_SECRET` and `CRON_SECRET`. Vercel Hobby only allows daily crons;
   use Pro or an external pinger sending `Authorization: Bearer $CRON_SECRET` to `/api/cron/tick`.
7. Add a privacy policy and terms (you store customer names and phone numbers).

## Notes

- Review gating: unhappy customers get a private form, but the "post on Google" link always stays visible (Google policy).
- Link clicks are tracked from the browser, not on page load, so WhatsApp's link-preview crawler doesn't cancel reminders.
- Customer messages (requests + reminders) count against the monthly plan limit; owner alerts don't.
- The in-memory rate limiter (`src/lib/ratelimit.ts`) is per instance; use Redis if you scale out.
