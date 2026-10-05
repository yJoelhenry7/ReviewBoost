// Demo data: npx tsx --env-file=.env scripts/seed.ts
// Logins: owner@demo.test / demo12345  and  desk@demo.test / demo12345
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { ingestReview } from "../src/lib/reviews";

async function main() {
  const email = "owner@demo.test";
  if (await db.user.findUnique({ where: { email } })) {
    console.log("Demo data already exists.");
    return;
  }
  const hash = await bcrypt.hash("demo12345", 10);
  const user = await db.user.create({
    data: {
      name: "Dr. Demo",
      email,
      passwordHash: hash,
      role: "OWNER",
      business: {
        create: {
          name: "Smile Dental",
          city: "Vijayawada",
          slug: "smile-dental-demo",
          placeId: "ChIJdemoPlaceId",
          ownerPhone: "919876500000",
          trialEndsAt: new Date(Date.now() + 14 * 86400_000),
          monthlyMsgLimit: 100,
          googleRating: 4.6,
          googleReviewCount: 45,
        },
      },
    },
    include: { business: true },
  });
  await db.user.create({
    data: { name: "Reception", email: "desk@demo.test", passwordHash: hash, role: "RECEPTIONIST", businessId: user.businessId },
  });
  const b = user.business;
  await ingestReview(b, { externalId: "demo1", authorName: "Priya Sharma", stars: 5, text: "Painless root canal. Doctor explained everything clearly.", reviewedAt: new Date() }, { alert: true });
  await ingestReview(b, { externalId: "demo2", authorName: "Suresh Babu", stars: 2, text: "Had to wait over an hour past my appointment.", reviewedAt: new Date() }, { alert: true });
  console.log("Seeded. Log in at /login as owner@demo.test / demo12345 (public page: /r/smile-dental-demo)");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
