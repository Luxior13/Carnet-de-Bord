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
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    NODE_ENV: process.env.NODE_ENV,
    WEB_URL: process.env.WEB_URL,
  },
  /*
   * Serverside Environment variables, not available on the client.
   */
  server: {
    NODE_ENV: z.enum(['development', 'production']),
    WEB_URL: z.string().min(1),
  },
});
