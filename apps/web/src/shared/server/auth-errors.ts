import 'server-only';

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Raised when an authentication operation was started from an obsolete
 * security state. Callers must make the client authenticate again instead of
 * retrying the mutation with the stale session.
 */
export class SecurityVersionMismatchError extends Error {
  constructor() {
    super('User security state changed during authentication');
    this.name = 'SecurityVersionMismatchError';
  }
}

export const isSecurityVersionMismatchError = (
  error: unknown,
): error is SecurityVersionMismatchError =>
  error instanceof SecurityVersionMismatchError;

/**
 * Raised when an administrative password reset targets the protected root
 * account. The root owner can still change their own password through the
 * authenticated password-change flow.
 */
export class ProtectedAccountMutationError extends Error {
  constructor() {
    super('The protected root account cannot be mutated administratively');
    this.name = 'ProtectedAccountMutationError';
  }
}
