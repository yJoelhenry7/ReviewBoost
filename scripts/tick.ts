// Local/self-hosted equivalent of GET /api/cron/tick:
//   npx tsx --env-file=.env scripts/tick.ts
import { sendDueReminders } from "../src/lib/requests";
import { syncAllBusinesses } from "../src/lib/reviews";

async function main() {
  console.log("reminders:", await sendDueReminders());
  console.log("reviews:", await syncAllBusinesses());
}

main().then(() => process.exit(0), (e) => {
  console.error(e);
  process.exit(1);
});
