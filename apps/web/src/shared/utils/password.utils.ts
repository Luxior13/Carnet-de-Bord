export type PasswordValidationResult = {
  errors: string[];
  isValid: boolean;
  score: number; // 0-4
};

const MIN_LENGTH = 8;
export const MAX_BCRYPT_PASSWORD_BYTES = 72;
const REQUIRE_UPPERCASE = true;
const REQUIRE_LOWERCASE = true;
const REQUIRE_NUMBER = true;
// Note: Special characters are optional but add to score

const textEncoder = new TextEncoder();

/**
 * bcrypt only considers the first 72 bytes of a password. The limit must be
 * checked in UTF-8 bytes (not JavaScript characters) to avoid two distinct
 * passwords producing the same hash.
 */
export function getPasswordByteLength(password: string): number {
  return textEncoder.encode(password).byteLength;
}

export function isPasswordWithinBcryptLimit(password: string): boolean {
  return getPasswordByteLength(password) <= MAX_BCRYPT_PASSWORD_BYTES;
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  if (password.length < MIN_LENGTH) {
    errors.push(
      `Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères`,
    );
  } else {
    score++;
  }

  if (!isPasswordWithinBcryptLimit(password)) {
    errors.push(
      `Le mot de passe ne doit pas dépasser ${MAX_BCRYPT_PASSWORD_BYTES} octets`,
    );
  }

  if (REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  } else if (/[A-Z]/.test(password)) {
    score++;
  }

  if (REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  } else if (/[a-z]/.test(password)) {
    score++;
  }

  if (REQUIRE_NUMBER && !/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  } else if (/\d/.test(password)) {
    score++;
  }

  // Special chars are optional but increase score
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score++;
  }

  return {
    errors,
    isValid: errors.length === 0,
    score: Math.min(4, score),
  };
}

export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'Faible';
    case 2:
      return 'Moyen';
    case 3:
      return 'Bon';
    case 4:
      return 'Excellent';
    default:
      return 'Faible';
  }
}

export function getPasswordStrengthColor(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'bg-destructive';
    case 2:
      return 'bg-warning';
    case 3:
      return 'bg-warning';
    case 4:
      return 'bg-success';
    default:
      return 'bg-muted-foreground';
  }
}
