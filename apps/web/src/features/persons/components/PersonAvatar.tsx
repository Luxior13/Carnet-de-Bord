import { Avatar, Style } from '@dicebear/core';
import glyphsDefinition from '@dicebear/styles/glyphs.json';
import React, { type FC } from 'react';

import { DiceBearAvatar } from '$ui/dicebear-avatar';
import { cn } from '$utils/css.utils';

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
  '8fd3cf',
  '9ad9c4',
  '80c8d8',
  'a6dfd5',
  '91c9bd',
];

const GLYPHS_STYLE = new Style(glyphsDefinition);

const createDirectoryAvatarDataUri = (seed: string): string =>
  new Avatar(GLYPHS_STYLE, {
    backgroundColor: DIRECTORY_BACKGROUND_COLORS,
    // Square canvas: list and detail containers own the corner radius.
    borderRadius: 0,
    seed,
    size: 96,
  }).toDataUri();

export const PersonAvatar: FC<PersonAvatarProps> = ({ className, person }) => (
  <DiceBearAvatar
    className={cn('bg-nav-internal text-nav-internal-foreground', className)}
    createDataUri={createDirectoryAvatarDataUri}
    fallback={getPersonInitials(person)}
    label={`Avatar de la fiche ${getPersonDisplayName(person)}`}
    seed={`person:${person.id}`}
  />
);
