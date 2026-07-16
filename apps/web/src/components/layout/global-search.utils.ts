export type RankedSearchItem = {
  labelSearchText: string;
  searchText: string;
  spaceSearchText: string;
};

export function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSearchScore(
  item: RankedSearchItem,
  normalizedQuery: string,
): number | null {
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  if (
    queryTokens.length === 0 ||
    !queryTokens.every((token) => item.searchText.includes(token))
  ) {
    return null;
  }

  const labelTokens = item.labelSearchText.split(' ').filter(Boolean);
  let score = 0;

  if (item.labelSearchText === normalizedQuery) score += 1_000;
  else if (item.labelSearchText.startsWith(normalizedQuery)) score += 700;
  else if (item.labelSearchText.includes(normalizedQuery)) score += 500;

  if (item.spaceSearchText === normalizedQuery) score += 300;
  else if (item.spaceSearchText.startsWith(normalizedQuery)) score += 180;

  for (const token of queryTokens) {
    if (labelTokens.includes(token)) score += 100;
    else if (labelTokens.some((labelToken) => labelToken.startsWith(token))) {
      score += 70;
    } else if (item.labelSearchText.includes(token)) score += 40;
    else if (item.spaceSearchText.includes(token)) score += 20;
    else score += 10;
  }

  return score;
}

export function rankSearchResults<T extends RankedSearchItem>(
  results: readonly T[],
  normalizedQuery: string,
  limit = 10,
): T[] {
  return results
    .map((item) => ({ item, score: getSearchScore(item, normalizedQuery) }))
    .filter(
      (entry): entry is { item: T; score: number } => entry.score !== null,
    )
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
