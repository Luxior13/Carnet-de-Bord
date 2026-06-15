export type PasswordValidationResult = {
  errors: string[];
  isValid: boolean;
  score: number; // 0-4
};

const MIN_LENGTH = 8;
const REQUIRE_UPPERCASE = true;
const REQUIRE_LOWERCASE = true;
const REQUIRE_NUMBER = true;
// Note: Special characters are optional but add to score

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
      return 'bg-red-500';
    case 2:
      return 'bg-orange-500';
    case 3:
      return 'bg-yellow-500';
    case 4:
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
}
