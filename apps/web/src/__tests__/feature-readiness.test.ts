import { describe, expect, it } from 'vitest';

import {
  readFeatureReadiness,
  UNKNOWN_FEATURE_READINESS,
} from '$context/feature-readiness';

describe('feature availability under transient health failures', () => {
  const ready = { internalNews: true, persons: true };

  it.each([429, 401, 502, 500])(
    'keeps the last confirmed state for HTTP %s',
    (status) => {
      expect(
        readFeatureReadiness(
          ready,
          { checks: { persons: 'not_configured' } },
          status,
        ),
      ).toEqual(ready);
    },
  );

  it.each([
    null,
    {},
    '<html>error</html>',
    { checks: null },
    { checks: { internalNews: 'unknown', persons: 'unknown' } },
  ])(
    'does not interpret missing or unknown results as unavailable',
    (payload) => {
      expect(readFeatureReadiness(ready, payload, 503)).toEqual(ready);
      expect(
        readFeatureReadiness(UNKNOWN_FEATURE_READINESS, payload, 503),
      ).toEqual(UNKNOWN_FEATURE_READINESS);
    },
  );

  it('applies explicit unavailable results independently and recovers on a later success', () => {
    const unavailable = readFeatureReadiness(
      ready,
      {
        checks: { internalNews: 'schema_not_ready', persons: 'not_configured' },
      },
      503,
    );
    expect(unavailable).toEqual({ internalNews: false, persons: false });
    expect(
      readFeatureReadiness(unavailable, { checks: { persons: 'ready' } }, 503),
    ).toEqual({ internalNews: false, persons: true });
    expect(
      readFeatureReadiness(
        unavailable,
        { checks: { internalNews: 'ready', persons: 'ready' } },
        200,
      ),
    ).toEqual(ready);
  });
});
