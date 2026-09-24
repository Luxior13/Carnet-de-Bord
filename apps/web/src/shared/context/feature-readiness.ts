export type FeatureReadiness = {
  internalNews: boolean | null;
  persons: boolean | null;
};

export const UNKNOWN_FEATURE_READINESS: FeatureReadiness = {
  internalNews: null,
  persons: null,
};

// Only explicit readiness results can remove a feature from navigation.
// A timeout, rate limit or malformed response says nothing about its configuration.
export function readFeatureReadiness(
  previous: FeatureReadiness,
  payload: unknown,
  status: number,
): FeatureReadiness {
  if (status !== 200 && status !== 503) return previous;
  if (!payload || typeof payload !== 'object' || !('checks' in payload)) {
    return previous;
  }
  const { checks } = payload;
  if (!checks || typeof checks !== 'object') return previous;

  const resolve = (value: unknown, prior: boolean | null): boolean | null => {
    if (value === 'ready') return true;
    if (value === 'schema_not_ready' || value === 'not_configured')
      return false;

    return prior;
  };

  return {
    internalNews: resolve(
      'internalNews' in checks ? checks.internalNews : undefined,
      previous.internalNews,
    ),
    persons: resolve(
      'persons' in checks ? checks.persons : undefined,
      previous.persons,
    ),
  };
}
