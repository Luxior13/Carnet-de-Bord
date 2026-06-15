type CsvValue = boolean | Date | null | number | string | undefined;

const escapeCsvField = (value: CsvValue): string => {
  if (value === null || value === undefined) return '';

  const normalized =
    value instanceof Date ? value.toISOString() : String(value);

  const escaped = normalized.replaceAll('"', '""');
  const shouldQuote =
    escaped.includes(',') || escaped.includes('\n') || escaped.includes('\r');

  return shouldQuote ? `"${escaped}"` : escaped;
};

export const toCsv = (
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<CsvValue>>,
): string => {
  const lines = [
    headers.map((header) => escapeCsvField(header)).join(','),
    ...rows.map((row) => row.map((value) => escapeCsvField(value)).join(',')),
  ];

  return lines.join('\n');
};
