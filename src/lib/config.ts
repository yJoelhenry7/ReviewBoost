export const config = {
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  authSecret: process.env.AUTH_SECRET ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  whatsappProvider: process.env.WHATSAPP_PROVIDER ?? "mock",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  whatsappToken: process.env.WHATSAPP_TOKEN ?? "",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET ?? "",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  googlePlacesKey: process.env.GOOGLE_PLACES_API_KEY ?? "",
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
    plans: {
      starter: process.env.RAZORPAY_PLAN_STARTER ?? "",
      growth: process.env.RAZORPAY_PLAN_GROWTH ?? "",
    } as Record<string, string>,
  },
};

export const PLANS = {
  trial: { label: "Free trial", msgLimit: 100, price: 0 },
  starter: { label: "Starter", msgLimit: 300, price: 999 },
  growth: { label: "Growth", msgLimit: 1000, price: 1999 },
} as const;

export const TRIAL_DAYS = 14;
export const REMINDER_DELAY_HOURS = 60; // 2.5 days
export const REREQUEST_COOLDOWN_DAYS = 30;
