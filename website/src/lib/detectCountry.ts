import { APPLYING_FROM_OPTIONS } from "@/data/home";

/** ISO 3166-1 alpha-2 → APPLYING_FROM_OPTIONS value */
const COUNTRY_CODE_TO_OPTION: Record<string, string> = {
  US: "united-states",
  CA: "canada",
  GB: "united-kingdom",
  UK: "united-kingdom",
  DE: "germany",
  FR: "france",
  ES: "spain",
  IT: "italy",
  BR: "brazil",
  AR: "argentina",
  CO: "colombia",
  CN: "china",
  IN: "india",
  JP: "japan",
  KR: "south-korea",
  AU: "australia",
  TH: "thailand",
  SG: "singapore",
  PH: "philippines",
};

const OPTION_VALUES = new Set(APPLYING_FROM_OPTIONS.map((o) => o.value));

/**
 * Detect the visitor's country from IP and map it to a hero/apply option value.
 * Returns null when detection fails or the country is not in our list.
 */
export async function detectApplyingFromCountry(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    const res = await fetch("https://ipwho.is/", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    window.clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as {
      success?: boolean;
      country_code?: string;
      country?: string;
    };

    if (data.success === false || !data.country_code) return null;

    const byCode = COUNTRY_CODE_TO_OPTION[data.country_code.toUpperCase()];
    if (byCode && OPTION_VALUES.has(byCode)) return byCode;

    // Fallback: match by country name label
    const name = (data.country || "").trim().toLowerCase();
    if (name) {
      const byLabel = APPLYING_FROM_OPTIONS.find((o) => o.label.toLowerCase() === name);
      if (byLabel) return byLabel.value;
    }

    return null;
  } catch {
    return null;
  }
}
