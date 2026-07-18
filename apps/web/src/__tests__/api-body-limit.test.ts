import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { MAX_JSON_BODY_BYTES, parseJsonBody } from '$server/api-response';
import { ErrorCode } from '$types/api.types';

describe('bounded JSON request bodies', () => {
  it('parses a normal JSON payload', async () => {
    const result = await parseJsonBody(
      new Request('http://localhost/api/test', {
        body: JSON.stringify({ value: 'ok' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(result).toEqual({ data: { value: 'ok' }, success: true });
  });

  it('rejects an announced oversized payload before reading it', async () => {
    const result = await parseJsonBody(
      new Request('http://localhost/api/test', {
        body: '{}',
        headers: {
          'content-length': String(MAX_JSON_BODY_BYTES + 1),
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.response.status).toBe(413);
    expect(await result.response.json()).toMatchObject({
      error: { code: ErrorCode.PAYLOAD_TOO_LARGE },
      success: false,
    });
  });

  it('stops an oversized streamed payload without a content length', async () => {
    const result = await parseJsonBody(
      new Request('http://localhost/api/test', {
        body: `"${'a'.repeat(MAX_JSON_BODY_BYTES)}"`,
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.response.status).toBe(413);
  });
});
