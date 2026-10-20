'use client';

import { Globe, Mail, Phone, Search } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

import {
  formatPersonActor,
  formatPersonDateTime,
  getPersonDisplayName,
} from '../person.ui';
import type { PersonSummary } from '../types/person.types';
import { PersonAvatar } from './PersonAvatar';

/** Decorative avatar frame shared by the table row and the mobile card. */
export const PersonAvatarFrame: FC<{ person: PersonSummary }> = ({
  person,
}) => (
  <span
    aria-hidden="true"
    className="border-border-default bg-surface-inset relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border"
  >
    <PersonAvatar className="size-full rounded-[inherit]" person={person} />
  </span>
);

/** Explains why a row matches a search that did not hit the name. */
export const PersonContactMatchHint: FC<{ className?: string }> = ({
  className,
}) => (
  <p
    className={cn(
      'text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs leading-5',
      className,
    )}
  >
    <Search aria-hidden="true" className="size-3 shrink-0" />
    <span className="truncate">Trouvée par email, téléphone ou réseau</span>
  </p>
);

const ContactCount: FC<{
  count: number;
  icon: React.ReactNode;
  label: string;
}> = ({ count, icon, label }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 tabular-nums',
      count === 0 && 'opacity-50',
    )}
    title={`${count} ${label}`}
  >
    {icon}
    {count}
    <span className="sr-only"> {label}</span>
  </span>
);

export const PersonContacts: FC<{ person: PersonSummary }> = ({ person }) => {
  if (!person.contactCounts)
    return <span className="text-muted-foreground text-xs">Masquées</span>;
  const { emails, phones, socialProfiles } = person.contactCounts;

  if (emails + phones + socialProfiles === 0) {
    return (
      <span className="text-muted-foreground text-xs">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Aucune coordonnée</span>
      </span>
    );
  }

  return (
    <span className="text-muted-foreground flex flex-nowrap items-center gap-x-3 text-xs">
      <ContactCount
        count={emails}
        icon={<Mail aria-hidden="true" className="size-3.5" />}
        label={emails > 1 ? 'emails' : 'email'}
      />
      <ContactCount
        count={phones}
        icon={<Phone aria-hidden="true" className="size-3.5" />}
        label={phones > 1 ? 'téléphones' : 'téléphone'}
      />
      <ContactCount
        count={socialProfiles}
        icon={<Globe aria-hidden="true" className="size-3.5" />}
        label={socialProfiles > 1 ? 'profils sociaux' : 'profil social'}
      />
    </span>
  );
};

export const PersonLastModified: FC<{
  person: PersonSummary;
}> = ({ person }) => {
  const actor = person.lastModifiedBy;
  const time = (
    <time dateTime={person.updatedAt}>
      {formatPersonDateTime(person.updatedAt)}
    </time>
  );

  if (!actor) {
    return <span className="text-muted-foreground text-xs">{time}</span>;
  }

  const actorLabel = `Modifiée par ${formatPersonActor(actor)}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={`${actorLabel}, le ${formatPersonDateTime(person.updatedAt)}`}
          className="text-muted-foreground focus-visible:ring-ring relative z-10 inline-block rounded-sm text-xs focus-visible:ring-2 focus-visible:outline-none"
          tabIndex={0}
        >
          {time}
        </span>
      </TooltipTrigger>
      <TooltipContent>{actorLabel}</TooltipContent>
    </Tooltip>
  );
};

export const PersonIdentity: FC<{
  href: string;
  person: PersonSummary;
}> = ({ href, person }) => (
  <div className="flex min-w-0 items-center gap-2.5">
    <PersonAvatarFrame person={person} />
    <div className="min-w-0 flex-1">
      {/* The row draws the focus ring: the link only stretches over it. */}
      <Link
        className="text-foreground hover:text-primary-emphasis block min-w-0 text-sm leading-[1.6] font-semibold outline-none after:absolute after:inset-0 hover:underline hover:underline-offset-[3px]"
        href={href}
        title={getPersonDisplayName(person)}
      >
        <span className="block truncate">{getPersonDisplayName(person)}</span>
      </Link>
      {person.matchedByContact && <PersonContactMatchHint />}
    </div>
  </div>
);
