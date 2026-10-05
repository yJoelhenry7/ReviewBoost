"use client";

import { useActionState, useState } from "react";
import { approveByToken } from "@/actions/reviews";
import { Button, Notice, inputCls } from "./ui";

export default function ReplyEditor({
  token,
  initial,
  approved,
}: {
  token: string;
  initial: string;
  approved: boolean;
}) {
  const [state, action, pending] = useActionState(approveByToken, undefined);
  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);
  const showApproved = approved || !!state?.ok;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: user can still select the text */
    }
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <textarea
        name="reply"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={inputCls}
      />
      {state?.error && <Notice tone="red">{state.error}</Notice>}
      {state?.ok && <Notice tone="green">{state.ok}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : showApproved ? "Update reply" : "Approve reply"}
        </Button>
        <Button type="button" variant="secondary" onClick={copy}>
          {copied ? "Copied!" : "Copy reply"}
        </Button>
        <a
          href="https://business.google.com/reviews"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Open Google reviews ↗
        </a>
      </div>
    </form>
  );
}
