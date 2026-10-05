"use client";

import { useEffect, useRef, useState } from "react";

const T = {
  en: {
    how: "How was your experience?",
    tap: "Tap a star to rate",
    redirecting: "Thank you! Taking you to Google…",
    open: "Tap here if nothing happens",
    sorry: "We're sorry we fell short.",
    tell: "Tell us what went wrong so we can make it right. The owner will see this personally.",
    msg: "Your feedback",
    name: "Your name (optional)",
    phone: "Phone (optional, so we can call you)",
    send: "Send feedback",
    sending: "Sending…",
    thanks: "Thank you. The owner has been notified and will get back to you.",
    google: "Prefer to post a public review on Google instead?",
    err: "Something went wrong. Please try again.",
    nogoogle: "Thank you for your feedback!",
  },
  te: {
    how: "మీ అనుభవం ఎలా ఉంది?",
    tap: "రేటింగ్ ఇవ్వడానికి స్టార్ నొక్కండి",
    redirecting: "ధన్యవాదాలు! Google కి తీసుకెళ్తున్నాం…",
    open: "ఏమీ జరగకపోతే ఇక్కడ నొక్కండి",
    sorry: "క్షమించండి, మేము మీ అంచనాలను అందుకోలేకపోయాం.",
    tell: "ఏం తప్పు జరిగిందో చెప్పండి, మేము సరిచేస్తాం. యజమాని దీన్ని స్వయంగా చూస్తారు.",
    msg: "మీ అభిప్రాయం",
    name: "మీ పేరు (ఐచ్ఛికం)",
    phone: "ఫోన్ (ఐచ్ఛికం, మేము కాల్ చేయడానికి)",
    send: "అభిప్రాయం పంపండి",
    sending: "పంపుతోంది…",
    thanks: "ధన్యవాదాలు. యజమానికి తెలియజేశాం, త్వరలో సంప్రదిస్తారు.",
    google: "బదులుగా Google లో పబ్లిక్ రివ్యూ ఇవ్వాలనుకుంటున్నారా?",
    err: "ఏదో తప్పు జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.",
    nogoogle: "మీ అభిప్రాయానికి ధన్యవాదాలు!",
  },
};

type Props = {
  slug: string;
  code?: string;
  name: string;
  lang: "en" | "te";
  googleUrl: string | null;
  funnel: boolean;
};

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export default function Funnel({ slug, code, name, lang, googleUrl, funnel }: Props) {
  const t = T[lang];
  const [stage, setStage] = useState<"rate" | "redirect" | "feedback" | "done">(funnel ? "rate" : "redirect");
  const [hover, setHover] = useState(0);
  const [ratingId, setRatingId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tracked = useRef(false);

  // Track the visit from the browser so link-preview crawlers don't count as clicks.
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    post("/api/public/track", { slug, code: code ?? null }).catch(() => {});
    if (!funnel && googleUrl) {
      const id = setTimeout(() => window.location.assign(googleUrl), 600);
      return () => clearTimeout(id);
    }
  }, [slug, code, funnel, googleUrl]);

  async function rate(stars: number) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const out = await post("/api/public/rate", { slug, code: code ?? null, stars });
      setRatingId(out.ratingId);
      if (out.goToGoogle) {
        setStage(out.googleUrl ? "redirect" : "done");
        if (out.googleUrl) setTimeout(() => window.location.assign(out.googleUrl), 500);
      } else {
        setStage("feedback");
      }
    } catch {
      setError(t.err);
    } finally {
      setBusy(false);
    }
  }

  async function sendFeedback(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await post("/api/public/feedback", {
        slug,
        ratingId,
        feedback: fd.get("feedback"),
        name: fd.get("name") || undefined,
        phone: fd.get("phone") || undefined,
      });
      setStage("done");
    } catch {
      setError(t.err);
    } finally {
      setBusy(false);
    }
  }

  function googleClick() {
    if (ratingId) post("/api/public/track", { slug, ratingId, type: "google" }).catch(() => {});
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">{name}</h1>

      {stage === "rate" && (
        <>
          <p className="mt-6 text-lg text-slate-700">{t.how}</p>
          <div className="mt-4 flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                disabled={busy}
                onMouseEnter={() => setHover(n)}
                onClick={() => rate(n)}
                className={`p-1 text-5xl leading-none transition active:scale-90 ${n <= hover ? "text-amber-400" : "text-slate-300"}`}
              >
                ★
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-500">{t.tap}</p>
        </>
      )}

      {stage === "redirect" && (
        <div className="mt-8 space-y-3">
          <p className="text-slate-700">{googleUrl ? t.redirecting : t.nogoogle}</p>
          {googleUrl && (
            <a href={googleUrl} className="text-sm font-medium text-indigo-600 underline">
              {t.open}
            </a>
          )}
        </div>
      )}

      {stage === "feedback" && (
        <form onSubmit={sendFeedback} className="mt-6 w-full space-y-3 text-left">
          <p className="font-medium text-slate-900">{t.sorry}</p>
          <p className="text-sm text-slate-600">{t.tell}</p>
          <textarea
            name="feedback"
            required
            rows={4}
            maxLength={2000}
            placeholder={t.msg}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <input name="name" maxLength={80} placeholder={t.name} className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
          <input name="phone" type="tel" maxLength={20} placeholder={t.phone} className="w-full rounded-lg border border-slate-300 p-3 text-sm" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-indigo-600 py-3 font-medium text-white disabled:opacity-50">
            {busy ? t.sending : t.send}
          </button>
          {googleUrl && (
            <p className="pt-2 text-center text-xs text-slate-500">
              {t.google}{" "}
              <a href={googleUrl} onClick={googleClick} className="font-medium text-indigo-600 underline">
                Google
              </a>
            </p>
          )}
        </form>
      )}

      {stage === "done" && (
        <div className="mt-8 space-y-4">
          <p className="text-slate-700">{ratingId ? t.thanks : t.nogoogle}</p>
          {ratingId && googleUrl && (
            <p className="text-xs text-slate-500">
              {t.google}{" "}
              <a href={googleUrl} onClick={googleClick} className="font-medium text-indigo-600 underline">
                Google
              </a>
            </p>
          )}
        </div>
      )}

      {error && stage === "rate" && <p className="mt-4 text-sm text-rose-600">{error}</p>}
    </main>
  );
}
