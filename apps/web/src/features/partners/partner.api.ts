import { ErrorCode } from '$types/api.types';
import {
  ApiClientError,
  apiFetch,
  apiFetchJson,
  jsonRequest,
} from '$utils/api.utils';

import type {
  PartnerActivityItem,
  PartnerDetail,
  PartnerListSort,
  PartnerMutationResponse,
  PartnersListResponse,
  PartnerStatus,
} from './types/partner.types';

type Payload = Record<string, unknown>;

export const listPartners = (options: {
  category?: 'PARTNER' | 'SPONSOR';
  cursor?: string;
  limit?: number;
  q?: string;
  signal?: AbortSignal;
  sort?: PartnerListSort;
  status?: PartnerStatus;
}): Promise<PartnersListResponse> => {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 25),
    sort: options.sort ?? 'name',
  });
  if (options.category) params.set('category', options.category);
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.q) params.set('q', options.q);
  if (options.status) params.set('status', options.status);

  return apiFetchJson(`/api/partenaires?${params}`, {
    cache: 'no-store',
    signal: options.signal,
  });
};

export const getPartner = (id: string): Promise<PartnerDetail> =>
  apiFetchJson(`/api/partenaires/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });

export const createPartner = (
  payload: Payload,
): Promise<PartnerMutationResponse> =>
  apiFetchJson('/api/partenaires', jsonRequest('POST', payload));

export const updatePartner = async (
  id: string,
  payload: Payload,
): Promise<PartnerDetail> => {
  const response = await apiFetchJson<PartnerMutationResponse>(
    `/api/partenaires/${encodeURIComponent(id)}`,
    jsonRequest('PATCH', payload),
  );

  return response.partner;
};

export const addPartnerContact = async (
  id: string,
  payload: Payload,
): Promise<PartnerDetail> => {
  const response = await apiFetchJson<PartnerMutationResponse>(
    `/api/partenaires/${encodeURIComponent(id)}/contacts`,
    jsonRequest('POST', payload),
  );

  return response.partner;
};

export const updatePartnerContact = async (
  id: string,
  contactId: string,
  payload: Payload,
): Promise<PartnerDetail> => {
  const response = await apiFetchJson<PartnerMutationResponse>(
    `/api/partenaires/${encodeURIComponent(id)}/contacts/${encodeURIComponent(contactId)}`,
    jsonRequest('PATCH', payload),
  );

  return response.partner;
};

export const addPartnerFollowUp = async (
  id: string,
  payload: Payload,
): Promise<PartnerDetail> => {
  const response = await apiFetchJson<PartnerMutationResponse>(
    `/api/partenaires/${encodeURIComponent(id)}/suivis`,
    jsonRequest('POST', payload),
  );

  return response.partner;
};

export const updatePartnerFollowUp = async (
  id: string,
  entryId: string,
  payload: Payload,
): Promise<PartnerDetail> => {
  const response = await apiFetchJson<PartnerMutationResponse>(
    `/api/partenaires/${encodeURIComponent(id)}/suivis/${encodeURIComponent(entryId)}`,
    jsonRequest('PATCH', payload),
  );

  return response.partner;
};

export const deletePartnerFollowUp = async (
  id: string,
  entryId: string,
  version: number,
): Promise<PartnerDetail> => {
  const response = await apiFetchJson<PartnerMutationResponse>(
    `/api/partenaires/${encodeURIComponent(id)}/suivis/${encodeURIComponent(entryId)}`,
    jsonRequest('DELETE', { version }),
  );

  return response.partner;
};

export const setPartnerActionCompleted = async (
  id: string,
  entryId: string,
  completed: boolean,
  version: number,
): Promise<PartnerDetail> => {
  const response = await apiFetchJson<PartnerMutationResponse>(
    `/api/partenaires/${encodeURIComponent(id)}/suivis/${encodeURIComponent(entryId)}/action`,
    jsonRequest('PATCH', { completed, version }),
  );

  return response.partner;
};

export const getPartnerActivity = (
  id: string,
): Promise<PartnerActivityItem[]> =>
  apiFetchJson(`/api/partenaires/${encodeURIComponent(id)}/activite`, {
    cache: 'no-store',
  });

export const deletePartner = async (
  id: string,
  version: number,
  idempotencyKey = crypto.randomUUID(),
): Promise<void> => {
  const response = await apiFetch(
    `/api/partenaires/${encodeURIComponent(id)}`,
    jsonRequest(
      'DELETE',
      { version },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    ),
  );
  if (response.status === 204) return;
  let message = 'La suppression a échoué';
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    message = body.error?.message ?? message;
  } catch {
    // Keep the stable fallback.
  }
  throw new ApiClientError({
    code: ErrorCode.CONFLICT,
    message,
    requestId: response.headers.get('x-request-id'),
    retryAfter: null,
    status: response.status,
  });
};
