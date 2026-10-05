/**
 * Single source of truth for WhatsApp templates. These exact bodies must be
 * submitted to Meta (WhatsApp Manager > Message templates, category UTILITY,
 * or MARKETING if Meta reclassifies them). {{n}} are positional variables.
 */
export type TemplateKind =
  | "review_request"
  | "review_reminder"
  | "owner_low_rating"
  | "owner_new_review";

export type Lang = "en" | "te";

type TemplateDef = { name: string; bodies: Partial<Record<Lang, string>> };

export const TEMPLATES: Record<TemplateKind, TemplateDef> = {
  // vars: 1 name, 2 business, 3 link
  review_request: {
    name: "review_request",
    bodies: {
      en: "Thank you for visiting {{2}}, {{1}}! If you're happy with your experience, please share a quick review: {{3}}\n\nReply STOP to opt out.",
      te: "{{2}} ని సందర్శించినందుకు ధన్యవాదాలు, {{1}} గారు! మీ అనుభవం నచ్చితే, దయచేసి ఒక చిన్న రివ్యూ ఇవ్వండి: {{3}}\n\nఆపడానికి STOP అని రిప్లై ఇవ్వండి.",
    },
  },
  // vars: 1 name, 2 business, 3 link
  review_reminder: {
    name: "review_reminder",
    bodies: {
      en: "Hi {{1}}, a gentle reminder from {{2}}. Your feedback means a lot to us and takes only 30 seconds: {{3}}\n\nReply STOP to opt out.",
      te: "నమస్కారం {{1}} గారు, {{2}} నుండి చిన్న గుర్తుచేత. మీ అభిప్రాయం మాకు చాలా ముఖ్యం, 30 సెకన్లు చాలు: {{3}}\n\nఆపడానికి STOP అని రిప్లై ఇవ్వండి.",
    },
  },
  // vars: 1 customer, 2 stars, 3 business, 4 phone, 5 inbox link
  owner_low_rating: {
    name: "owner_low_rating",
    bodies: {
      en: "Heads up: {{1}} rated {{3}} {{2}}/5. Phone: {{4}}. Please call to resolve it. Details: {{5}}",
    },
  },
  // vars: 1 stars, 2 author, 3 review text, 4 approve link
  owner_new_review: {
    name: "owner_new_review",
    bodies: {
      en: "New {{1}}-star Google review from {{2}}: \"{{3}}\". A reply is ready. Approve in one tap: {{4}}",
    },
  },
};

export function renderTemplate(kind: TemplateKind, lang: Lang, vars: string[]): string {
  const def = TEMPLATES[kind];
  const body = def.bodies[lang] ?? def.bodies.en!;
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => vars[Number(n) - 1] ?? "");
}

export function templateLang(kind: TemplateKind, lang: Lang): Lang {
  return TEMPLATES[kind].bodies[lang] ? lang : "en";
}
