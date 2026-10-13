import type { Page } from '@playwright/test';

/** Use Chromium's cookie rules, including Secure cookies on the loopback host. */
export async function browserApi<T = unknown>(
  page: Page,
  href: string,
  options: {
    data?: unknown;
    headers?: Record<string, string>;
    method?: string;
  } = {},
): Promise<{ json: () => Promise<T>; status: () => number }> {
  const result = await page.evaluate(
    async ({ href, options }) => {
      const response = await fetch(href, {
        body:
          options.data === undefined ? undefined : JSON.stringify(options.data),
        credentials: 'same-origin',
        headers: {
          ...(options.data === undefined
            ? {}
            : { 'content-type': 'application/json' }),
          ...options.headers,
        },
        method: options.method ?? 'GET',
      });

      return { payload: await response.json(), status: response.status };
    },
    { href, options },
  );

  return { json: async () => result.payload as T, status: () => result.status };
}
