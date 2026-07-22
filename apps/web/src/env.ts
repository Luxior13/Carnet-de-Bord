import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /*
   * Environment variables available on the client (and server).
   */
  client: {
    NEXT_PUBLIC_WEB_URL: z.string().min(1),
  },
  /*
   * Runtime environment variables
   */
  runtimeEnv: {
    AUDIT_ENCRYPTION_CURRENT_VERSION:
      process.env.AUDIT_ENCRYPTION_CURRENT_VERSION,
    AUDIT_ENCRYPTION_KEY_V1: process.env.AUDIT_ENCRYPTION_KEY_V1,
    MFA_ENCRYPTION_KEY_V1: process.env.MFA_ENCRYPTION_KEY_V1,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    NODE_ENV: process.env.NODE_ENV,
    WEB_URL: process.env.WEB_URL,
  },
  /*
   * Serverside Environment variables, not available on the client.
   */
  server: {
    AUDIT_ENCRYPTION_CURRENT_VERSION: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
    AUDIT_ENCRYPTION_KEY_V1: z
      .string()
      .regex(
        /^[a-z0-9+/]{43}=$/i,
        'AUDIT_ENCRYPTION_KEY_V1 doit contenir exactement 32 octets encodés en Base64',
      )
      .optional(),
    MFA_ENCRYPTION_KEY_V1: z
      .string()
      .regex(
        /^[a-z0-9+/]{43}=$/i,
        'MFA_ENCRYPTION_KEY_V1 doit contenir exactement 32 octets encodés en Base64',
      ),
    NODE_ENV: z.enum(['development', 'production']),
    WEB_URL: z.string().min(1),
  },
});
