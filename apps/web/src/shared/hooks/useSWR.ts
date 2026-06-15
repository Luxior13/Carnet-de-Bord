'use client';

import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';
import useSWRMutation, {
  type SWRMutationConfiguration,
  type SWRMutationResponse,
} from 'swr/mutation';

import { apiFetch } from '$utils/api.utils';

// ============================================
// FETCHER
// ============================================

/**
 * Fetcher pour SWR qui gère le format de réponse API { success, data, error }
 */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();

  if (!json.success) {
    const error = new Error(json.error?.message || 'Erreur API');
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }

  return json.data as T;
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook SWR pour les requêtes GET avec cache automatique
 */
export function useAPI<T>(
  url: string | null,
  config?: SWRConfiguration<T>,
): SWRResponse<T> {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    ...config,
  });
}

/**
 * Hook SWR pour les mutations (POST, PATCH, DELETE)
 */
export function useAPIMutation<T, A = Record<string, unknown>>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
  config?: SWRMutationConfiguration<T, Error, string, A>,
): SWRMutationResponse<T, Error, string, A> {
  return useSWRMutation<T, Error, string, A>(
    url,
    async (key: string, { arg }: { arg: A }) => {
      const res = await apiFetch(key, {
        body: JSON.stringify(arg),
        headers: { 'Content-Type': 'application/json' },
        method,
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error?.message || 'Erreur API');
      }

      return json.data as T;
    },
    config,
  );
}

// Re-export pour faciliter l'import
export { useSWRConfig } from 'swr';
