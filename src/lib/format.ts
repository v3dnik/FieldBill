// ═══════════════════════════════════════════════════════
//  FieldBill — Swiss Formatting Helpers
// ═══════════════════════════════════════════════════════

/**
 * Pretvori Rappen v CHF z apostrofnim ločilom (švicarska oblika).
 *
 * @example
 *   rappenToChf(125050)        →  "1'250.50"
 *   rappenToChf(99)            →  "0.99"
 *   rappenToChf(1000000)       →  "10'000.00"
 */
export function rappenToChf(rappen: number): string {
  const chf = rappen / 100;
  // Toolocale 'de-CH' uporablja apostrof kot tisočni ločilnik
  return chf.toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Pretvori Rappen v CHF s predpono "CHF".
 *
 * @example
 *   formatCHF(125050)          →  "CHF 1'250.50"
 *   formatCHF(0)               →  "CHF 0.00"
 */
export function formatCHF(rappen: number): string {
  return `CHF ${rappenToChf(rappen)}`;
}

/**
 * Pretvori CHF (z apostrofom ali brez) v Rappen integer.
 *
 * @example
 *   chfStringToRappen("1'250.50")   →  125050
 *   chfStringToRappen("1250.50")    →  125050
 *   chfStringToRappen("0.99")       →  99
 */
export function chfStringToRappen(input: string): number {
  // Odstrani apostrofe, presledke, valuto, prazno polje
  const cleaned = input
    .replace(/['\s]/g, '')
    .replace(/CHF/gi, '')
    .replace(',', '.')
    .trim();

  if (!cleaned) return 0;

  const chf = parseFloat(cleaned);
  if (isNaN(chf)) return 0;

  return Math.round(chf * 100);
}

/**
 * Formatira datum v švicarski stilski standard.
 *
 * @example
 *   formatDateCH(new Date('2026-05-29'))  →  "29.05.2026"
 */
export function formatDateCH(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Generira "dateKey" za daily access (Europe/Zurich timezone).
 *
 * @example
 *   getDateKey(new Date('2026-05-29T15:30:00Z'))  →  "2026-05-29"
 */
export function getDateKey(date: Date = new Date()): string {
  // Format YYYY-MM-DD v Europe/Zurich
  const zurich = date.toLocaleDateString('en-CA', {
    timeZone: 'Europe/Zurich',
  });
  return zurich; // npr. "2026-05-29"
}