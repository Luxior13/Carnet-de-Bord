import { apiFetchJson, jsonRequest } from '$utils/api.utils';

import type {
  InternalAnnouncementItem,
  InternalNewsFilter,
  InternalNewsResponse,
  PublishInternalAnnouncementInput,
  UpdateInternalAnnouncementPinInput,
} from './internal-news.types';

const INTERNAL_NEWS_API_PATH = '/api/actualite-interne';

export const fetchInternalNews = async (input: {
  cursor?: string;
  filter: InternalNewsFilter;
  signal?: AbortSignal;
}): Promise<InternalNewsResponse> => {
  const searchParams = new URLSearchParams({ filter: input.filter });
  if (input.cursor) searchParams.set('cursor', input.cursor);

  return apiFetchJson<InternalNewsResponse>(
    `${INTERNAL_NEWS_API_PATH}?${searchParams}`,
    { signal: input.signal },
  );
};

export const publishInternalAnnouncement = (
  input: PublishInternalAnnouncementInput,
): Promise<InternalAnnouncementItem> =>
  apiFetchJson<InternalAnnouncementItem>(
    INTERNAL_NEWS_API_PATH,
    jsonRequest('POST', input),
  );

export const updateInternalAnnouncementPin = (
  announcementId: string,
  input: UpdateInternalAnnouncementPinInput,
): Promise<InternalAnnouncementItem> =>
  apiFetchJson<InternalAnnouncementItem>(
    `${INTERNAL_NEWS_API_PATH}/${encodeURIComponent(announcementId)}`,
    jsonRequest('PATCH', input),
  );
