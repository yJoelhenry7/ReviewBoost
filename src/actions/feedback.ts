"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/session";

export async function resolveFeedback(fd: FormData) {
  const user = await requireOwner();
  await db.rating.updateMany({
    where: { id: String(fd.get("id")), businessId: user.businessId },
    data: { resolved: fd.get("resolved") === "true" },
  });
  revalidatePath("/app/feedback");
  revalidatePath("/app");
}
