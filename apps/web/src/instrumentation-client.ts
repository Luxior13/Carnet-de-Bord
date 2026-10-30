import { z } from 'zod';

import { initializeUnsavedHistoryEvents } from '$hooks/unsaved-history-events';

// Zod 4 probes `new Function` before its first validation; the strict CSP
// (no 'unsafe-eval') refuses it and the browser reports a violation, though
// Zod then validates without it. Skip the probe in the browser (30 October
// 2026).
z.config({ jitless: true });

initializeUnsavedHistoryEvents();
