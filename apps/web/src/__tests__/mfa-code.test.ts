import { describe, expect, it } from 'vitest';

import {
  isCompleteMfaCode,
  normalizeMfaCode,
} from '../features/auth/components/MfaCodeInput';

describe('MFA code input helpers', () => {
  it('keeps only the first six digits of an authenticator code', () => {
    expect(normalizeMfaCode(' 12a34-567 ', 'totp')).toBe('123456');
  });

  it('normalizes a pasted recovery code without weakening its format', () => {
    expect(normalizeMfaCode('abcd efgh-jklm npqr stuv wxyz', 'recovery')).toBe(
      'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ',
    );
  });

  it('rejects characters outside the Base32 recovery alphabet', () => {
    expect(normalizeMfaCode('AB10-89CD-EFGH-IJKL-MNOP-QRST', 'recovery')).toBe(
      'ABCD-EFGH-IJKL-MNOP-QRST',
    );
  });

  it('accepts only complete codes for submission', () => {
    expect(isCompleteMfaCode('12345', 'totp')).toBe(false);
    expect(isCompleteMfaCode('123456', 'totp')).toBe(true);
    expect(isCompleteMfaCode('ABCD-EFGH-IJKL-MNOP-QRST', 'recovery')).toBe(
      false,
    );
    expect(isCompleteMfaCode('ABCD-EFGH-IJKL-MNOP-QRST-UVWX', 'recovery')).toBe(
      true,
    );
    expect(isCompleteMfaCode('ABCD-EFGH-IJKL-MNOP-QRST-UVW1', 'recovery')).toBe(
      false,
    );
  });
});
