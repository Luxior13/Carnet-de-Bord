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
import { StatusBadge } from '$ui/status-badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '$ui/table';
import { cn } from '$utils/css.utils';
import {
  getUserDisplayName,
  getUserLoginDisplay,
  isUserIdentityMasked,
} from '$utils/user-display.utils';

import styles from './UsersList.module.css';
const ProtectedIdentityIcon: FC = () => (
  <ShieldCheck
    aria-hidden="true"
    className="text-muted-foreground size-4 shrink-0"
  />
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
                className="has-[a:focus-visible]:ring-ring relative cursor-pointer has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset"
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
                    <span aria-hidden="true" className="shrink-0">
                      <UserAvatar
                        user={user}
                        className="border-border-default rounded-tile size-9 border"
                      />
                    </span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-col justify-center gap-0.5">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="text-foreground group-hover/link:text-primary-emphasis truncate text-sm leading-4 font-semibold group-hover/link:underline group-hover/link:underline-offset-[3px]">
                            {getUserDisplayName(user)}
                          </span>
                          {isUserIdentityMasked(user) && (
                            <ProtectedIdentityIcon />
                          )}
                        </span>
                        <span className="text-muted-foreground truncate text-xs leading-4">
                          {isUserIdentityMasked(user)
                            ? 'Identité protégée'
                            : getUserLoginDisplay(user)}
                        </span>
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
                    {isUserIdentityMasked(user) ? (
                      <span className="text-muted-foreground text-xs leading-5">
                        Masqué
                      </span>
                    ) : user.contactEmail ? (
                      <span className="text-muted-foreground block truncate text-xs leading-5">
                        {user.contactEmail}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs leading-5">
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">Aucun email de contact</span>
                      </span>
                    )}
                  </TableCell>
                )}
                {securityDetailsVisible && (
                  <TableCell className="pointer-events-none">
                    {user.securityDetailsVisible === false ? (
                      <span className="text-muted-foreground text-xs">
                        Masqué
                      </span>
                    ) : user.mustChangePassword ? (
                      <StatusBadge tone="warning">À changer</StatusBadge>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">
                          Aucun changement demandé
                        </span>
                      </span>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-muted-foreground pointer-events-none text-xs">
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
            className="group focus-visible:bg-primary/10 focus-visible:ring-ring block px-4 py-3 hover:bg-[var(--surface-row-hover)] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
            href={getUserDetailHref(user.id)}
            key={user.id}
            prefetch={false}
          >
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0">
                <UserAvatar
                  user={user}
                  className="border-border-default rounded-tile size-9 border"
                />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="text-foreground group-hover:text-primary-emphasis min-w-0 text-sm leading-4 font-semibold [overflow-wrap:anywhere] group-hover:underline group-hover:underline-offset-[3px]">
                      {getUserDisplayName(user)}
                    </h3>
                    {isUserIdentityMasked(user) && <ProtectedIdentityIcon />}
                  </div>
                  <p className="text-muted-foreground text-xs leading-4 [overflow-wrap:anywhere]">
                    {isUserIdentityMasked(user) ? (
                      'Identité protégée'
                    ) : (
                      <>
                        {getUserLoginDisplay(user)}
                        {canViewContact && user.contactEmail && (
                          <> · {user.contactEmail}</>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <UserAccessBadge user={user} />
                  <UserStatusBadge isActive={user.isActive} />
                </div>
                {securityDetailsVisible && user.mustChangePassword && (
                  <div>
                    <StatusBadge tone="warning">
                      Mot de passe à changer
                    </StatusBadge>
                  </div>
                )}
                <p className="text-muted-foreground text-xs leading-5 tabular-nums">
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
