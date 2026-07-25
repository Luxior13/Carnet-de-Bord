import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
} from 'libphonenumber-js';

const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });

export const PHONE_COUNTRY_OPTIONS = getCountries()
  .map((code): readonly [CountryCode, string] => [
    code,
    `${regionNames.of(code) ?? code} (+${getCountryCallingCode(code)})`,
  ])
  .sort(([leftCode, leftLabel], [rightCode, rightLabel]) => {
    if (leftCode === 'FR') return -1;
    if (rightCode === 'FR') return 1;

    return leftLabel.localeCompare(rightLabel, 'fr');
  });
