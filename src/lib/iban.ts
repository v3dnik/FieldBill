// ═══════════════════════════════════════════════════════
//  FieldBill — Swiss IBAN & QR-IBAN Validation
// ═══════════════════════════════════════════════════════

/**
 * Očisti IBAN: odstrani presledke in pretvori v velike črke.
 */
export function normalizeIban(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

/**
 * Formatira IBAN za prikaz (vsake 4 znake presledek).
 *
 * @example
 *   formatIban("CH9300762011623852957")
 *     →  "CH93 0076 2011 6238 5295 7"
 */
export function formatIban(input: string): string {
  const clean = normalizeIban(input);
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Splošna validacija IBAN-a (ISO 13616 MOD 97 algoritem).
 *
 * @returns true če je IBAN sintaktično pravilen
 */
export function isValidIban(input: string): boolean {
  const iban = normalizeIban(input);

  // Osnovna oblika: 2 črki + 2 cifri + 11-30 alfanumeričnih
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) {
    return false;
  }

  // Premakni prvi 4 znake na konec
  const rearranged = iban.slice(4) + iban.slice(0, 4);

  // Pretvori črke v cifre (A=10, B=11, ..., Z=35)
  const numericString = rearranged
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 48 && code <= 57) return ch;          // 0-9
      if (code >= 65 && code <= 90) return (code - 55).toString();  // A-Z → 10-35
      return '';
    })
    .join('');

  // MOD 97 mora biti 1
  return mod97(numericString) === 1;
}

/**
 * Validira QR-IBAN — posebna oblika za Swiss QR-Rechnung.
 * QR-IBAN ima Institute Identifier (IID) v območju 30000-31999.
 *
 * @example
 *   isValidQrIban("CH4431999123000889012")  →  true
 *   isValidQrIban("CH9300762011623852957")  →  false  (običajen IBAN)
 */
export function isValidQrIban(input: string): boolean {
  const iban = normalizeIban(input);

  // Mora biti veljaven IBAN
  if (!isValidIban(iban)) return false;

  // Mora biti švicarski (CH) ali liechtensteinski (LI)
  if (!iban.startsWith('CH') && !iban.startsWith('LI')) return false;

  // Cifre 5-9 (IID = Institute Identifier) morajo biti v območju 30000-31999
  const iid = parseInt(iban.slice(4, 9), 10);
  return iid >= 30000 && iid <= 31999;
}

/**
 * MOD 97 helper za long-string aritmetiko (večja kot Number.MAX_SAFE_INTEGER).
 */
function mod97(numericString: string): number {
  let remainder = 0;
  for (const ch of numericString) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97;
  }
  return remainder;
}