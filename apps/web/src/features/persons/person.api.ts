import {
  ApiClientError,
  apiFetch,
  apiFetchJson,
  jsonRequest,
} from '$utils/api.utils';

import type {
  PersonDetail,
  PersonFieldHistoryResponse,
  PersonMutationResponse,
  PersonsListResponse,
  PersonStructureStatus,
} from './types/person.types';

type ListPersonsOptions = {
  cursor?: string;
  limit?: number;
  q?: string;
  structureStatus?: PersonStructureStatus;
};

type PersonMutationPayload = Record<string, unknown>;

const toMutationResponse = (
  response: PersonMutationResponse | PersonDetail,
): PersonMutationResponse =>
  'person' in response ? response : { person: response };

const getErrorPayload = async (
  response: Response,
): Promise<{
  code: string;
  details?: Record<string, string[]>;
  message: string;
}> => {
  try {
    const body = (await response.json()) as {
      error?: {
        code?: string;
        details?: Record<string, string[]>;
        message?: string;
      };
    };

    return {
      code: body.error?.code ?? 'INVALID_RESPONSE',
      ...(body.error?.details ? { details: body.error.details } : {}),
      message: body.error?.message ?? 'La requête a échoué',
    };
  } catch {
    return {
      code: 'INVALID_RESPONSE',
      message: 'Réponse serveur invalide',
    };
  }
};

export const listPersons = async ({
  cursor,
  limit = 25,
  q,
  structureStatus,
}: ListPersonsOptions): Promise<PersonsListResponse> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  if (q) params.set('q', q);
  if (structureStatus) params.set('structureStatus', structureStatus);

  return apiFetchJson<PersonsListResponse>(`/api/personnes?${params}`);
};

export const getPerson = (personId: string): Promise<PersonDetail> =>
  apiFetchJson<PersonDetail>(`/api/personnes/${encodeURIComponent(personId)}`);

export const createPerson = async (
  payload: PersonMutationPayload,
): Promise<PersonMutationResponse> =>
  toMutationResponse(
    await apiFetchJson<PersonMutationResponse | PersonDetail>(
      '/api/personnes',
      jsonRequest('POST', payload),
    ),
  );

export const updatePerson = async (
  personId: string,
  payload: PersonMutationPayload,
): Promise<PersonMutationResponse> =>
  toMutationResponse(
    await apiFetchJson<PersonMutationResponse | PersonDetail>(
      `/api/personnes/${encodeURIComponent(personId)}`,
      jsonRequest('PATCH', payload),
    ),
  );

type ChildKind = 'emails' | 'reseaux-sociaux' | 'telephones';

export const mutatePersonChild = async ({
  childId,
  kind,
  method,
  payload,
  personId,
}: {
  childId?: string;
  kind: ChildKind;
  method: 'DELETE' | 'PATCH' | 'POST';
  payload: PersonMutationPayload;
  personId: string;
}): Promise<PersonMutationResponse> => {
  const base = `/api/personnes/${encodeURIComponent(personId)}/${kind}`;
  const url = childId ? `${base}/${encodeURIComponent(childId)}` : base;

  return toMutationResponse(
    await apiFetchJson<PersonMutationResponse | PersonDetail>(
      url,
      jsonRequest(method, payload),
    ),
  );
};

export const getPersonFieldHistory = ({
  fieldKey,
  personId,
  recordId,
  sectionKey,
}: {
  fieldKey: string;
  personId: string;
  recordId?: string;
  sectionKey: string;
}): Promise<PersonFieldHistoryResponse> => {
  const params = new URLSearchParams({ fieldKey, sectionKey });
  if (recordId) params.set('recordId', recordId);

  return apiFetchJson<PersonFieldHistoryResponse>(
    `/api/personnes/${encodeURIComponent(personId)}/historique-champ?${params}`,
    { cache: 'no-store' },
  );
};

export const deletePerson = async ({
  idempotencyKey,
  personId,
  version,
}: {
  idempotencyKey: string;
  personId: string;
  version: number;
}): Promise<void> => {
  const response = await apiFetch(
    `/api/personnes/${encodeURIComponent(personId)}`,
    jsonRequest(
      'DELETE',
      { version },
      {
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    ),
  );
  if (response.status === 204) return;

  const error = await getErrorPayload(response);
  throw new ApiClientError({
    code: error.code as ApiClientError['code'],
    ...(error.details ? { details: error.details } : {}),
    message: error.message,
    requestId: response.headers.get('x-request-id'),
    retryAfter: null,
    status: response.status,
  });
};
