const isUppercaseAsciiLetter = (char: string): boolean =>
  char.length === 1 && char >= 'A' && char <= 'Z';

const isAsciiDigit = (char: string): boolean =>
  char.length === 1 && char >= '0' && char <= '9';

const isUppercaseAsciiAlphanumeric = (char: string): boolean =>
  isUppercaseAsciiLetter(char) || isAsciiDigit(char);

// Validation IBAN (format europeen)
export function isValidIBAN(iban: string): boolean {
  if (!iban) return true; // Optionnel
  const cleaned = iban.replace(/\s/g, '').toUpperCase();

  return (
    cleaned.length >= 5 &&
    cleaned.length <= 34 &&
    isUppercaseAsciiLetter(cleaned[0] ?? '') &&
    isUppercaseAsciiLetter(cleaned[1] ?? '') &&
    isAsciiDigit(cleaned[2] ?? '') &&
    isAsciiDigit(cleaned[3] ?? '') &&
    Array.from(cleaned.slice(4)).every(isUppercaseAsciiAlphanumeric)
  );
}

// Validation BIC/SWIFT (8 ou 11 caracteres)
export function isValidBIC(bic: string): boolean {
  if (!bic) return true; // Optionnel
  const cleaned = bic.replace(/\s/g, '').toUpperCase();

  return (
    (cleaned.length === 8 || cleaned.length === 11) &&
    Array.from(cleaned.slice(0, 6)).every(isUppercaseAsciiLetter) &&
    Array.from(cleaned.slice(6)).every(isUppercaseAsciiAlphanumeric)
  );
}
