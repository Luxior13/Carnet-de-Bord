import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getNavigationAvailability,
  getNavigationItemByHref,
} from '$constants/app.constants';
import {
  FEATURE_LIST,
  FEATURES,
  getFeatureByHref,
  getFeatureById,
} from '$constants/feature-registry.constants';
import { ErrorCode } from '$types/api.types';
import { ApiClientError, apiFetchJson, jsonRequest } from '$utils/api.utils';

describe('feature registry', () => {
  it('keeps stable and unique identifiers, routes and audit keys', () => {
    expect(new Set(FEATURE_LIST.map((feature) => feature.id)).size).toBe(
      FEATURE_LIST.length,
    );
    expect(new Set(FEATURE_LIST.map((feature) => feature.href)).size).toBe(
      FEATURE_LIST.length,
    );
    expect(
      new Set(FEATURE_LIST.map((feature) => feature.audit.pageKey)).size,
    ).toBe(FEATURE_LIST.length);
  });

  it('binds every live manifest entry to the navigation contract', () => {
    for (const feature of FEATURE_LIST.filter(
      ({ availability }) => availability === 'live',
    )) {
      const navigationItem = getNavigationItemByHref(feature.href);

      expect(navigationItem, feature.href).not.toBeNull();
      expect(navigationItem?.featureId).toBe(feature.id);
      expect(navigationItem && getNavigationAvailability(navigationItem)).toBe(
        'live',
      );
      expect(navigationItem?.requiredPermissions ?? []).toEqual(
        feature.requiredPermissions,
      );
    }
  });

  it('resolves features without exposing mutable registry state', () => {
    expect(getFeatureByHref('/administration/utilisateurs')).toBe(
      FEATURES.users,
    );
    expect(getFeatureById('system-activity')).toBe(FEATURES.systemActivity);
    expect(getFeatureByHref('/inconnu')).toBeNull();
  });
});

describe('typed API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns only the typed success payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: 'item-1' }, success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );

    await expect(apiFetchJson<{ id: string }>('/api/items')).resolves.toEqual({
      id: 'item-1',
    });
  });

  it('preserves structured errors, correlation and retry metadata', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { code: ErrorCode.RATE_LIMITED, message: 'Patientez' },
          success: false,
        }),
        {
          headers: { 'Retry-After': '30', 'x-request-id': 'request-1' },
          status: 429,
        },
      ),
    );

    const error = await apiFetchJson('/api/items').catch(
      (caughtError: unknown) => caughtError,
    );

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      code: ErrorCode.RATE_LIMITED,
      requestId: 'request-1',
      retryAfter: 30,
      status: 429,
    });
  });

  it('builds consistent JSON mutation requests', () => {
    const request = jsonRequest(
      'PATCH',
      { title: 'Test' },
      {
        headers: { 'If-Match': 'revision-1' },
      },
    );

    expect(request).toMatchObject({
      body: JSON.stringify({ title: 'Test' }),
      method: 'PATCH',
    });
    expect(new Headers(request.headers).get('Content-Type')).toBe(
      'application/json',
    );
    expect(new Headers(request.headers).get('If-Match')).toBe('revision-1');
  });
});
