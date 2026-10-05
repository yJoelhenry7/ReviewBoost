"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/actions/auth";
import { Button, Notice } from "./ui";

/** Wraps a server action with pending state and an inline error/success banner. */
export function ActionForm({
  action,
  submit,
  children,
  className,
  variant,
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  submit: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className ?? "space-y-4"}>
      {children}
      {state?.error && <Notice tone="red">{state.error}</Notice>}
      {state?.ok && <Notice tone="green">{state.ok}</Notice>}
      {state?.details && state.details.length > 0 && (
        <ul className="max-h-48 list-disc space-y-0.5 overflow-auto pl-5 text-xs text-slate-600">
          {state.details.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
      )}
      <Button type="submit" disabled={pending} variant={variant}>
        {pending ? "Please wait…" : submit}
      </Button>
    </form>
  );
}
