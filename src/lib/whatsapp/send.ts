import { db } from "../db";
import { getProvider } from "./providers";
import { renderTemplate, templateLang, TEMPLATES, type Lang, type TemplateKind } from "./templates";

export async function sendWhatsApp(opts: {
  businessId: string;
  to: string;
  kind: TemplateKind;
  lang: string;
  vars: string[];
}) {
  const lang = templateLang(opts.kind, (opts.lang === "te" ? "te" : "en") as Lang);
  const preview = renderTemplate(opts.kind, lang, opts.vars);
  const result = await getProvider().send({
    to: opts.to,
    template: TEMPLATES[opts.kind].name,
    lang,
    vars: opts.vars,
    preview,
  });
  await db.messageLog.create({
    data: {
      businessId: opts.businessId,
      to: opts.to,
      kind: opts.kind,
      body: preview,
      status: result.ok ? "sent" : "failed",
      providerId: result.ok ? result.providerId : null,
      error: result.ok ? null : result.error,
    },
  });
  return result;
}
