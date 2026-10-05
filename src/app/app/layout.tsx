import Link from "next/link";
import { logout } from "@/actions/auth";
import { Notice } from "@/components/ui";
import { isActive } from "@/lib/billing";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const OWNER_NAV = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/requests", label: "Send requests" },
  { href: "/app/feedback", label: "Feedback" },
  { href: "/app/reviews", label: "Reviews" },
  { href: "/app/qr", label: "QR & link" },
  { href: "/app/settings", label: "Settings" },
];
const STAFF_NAV = [{ href: "/app/requests", label: "Send requests" }];

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();
  const nav = user.role === "OWNER" ? OWNER_NAV : STAFF_NAV;
  const b = user.business;
  const active = isActive(b);
  const daysLeft = Math.ceil((b.trialEndsAt.getTime() - Date.now()) / 86400_000);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-indigo-600">ReviewBoost</div>
            <div className="text-xs text-slate-500">{b.name}</div>
          </div>
          <form action={logout}>
            <button className="text-sm text-slate-500 hover:text-slate-900">Log out</button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-t-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {!active ? (
          <Notice tone="red">
            Your {b.subscriptionStatus === "trialing" ? "free trial has ended" : "subscription is inactive"}.{" "}
            {user.role === "OWNER" ? <Link href="/app/settings" className="font-medium underline">Choose a plan</Link> : "Ask the owner to upgrade."} to keep sending requests.
          </Notice>
        ) : b.subscriptionStatus === "trialing" && daysLeft <= 5 ? (
          <Notice>Your free trial ends in {Math.max(daysLeft, 0)} day{daysLeft === 1 ? "" : "s"}.</Notice>
        ) : null}
        {children}
      </div>
    </div>
  );
}
