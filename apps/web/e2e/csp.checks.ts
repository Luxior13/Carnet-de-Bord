import { type BrowserContext, expect } from '@playwright/test';

/**
 * Content Security Policy refusals seen by the browser (30 October 2026): a
 * refused script can leave a page without its interactions while every
 * journey that does not click it stays green, so any refusal fails the run.
 */
export function watchContentSecurityPolicy(
  context: BrowserContext,
  refusals: string[],
): void {
  context.on('console', (message) => {
    const text = message.text();
    if (!/Content Security Policy/i.test(text)) return;
    const page = message.page()?.url() ?? 'page inconnue';
    // The nonce changes on every response: kept out of the report.
    refusals.push(
      `${new URL(page).pathname} — ${text.replace(/'nonce-[^']+'/g, "'nonce-…'")}`,
    );
  });
}

export function expectNoContentSecurityPolicyRefusal(refusals: string[]): void {
  expect(
    [...new Set(refusals)],
    'Refus de la politique de sécurité du contenu (middleware.ts)',
  ).toEqual([]);
}
