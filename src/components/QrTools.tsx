"use client";

import { useState } from "react";
import { Button } from "./ui";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} type="button">
      Print poster
    </Button>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* ignore */
        }
      }}
    >
      {done ? "Copied!" : "Copy link"}
    </Button>
  );
}
