'use client';

import { ShieldCheck, UserMinus } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import { ContentState } from '$components/layout/ContentState';
import { UserAvatar } from '$components/users/UserAvatar';
import { UserAccessBadge, UserStatusBadge } from '$features/users/user-badges';
import { formatUserLastLogin } from '$features/users/users-list.utils';
import type { UserType } from '$types/auth.types';
import { Button } from '$ui/button';
import { DataTableDesktop, DataTableMobileList } from '$ui/data-table-section';
import directoryStyles from '$ui/directory.module.css';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '$ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';
import {
  getUserDisplayName,
  getUserLoginDisplay,
  isUserIdentityMasked,
} from '$utils/user-display.utils';

import styles from './UsersList.module.css';
const ProtectedIdentityIcon: FC = () => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        aria-label="Identité protégée"
        className="text-muted-foreground relative z-20 inline-flex size-4 shrink-0 items-center justify-center"
      >
        <ShieldCheck aria-hidden="true" className="size-4" />
      </span>
    </TooltipTrigger>
    <TooltipContent>Identité protégée</TooltipContent>
  </Tooltip>
);

type Props = {
  canViewContact: boolean;
  clearFilters: () => void;
  currentUser: UserType | null;
  displayedUsers: UserType[];
  getUserDetailHref: (id: string) => string;
  hasActiveFilters: boolean;
  loadError: string | null;
  securityDetailsVisible: boolean;
};
export const UsersListResults: FC<Props> = ({
  canViewContact,
  clearFilters,
  currentUser,
  displayedUsers,
  getUserDetailHref,
  hasActiveFilters,
  loadError,
  securityDetailsVisible,
}) => (
  <div
    className={styles.results}
    data-columns={
      canViewContact
        ? securityDetailsVisible
          ? 'all'
          : 'contact'
        : securityDetailsVisible
          ? 'security'
          : 'base'
    }
  >
    <DataTableDesktop className={styles.desktop}>
      <Table
        aria-label="Comptes utilisateurs"
        className={directoryStyles.table}
      >
        <TableCaption className="sr-only">
          Les comptes utilisateurs, leur accès, leur état et leur dernière
          connexion
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Compte</TableHead>
            <TableHead className="w-[130px]">Accès</TableHead>
            <TableHead className="w-[130px]">État</TableHead>
            {canViewContact && (
              <TableHead className="w-[220px]">Email</TableHead>
            )}
            {securityDetailsVisible && (
              <TableHead className="w-[130px]">Mot de passe</TableHead>
            )}
            <TableHead className="w-[150px]">Dernière connexion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedUsers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={
                  4 +
                  (canViewContact ? 1 : 0) +
                  (securityDetailsVisible ? 1 : 0)
                }
                className="h-44 text-center"
              >
                <ContentState
                  className="min-h-0 border-0 bg-transparent p-0"
                  icon={<UserMinus className="size-5" />}
                  layout="panel"
                  title={
                    loadError
                      ? 'Utilisateurs indisponibles'
                      : 'Aucun utilisateur trouvé'
                  }
                  action={
                    !loadError &&
                    hasActiveFilters && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={clearFilters}
                      >
                        Réinitialiser
                      </Button>
                    )
                  }
                />
              </TableCell>
            </TableRow>
          ) : (
            displayedUsers.map((user) => (
              <TableRow
                className="group/row focus-within:ring-ring relative cursor-pointer focus-within:ring-2 focus-within:ring-inset"
                key={user.id}
              >
                <TableCell>
                  <Link
                    aria-label={
                      user.id === currentUser?.id
                        ? 'Ouvrir mon compte'
                        : `Ouvrir le compte de ${getUserDisplayName(user)}`
                    }
                    className="group/link flex min-w-0 items-center gap-2.5 rounded-md outline-none after:absolute after:inset-0 after:z-10 after:content-['']"
                    href={getUserDetailHref(user.id)}
                    prefetch={false}
                  >
                    <UserAvatar
                      user={user}
                      className="border-border-default size-9 shrink-0 rounded-[7px] border"
                    />
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-col justify-center gap-0.5">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="text-foreground group-hover/link:text-primary-emphasis truncate text-[13px] leading-4 font-semibold group-hover/link:underline group-hover/link:underline-offset-[3px]">
                            {getUserDisplayName(user)}
                          </span>
                          {isUserIdentityMasked(user) && (
                            <ProtectedIdentityIcon />
                          )}
                        </span>
                        {!isUserIdentityMasked(user) && (
                          <span className="text-muted-foreground truncate text-[11px] leading-4">
                            {getUserLoginDisplay(user)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="pointer-events-none">
                  <UserAccessBadge user={user} />
                </TableCell>
                <TableCell className="pointer-events-none">
                  <UserStatusBadge isActive={user.isActive} />
                </TableCell>
                {canViewContact && (
                  <TableCell className="pointer-events-none">
                    {user.contactEmail ? (
                      <span className="text-muted-foreground block truncate text-xs leading-5">
                        {user.contactEmail}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs leading-5">
                        —
                      </span>
                    )}
                  </TableCell>
                )}
                {securityDetailsVisible && (
                  <TableCell className="pointer-events-none">
                    {user.mustChangePassword ? (
                      <span className="border-warning/40 bg-warning/15 text-warning inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap">
                        <span
                          aria-hidden="true"
                          className="size-1.5 shrink-0 rounded-full bg-current"
                        />
                        À changer
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">
                        —
                      </span>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground pointer-events-none text-[11px]">
                  {formatUserLastLogin(user)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </DataTableDesktop>
    <DataTableMobileList
      className={cn(styles.mobile, directoryStyles.mobileList)}
    >
      {displayedUsers.length === 0 ? (
        <ContentState
          className="min-h-48 border-0 bg-transparent"
          icon={<UserMinus className="size-5" />}
          layout="panel"
          title={
            loadError
              ? 'Utilisateurs indisponibles'
              : 'Aucun utilisateur trouvé'
          }
          action={
            !loadError &&
            hasActiveFilters && (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={clearFilters}
              >
                Réinitialiser
              </Button>
            )
          }
        />
      ) : (
        displayedUsers.map((user) => (
          <Link
            aria-label={
              user.id === currentUser?.id
                ? 'Ouvrir mon compte'
                : `Ouvrir le compte de ${getUserDisplayName(user)}`
            }
            className="focus-visible:bg-primary/10 focus-visible:ring-primary/70 block px-4 py-3 hover:bg-[var(--surface-row-hover)] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
            href={getUserDetailHref(user.id)}
            key={user.id}
            prefetch={false}
          >
            <div className="flex items-start gap-3">
              <UserAvatar
                user={user}
                className="border-border-default size-9 shrink-0 rounded-[7px] border"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="text-foreground group-hover:text-primary-emphasis min-w-0 text-[13px] leading-4 font-semibold [overflow-wrap:anywhere] group-hover:underline group-hover:underline-offset-[3px]">
                      {getUserDisplayName(user)}
                    </h3>
                    {isUserIdentityMasked(user) && <ProtectedIdentityIcon />}
                  </div>
                  {!isUserIdentityMasked(user) && (
                    <p className="text-muted-foreground truncate text-[11px] leading-4">
                      {getUserLoginDisplay(user)}
                      {user.contactEmail && <> · {user.contactEmail}</>}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <UserAccessBadge user={user} />
                  <UserStatusBadge isActive={user.isActive} />
                </div>
                {securityDetailsVisible && user.mustChangePassword && (
                  <div>
                    <span className="border-warning/40 bg-warning/15 text-warning inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap">
                      <span
                        aria-hidden="true"
                        className="size-1.5 shrink-0 rounded-full bg-current"
                      />
                      Mot de passe à changer
                    </span>
                  </div>
                )}
                <p className="text-muted-foreground text-[11px] leading-5 tabular-nums">
                  Dernière connexion : {formatUserLastLogin(user).toLowerCase()}
                </p>
              </div>
            </div>
          </Link>
        ))
      )}
    </DataTableMobileList>
  </div>
);
