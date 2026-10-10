'use client';

import { Mail, Phone, Search, Share2 } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

import { formatPersonDateTime, getPersonDisplayName } from '../person.ui';
import type { PersonSummary } from '../types/person.types';
import { PersonAvatar } from './PersonAvatar';

const ContactCount: FC<{
  count: number;
  icon: React.ReactNode;
  label: string;
}> = ({ count, icon, label }) => (
  <span
    aria-label={`${count} ${label}`}
    className={cn(
      'inline-flex items-center gap-1 text-[10px] tabular-nums',
      count === 0 && 'opacity-50',
    )}
    title={`${count} ${label}`}
  >
    {icon}
    {count}
  </span>
);

export const PersonContacts: FC<{ person: PersonSummary }> = ({ person }) => {
  const { emails, phones, socialProfiles } = person.contactCounts;
  const total = emails + phones + socialProfiles;

  if (total === 0) {
    return (
      <span
        aria-label="Aucune coordonnée"
        className="text-muted-foreground text-[11px]"
      >
        —
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-[var(--border-external)] bg-[var(--surface-external)] px-1.5 py-0.5 text-[10px] leading-5 font-medium whitespace-nowrap text-[var(--text-external)]">
        <Share2 aria-hidden="true" className="size-3.5 shrink-0" />
        {total} coordonnée{total > 1 ? 's' : ''}
      </span>
      <span className="text-muted-foreground flex flex-nowrap items-center gap-x-2 gap-y-1 text-[10px]">
        <ContactCount
          count={emails}
          icon={<Mail aria-hidden="true" className="size-3" />}
          label="email(s)"
        />
        <ContactCount
          count={phones}
          icon={<Phone aria-hidden="true" className="size-3" />}
          label="téléphone(s)"
        />
        <ContactCount
          count={socialProfiles}
          icon={<Share2 aria-hidden="true" className="size-3" />}
          label="profil(s) social(aux)"
        />
      </span>
    </div>
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
    return <span className="text-muted-foreground text-[11px]">{time}</span>;
  }

  const actorLabel = `Modifiée par ${actor.displayName}${
    actor.loginName && actor.loginName !== actor.displayName
      ? ` (${actor.loginName})`
      : ''
  }`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={`${actorLabel}, le ${formatPersonDateTime(person.updatedAt)}`}
          className="text-muted-foreground focus-visible:ring-ring relative z-10 inline-block rounded-sm text-[11px] focus-visible:ring-2 focus-visible:outline-none"
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
    <span
      aria-hidden="true"
      className="border-border-default bg-surface-inset relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border"
    >
      <PersonAvatar className="size-full rounded-[inherit]" person={person} />
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <Link
          className="text-foreground hover:text-primary-emphasis min-w-0 flex-1 text-[13px] leading-[1.6] font-semibold after:absolute after:inset-0 hover:underline hover:underline-offset-[3px]"
          href={href}
          title={getPersonDisplayName(person)}
        >
          <span className="block truncate">{getPersonDisplayName(person)}</span>
        </Link>
      </div>
      {person.matchedByContact && (
        <p className="text-success mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] leading-5">
          <Search aria-hidden="true" className="size-3 shrink-0" />
          <span className="truncate">
            Trouvée par email, téléphone ou réseau
          </span>
        </p>
      )}
    </div>
  </div>
);
