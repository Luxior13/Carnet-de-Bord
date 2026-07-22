import { createAvatar } from '@dicebear/core';
import * as loreleiNeutral from '@dicebear/lorelei-neutral';
import React, { type FC } from 'react';

import { DiceBearAvatar } from '$ui/dicebear-avatar';

import { getPersonDisplayName, getPersonInitials } from '../person.ui';
import type { PersonSummary } from '../types/person.types';

type AvatarPerson = Pick<
  PersonSummary,
  'firstName' | 'id' | 'lastName' | 'nickname'
>;

type PersonAvatarProps = {
  className?: string;
  person: AvatarPerson;
};

const DIRECTORY_BACKGROUND_COLORS = [
  'd7e3f4',
  'ded8ef',
  'd5e8eb',
  'ead9df',
  'e8e0cf',
];

const createDirectoryAvatarDataUri = (seed: string): string =>
  createAvatar(loreleiNeutral, {
    backgroundColor: DIRECTORY_BACKGROUND_COLORS,
    radius: 50,
    seed,
    size: 96,
  }).toDataUri();

export const PersonAvatar: FC<PersonAvatarProps> = ({ className, person }) => (
  <DiceBearAvatar
    className={className}
    createDataUri={createDirectoryAvatarDataUri}
    fallback={getPersonInitials(person)}
    label={`Avatar de la fiche ${getPersonDisplayName(person)}`}
    seed={`person:${person.id}`}
  />
);
