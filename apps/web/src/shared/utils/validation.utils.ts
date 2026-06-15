// Validation IBAN (format europeen)
export function isValidIBAN(iban: string): boolean {
  if (!iban) return true; // Optionnel
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  // Format: 2 lettres + 2 chiffres + 1 a 30 caracteres alphanumeriques
  const regex = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/;

  return regex.test(cleaned);
}

// Validation BIC/SWIFT (8 ou 11 caracteres)
export function isValidBIC(bic: string): boolean {
  if (!bic) return true; // Optionnel
  const cleaned = bic.replace(/\s/g, '').toUpperCase();
  // Format: 4 lettres (banque) + 2 lettres (pays) + 2 alphanum (lieu) + 3 optionnels
  const regex = /^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/;

  return regex.test(cleaned);
}
