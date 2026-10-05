/**
 * Normalizes an Indian-focused phone number to digits with country code
 * (e.g. "98765 43210" -> "919876543210"). Returns null if it doesn't look valid.
 */
export function normalizePhone(input: string, defaultCountry = "91"): string | null {
  let d = input.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = defaultCountry + d.slice(1);
  else if (d.length === 10) d = defaultCountry + d;

  if (!/^\d{11,15}$/.test(d)) return null;
  if (d.startsWith("91") && d.length === 12 && !/^[6-9]/.test(d.slice(2))) return null;
  return d;
}

export function formatPhone(p: string): string {
  if (p.startsWith("91") && p.length === 12) return `+91 ${p.slice(2, 7)} ${p.slice(7)}`;
  return `+${p}`;
}
