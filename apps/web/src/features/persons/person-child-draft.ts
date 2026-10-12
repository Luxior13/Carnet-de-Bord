import type {
  EmailDraft,
  PhoneDraft,
  SocialDraft,
} from './components/PersonCollectionFields';
import type {
  PersonEmailItem,
  PersonPhoneItem,
  PersonSocialProfileItem,
} from './types/person.types';

export type PersonChildKind = 'email' | 'phone' | 'social';
export type PersonChildItem =
  PersonEmailItem | PersonPhoneItem | PersonSocialProfileItem;
export type ChildDraft = EmailDraft | PhoneDraft | SocialDraft;

export const getDraft = (
  kind: PersonChildKind,
  item: PersonChildItem | null,
  defaultPrimary: boolean,
): ChildDraft => {
  if (kind === 'email') {
    const email = item as PersonEmailItem | null;

    return {
      email: email?.email ?? '',
      isPrimary: email?.isPrimary ?? defaultPrimary,
      label: email?.label ?? 'Personnel',
    };
  }
  if (kind === 'phone') {
    const phone = item as PersonPhoneItem | null;

    return {
      countryCode: phone?.countryCode ?? 'FR',
      isPrimary: phone?.isPrimary ?? defaultPrimary,
      label: phone?.label ?? 'Personnel',
      phone: phone?.phone ?? '',
    };
  }
  const social = item as PersonSocialProfileItem | null;

  return {
    identifier: social?.identifier ?? '',
    isPrimary: social?.isPrimary ?? defaultPrimary,
    label: social?.label ?? 'Personnel',
    networkKey: social?.networkKey ?? 'discord',
    profileUrl: social?.profileUrl ?? '',
  };
};

export const comparableValue = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const sameDraft = (left: ChildDraft, right: ChildDraft): boolean =>
  Object.entries(left).every(
    ([key, value]) =>
      comparableValue(value) ===
      comparableValue(
        Object.entries(right).find(([entry]) => entry === key)?.[1],
      ),
  );

/** Conserve les champs retouchés ; reprend la valeur serveur des autres champs. */
export const mergeDraft = (
  previous: ChildDraft,
  current: ChildDraft,
  fresh: ChildDraft,
): ChildDraft =>
  Object.fromEntries(
    Object.entries(fresh).map(([key, value]) => {
      const local = Object.entries(current).find(
        ([entry]) => entry === key,
      )?.[1];
      const base = Object.entries(previous).find(
        ([entry]) => entry === key,
      )?.[1];

      return [
        key,
        comparableValue(local) === comparableValue(base) ? value : local,
      ];
    }),
  ) as ChildDraft;

export const getKindConfig = (
  kind: PersonChildKind,
): {
  plural: 'emails' | 'reseaux-sociaux' | 'telephones';
  title: string;
} => {
  switch (kind) {
    case 'email':
      return { plural: 'emails', title: 'email' };
    case 'phone':
      return { plural: 'telephones', title: 'téléphone' };
    case 'social':
      return { plural: 'reseaux-sociaux', title: 'profil social' };
  }
};
