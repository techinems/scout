/**
 * Display form of a stored address: drops the trailing country and the
 * postal code, e.g. "455 Main St, Worcester, MA 01608, USA" →
 * "455 Main St, Worcester, MA". Freeform descriptions and DDM coordinates
 * pass through untouched. The full address stays in the database (geocoding
 * and editing use it) — this is for display only.
 *
 * Pure (no config access) so client components can use it.
 */
const COUNTRIES = /^(USA|US|U\.S\.A?\.?|United States( of America)?|Canada|Mexico|México)$/i;
// US ZIP / ZIP+4, Canadian postal code.
const POSTAL = /\s*\b(\d{5}(-\d{4})?|[A-Z]\d[A-Z]\s?\d[A-Z]\d)$/i;

export function displayAddress(address: string): string {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return address.trim();

  if (COUNTRIES.test(parts[parts.length - 1])) parts.pop();

  const last = parts[parts.length - 1];
  const stripped = last.replace(POSTAL, "").trim();
  // Only touch the last component when it looks like "ST 01608" or a bare
  // postal code, so street numbers in freeform text survive.
  if (stripped !== last && (stripped === "" || /^[A-Za-z .]+$/.test(stripped))) {
    if (stripped) parts[parts.length - 1] = stripped;
    else parts.pop();
  }
  return parts.join(", ");
}
