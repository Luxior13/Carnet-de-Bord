import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  isCompleteMfaCode,
  MfaCodeInput,
  type MfaCodeKind,
  normalizeMfaCode,
} from '../features/auth/components/MfaCodeInput';

describe('MFA code input helpers', () => {
  it.each([
    ['totp', '123 456', '123456'],
    [
      'recovery',
      '  abcd efgh ijkl mnop qrst uvwx  ',
      'ABCD-EFGH-IJKL-MNOP-QRST-UVWX',
    ],
  ] as const)(
    'normalizes a complete pasted %s code before the browser truncates it',
    (kind: MfaCodeKind, pasted, expected) => {
      const onChange = vi.fn();
      const tree = MfaCodeInput({
        id: 'test-code',
        kind,
        onChange,
        value: '',
      }) as ReactElement<{ children: ReactNode }>;
      const input = Children.toArray(tree.props.children).find(
        (child) =>
          isValidElement<{ id?: string }>(child) &&
          child.props.id === 'test-code',
      ) as ReactElement<{ onPaste: (event: unknown) => void }>;
      const preventDefault = vi.fn();
      input.props.onPaste({
        clipboardData: { getData: () => pasted },
        preventDefault,
      });
      expect(preventDefault).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledWith(expected);
    },
  );

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
