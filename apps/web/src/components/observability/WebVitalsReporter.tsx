'use client';

import { useReportWebVitals } from 'next/web-vitals';

import { apiFetch } from '$utils/api.utils';

type WebVitalPayload = {
  delta: number;
  id: string;
  name: string;
  navigationType: string;
  rating: string;
  value: number;
};

const FLUSH_DELAY_MS = 5_000;
const MAX_BUFFERED_METRICS = 10;
let bufferedMetrics: WebVitalPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;

const flushMetrics = (): void => {
  if (bufferedMetrics.length === 0) return;
  const metrics = bufferedMetrics;
  bufferedMetrics = [];
  flushTimer = undefined;

  void apiFetch('/api/observability/web-vitals', {
    body: JSON.stringify({ metrics }),
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    method: 'POST',
  }).catch(() => {
    // Observability must never affect the application experience.
  });
};

const reportWebVital = (metric: WebVitalPayload): void => {
  bufferedMetrics.push({
    delta: metric.delta,
    id: metric.id,
    name: metric.name,
    navigationType: metric.navigationType,
    rating: metric.rating,
    value: metric.value,
  });

  if (bufferedMetrics.length >= MAX_BUFFERED_METRICS) {
    if (flushTimer) clearTimeout(flushTimer);
    flushMetrics();

    return;
  }

  if (!flushTimer) flushTimer = setTimeout(flushMetrics, FLUSH_DELAY_MS);
};

export const WebVitalsReporter = (): null => {
  useReportWebVitals(reportWebVital);

  return null;
};
