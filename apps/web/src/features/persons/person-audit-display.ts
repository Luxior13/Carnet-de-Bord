import {
  getPersonSocialNetwork,
  PERSON_STRUCTURE_STATUS_LABELS,
} from './person.constants';

const FIELD_LABELS = new Map([
  ['nickname', 'Pseudo'],
  ['firstName', 'Prénom'],
  ['lastName', 'Nom'],
  ['birthDate', 'Date de naissance'],
  ['structureStatus', 'Situation dans la structure'],
  ['email', 'Email'],
  ['phone', 'Téléphone'],
  ['label', 'Libellé'],
  ['isPrimary', 'Coordonnée principale'],
  ['networkKey', 'Réseau social'],
  ['identifier', 'Identifiant'],
  ['profileUrl', 'Lien du profil'],
]);

const SECTION_LABELS = new Map([
  ['identity', 'Identité'],
  ['contacts', 'Coordonnées'],
  ['social', 'Réseaux sociaux'],
  ['structure', 'Structure'],
]);

export const getPersonAuditFieldLabel = (fieldKey: string): string =>
  FIELD_LABELS.get(fieldKey) ?? fieldKey;
export const getPersonAuditSectionLabel = (sectionKey: string): string =>
  SECTION_LABELS.get(sectionKey) ?? sectionKey;

/** Civil dates must not move a day when the reader changes time zone. */
export const formatPersonAuditValue = (
  fieldKey: string,
  value: unknown,
): string | null => {
  if (fieldKey === 'isPrimary' && typeof value === 'boolean')
    return value ? 'Oui' : 'Non';
  if (typeof value !== 'string') return null;
  if (fieldKey === 'structureStatus') {
    if (value === 'IN_STRUCTURE' || value === 'OUTSIDE_STRUCTURE')
      // Narrowed to the two domain-owned status keys above.
      // eslint-disable-next-line security/detect-object-injection
      return PERSON_STRUCTURE_STATUS_LABELS[value];
  }
  if (fieldKey === 'networkKey')
    return getPersonSocialNetwork(value)?.label ?? value;
  if (fieldKey === 'birthDate' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()))
      return date.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
  }

  return null;
};
