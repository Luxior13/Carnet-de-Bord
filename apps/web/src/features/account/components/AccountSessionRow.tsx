import { describeUserAgent } from '$utils/session-display.utils';

export type SessionInfo = {
  createdAt: string;
  expiresAt: string;
  id: string;
  idleExpiresAt: string;
  ipAddress: string | null;
  isCurrent: boolean;
  lastSeenAt: string;
  rememberMe: boolean;
  userAgent: string | null;
};

export const getSessionTitle = (session: SessionInfo): string =>
  describeUserAgent(session.userAgent).label;
