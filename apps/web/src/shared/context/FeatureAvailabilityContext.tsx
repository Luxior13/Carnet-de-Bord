'use client';

import React, {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { FEATURES } from '$constants/feature-registry.constants';
import { useUser } from '$context/UserContext';

const REFRESH_INTERVAL_MS = 30_000;

type ReadinessPayload = {
  checks?: { persons?: string };
};

type FeatureAvailabilityContextValue = {
  featureAvailabilityLoaded: boolean;
  operationalFeatureIds: ReadonlySet<string>;
  refreshFeatureAvailability: () => Promise<void>;
};

const ALWAYS_OPERATIONAL_FEATURE_IDS = Object.values(FEATURES)
  .filter(
    (feature) =>
      feature.availability === 'live' && feature.id !== FEATURES.persons.id,
  )
  .map((feature) => feature.id);

const FeatureAvailabilityContext =
  createContext<FeatureAvailabilityContextValue | null>(null);

export const FeatureAvailabilityProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { userData } = useUser();
  const [featureAvailabilityLoaded, setFeatureAvailabilityLoaded] =
    useState(false);
  const [personsReady, setPersonsReady] = useState(false);

  const refreshFeatureAvailability = useCallback(async (): Promise<void> => {
    if (!userData) {
      setPersonsReady(false);
      setFeatureAvailabilityLoaded(false);

      return;
    }

    try {
      const response = await fetch('/api/health/ready', {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      const payload = (await response.json()) as ReadinessPayload;
      setPersonsReady(payload.checks?.persons === 'ready');
    } catch {
      setPersonsReady(false);
    } finally {
      setFeatureAvailabilityLoaded(true);
    }
  }, [userData]);

  useEffect(() => {
    if (!userData) {
      setPersonsReady(false);
      setFeatureAvailabilityLoaded(false);

      return;
    }

    void refreshFeatureAvailability();
    const interval = window.setInterval((): void => {
      void refreshFeatureAvailability();
    }, REFRESH_INTERVAL_MS);

    return (): void => window.clearInterval(interval);
  }, [refreshFeatureAvailability, userData]);

  const operationalFeatureIds = useMemo(
    () =>
      new Set([
        ...ALWAYS_OPERATIONAL_FEATURE_IDS,
        ...(personsReady ? [FEATURES.persons.id] : []),
      ]),
    [personsReady],
  );
  const value = useMemo(
    () => ({
      featureAvailabilityLoaded,
      operationalFeatureIds,
      refreshFeatureAvailability,
    }),
    [
      featureAvailabilityLoaded,
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
