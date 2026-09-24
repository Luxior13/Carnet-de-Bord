'use client';

import React, {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { FEATURES } from '$constants/feature-registry.constants';
import { useUser } from '$context/UserContext';

import {
  readFeatureReadiness,
  UNKNOWN_FEATURE_READINESS,
} from './feature-readiness';

const REFRESH_INTERVAL_MS = 30_000;

type FeatureAvailabilityContextValue = {
  featureAvailabilityLoaded: boolean;
  navigableFeatureIds: ReadonlySet<string>;
  operationalFeatureIds: ReadonlySet<string>;
  refreshFeatureAvailability: () => Promise<void>;
};

const ALWAYS_OPERATIONAL_FEATURE_IDS = Object.values(FEATURES)
  .filter(
    (feature) =>
      feature.availability === 'live' &&
      feature.id !== FEATURES.internalNews.id &&
      feature.id !== FEATURES.persons.id,
  )
  .map((feature) => feature.id);

const FeatureAvailabilityContext =
  createContext<FeatureAvailabilityContextValue | null>(null);

export const FeatureAvailabilityProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { userData } = useUser();
  const userId = userData?.id;
  const [featureAvailabilityLoaded, setFeatureAvailabilityLoaded] =
    useState(false);
  const [readiness, setReadiness] = useState(UNKNOWN_FEATURE_READINESS);
  const requestRef = useRef<AbortController | null>(null);

  const refreshFeatureAvailability = useCallback(async (): Promise<void> => {
    if (!userId || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch('/api/health/ready', {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const payload: unknown = await response.json();
      if (!controller.signal.aborted) {
        setReadiness((previous) =>
          readFeatureReadiness(previous, payload, response.status),
        );
      }
    } catch {
      // Keep the last confirmed state on transport errors and timeouts.
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        setFeatureAvailabilityLoaded(true);
      }
    }
  }, [userId]);

  useEffect(() => {
    setReadiness(UNKNOWN_FEATURE_READINESS);
    setFeatureAvailabilityLoaded(false);
    if (!userId) {
      return;
    }

    void refreshFeatureAvailability();
    const interval = window.setInterval((): void => {
      void refreshFeatureAvailability();
    }, REFRESH_INTERVAL_MS);

    return (): void => {
      window.clearInterval(interval);
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [refreshFeatureAvailability, userId]);

  const operationalFeatureIds = useMemo(
    () =>
      new Set([
        ...ALWAYS_OPERATIONAL_FEATURE_IDS,
        ...(readiness.internalNews ? [FEATURES.internalNews.id] : []),
        ...(readiness.persons ? [FEATURES.persons.id] : []),
      ]),
    [readiness],
  );
  const navigableFeatureIds = useMemo(
    () =>
      new Set([
        ...ALWAYS_OPERATIONAL_FEATURE_IDS,
        ...(readiness.internalNews !== false ? [FEATURES.internalNews.id] : []),
        ...(readiness.persons !== false ? [FEATURES.persons.id] : []),
      ]),
    [readiness],
  );
  const value = useMemo(
    () => ({
      featureAvailabilityLoaded,
      navigableFeatureIds,
      operationalFeatureIds,
      refreshFeatureAvailability,
    }),
    [
      featureAvailabilityLoaded,
      navigableFeatureIds,
      operationalFeatureIds,
      refreshFeatureAvailability,
    ],
  );

  return (
    <FeatureAvailabilityContext.Provider value={value}>
      {children}
    </FeatureAvailabilityContext.Provider>
  );
};

export const useFeatureAvailability = (): FeatureAvailabilityContextValue => {
  const value = useContext(FeatureAvailabilityContext);
  if (!value) {
    throw new Error(
      'useFeatureAvailability must be used inside FeatureAvailabilityProvider',
    );
  }

  return value;
};
