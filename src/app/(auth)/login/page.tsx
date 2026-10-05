import Link from "next/link";
import { login } from "@/actions/auth";
import { ActionForm } from "@/components/Form";
import { Card, Field, inputCls } from "@/components/ui";

export const metadata = { title: "Log in – ReviewBoost" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Link href="/" className="mb-6 text-center text-xl font-semibold text-indigo-600">ReviewBoost</Link>
      <Card>
        <h1 className="mb-4 text-lg font-semibold">Log in</h1>
        <ActionForm action={login} submit="Log in">
          <Field label="Email">
            <input name="email" type="email" required autoComplete="email" className={inputCls} />
          </Field>
          <Field label="Password">
            <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
          </Field>
        </ActionForm>
      </Card>
      <p className="mt-4 text-center text-sm text-slate-600">
        New here? <Link href="/signup" className="font-medium text-indigo-600">Start your free trial</Link>
      </p>
    </main>
  );
}
