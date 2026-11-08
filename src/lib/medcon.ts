import { appConfig } from "@/lib/app-config";

/**
 * True when a mission role / roster title contains one of
 * MEDCON_ROLE_KEYWORDS as whole words. Spaces in a keyword also match
 * hyphens or nothing, so "med con" matches "Med-Con" and "medcon".
 */
const patterns = appConfig.medconKeywords.map((keyword) => {
  const words = keyword.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b${words.join("[\\s-]*")}\\b`, "i");
});

export function isMedconText(text: string): boolean {
  return patterns.some((p) => p.test(text));
}
