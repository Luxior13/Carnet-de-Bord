import { describe, expect, it } from 'vitest';

import {
  emailSchema,
  optionalEmailSchema,
  optionalProfileString,
  optionalTrimmedString,
  optionalTrimmedStringMax,
  phoneSchema,
  trimmedString,
  trimmedStringMin,
  trimmedStringMinMax,
} from '../shared/utils/zod.utils';

describe('emailSchema', () => {
  it('validates a correct email', () => {
    const result = emailSchema.safeParse('test@example.com');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('test@example.com');
    }
  });

  it('lowercases email', () => {
    const result = emailSchema.safeParse('TEST@EXAMPLE.COM');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('test@example.com');
    }
  });

  it('trims whitespace', () => {
    const result = emailSchema.safeParse('  test@example.com  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('test@example.com');
    }
  });

  it('lowercases and trims combined', () => {
    const result = emailSchema.safeParse('  TEST@Example.COM  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('test@example.com');
    }
  });

  it('rejects invalid email', () => {
    const result = emailSchema.safeParse('not-an-email');
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = emailSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});

describe('optionalEmailSchema', () => {
  it('validates correct email', () => {
    const result = optionalEmailSchema.safeParse('test@example.com');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('test@example.com');
    }
  });

  it('allows null', () => {
    const result = optionalEmailSchema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(null);
    }
  });

  it('allows undefined', () => {
    const result = optionalEmailSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(undefined);
    }
  });

  it('transforms email when provided', () => {
    const result = optionalEmailSchema.safeParse('  TEST@EXAMPLE.COM  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('test@example.com');
    }
  });
});

describe('trimmedString', () => {
  it('trims whitespace from both ends', () => {
    const result = trimmedString.safeParse('  hello world  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('hello world');
    }
  });

  it('preserves internal whitespace', () => {
    const result = trimmedString.safeParse('  hello   world  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('hello   world');
    }
  });

  it('handles already trimmed string', () => {
    const result = trimmedString.safeParse('hello');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('hello');
    }
  });

  it('handles empty string', () => {
    const result = trimmedString.safeParse('');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('');
    }
  });
});

describe('optionalTrimmedString', () => {
  it('trims string when provided', () => {
    const result = optionalTrimmedString.safeParse('  hello  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('hello');
    }
  });

  it('passes null through', () => {
    const result = optionalTrimmedString.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(null);
    }
  });

  it('passes undefined through', () => {
    const result = optionalTrimmedString.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(undefined);
    }
  });
});

describe('optionalTrimmedStringMax', () => {
  it('accepts empty optional strings', () => {
    const schema = optionalTrimmedStringMax(5);
    const result = schema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it('trims and validates maximum length', () => {
    const schema = optionalTrimmedStringMax(5);
    const result = schema.safeParse('  abcde  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('abcde');
    }
  });

  it('rejects values above maximum length', () => {
    const schema = optionalTrimmedStringMax(5);
    const result = schema.safeParse('abcdef');
    expect(result.success).toBe(false);
  });
});

describe('optionalProfileString', () => {
  it('stores blank strings as null', () => {
    const schema = optionalProfileString(20);
    const result = schema.safeParse('   ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(null);
    }
  });
});

describe('trimmedStringMin', () => {
  it('accepts string meeting minimum length after trim', () => {
    const schema = trimmedStringMin(3);
    const result = schema.safeParse('   abc   ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('abc');
    }
  });

  it('rejects string below minimum length after trim', () => {
    const schema = trimmedStringMin(3);
    const result = schema.safeParse('   ab   ');
    expect(result.success).toBe(false);
  });

  it('uses custom error message', () => {
    const schema = trimmedStringMin(3, 'Trop court!');
    const result = schema.safeParse('ab');
    expect(result.success).toBe(false);
    if (!result.success) {
      const firstError = result.error.issues[0];
      expect(firstError?.message).toBe('Trop court!');
    }
  });
});

describe('trimmedStringMinMax', () => {
  it('accepts string within range', () => {
    const schema = trimmedStringMinMax(2, 5);
    const result = schema.safeParse('   abc   ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('abc');
    }
  });

  it('rejects string below minimum', () => {
    const schema = trimmedStringMinMax(2, 5);
    const result = schema.safeParse('a');
    expect(result.success).toBe(false);
  });

  it('rejects string above maximum', () => {
    const schema = trimmedStringMinMax(2, 5);
    const result = schema.safeParse('abcdef');
    expect(result.success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('trims phone number', () => {
    const result = phoneSchema.safeParse('  +33 1 23 45 67 89  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('+33 1 23 45 67 89');
    }
  });

  it('normalizes multiple spaces', () => {
    const result = phoneSchema.safeParse('+33  1  23  45');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('+33 1 23 45');
    }
  });

  it('allows null', () => {
    const result = phoneSchema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(null);
    }
  });

  it('allows undefined', () => {
    const result = phoneSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(undefined);
    }
  });
});
