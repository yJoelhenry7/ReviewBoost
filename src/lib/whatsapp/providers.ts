import { config } from "../config";

export type SendInput = {
  to: string; // digits with country code
  template: string;
  lang: string;
  vars: string[];
  preview: string; // rendered body (used by the mock provider)
};
export type SendResult = { ok: true; providerId: string } | { ok: false; error: string };

export interface WhatsAppProvider {
  send(input: SendInput): Promise<SendResult>;
}

/** Logs only (the MessageLog row is written by the caller). Safe for local dev. */
const mockProvider: WhatsAppProvider = {
  async send({ to, preview }) {
    console.log(`[whatsapp:mock] -> ${to}\n${preview}\n`);
    return { ok: true, providerId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  },
};

/** WhatsApp Cloud API (Meta). Template messages only, as required for business-initiated chats. */
const metaProvider: WhatsAppProvider = {
  async send({ to, template, lang, vars }) {
    if (!config.whatsappToken || !config.whatsappPhoneNumberId) {
      return { ok: false, error: "WhatsApp credentials are not configured" };
    }
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${config.whatsappPhoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.whatsappToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: template,
              language: { code: lang },
              components: [
                {
                  type: "body",
                  parameters: vars.map((text) => ({
                    type: "text",
                    // Meta rejects newlines/tabs and 4+ consecutive spaces in params
                    text: text.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").slice(0, 900),
                  })),
                },
              ],
            },
          }),
        },
      );
      const json = (await res.json()) as {
        messages?: { id: string }[];
        error?: { message?: string };
      };
      if (!res.ok || !json.messages?.[0]) {
        return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
      }
      return { ok: true, providerId: json.messages[0].id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "network error" };
    }
  },
};

export function getProvider(): WhatsAppProvider {
  return config.whatsappProvider === "meta" ? metaProvider : mockProvider;
}
