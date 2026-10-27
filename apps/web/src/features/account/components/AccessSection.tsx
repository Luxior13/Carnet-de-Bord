'use client';

import { Check, Shield } from 'lucide-react';
import React, { type FC } from 'react';

import {
  DELEGABLE_PERMISSION_CATEGORIES,
  hasPermission,
} from '$constants/permissions.constants';
import type { UserType } from '$types/auth.types';
import { Card, CardContent, CardFooter, CardHeader } from '$ui/card';

import { SecurityCardTitle } from './SecurityCardTitle';

/**
 * Read-only summary of what the signed-in account may administer, so that a
 * delegated user does not have to discover it through the menu (audit
 * DRT-07, 25 October 2026). The role badge is already in the page header.
 * The server stays the only authority.
 */
export const AccessSection: FC<{ userData: UserType }> = ({ userData }) => {
  const grantedCategories = userData.isProtected
    ? []
    : DELEGABLE_PERMISSION_CATEGORIES.map((category) => ({
        ...category,
        permissions: category.permissions.filter((permission) =>
          hasPermission(userData.role, permission.key, userData.permissions),
        ),
      })).filter((category) => category.permissions.length > 0);
  const summary = userData.isProtected
    ? 'En tant que superadmin, vous disposez de toutes les autorisations, y compris la gestion des administrateurs et des rôles.'
    : userData.role === 'ADMIN'
      ? 'En tant qu’administrateur, vous disposez de toutes les autorisations administratives et des paramètres système. Seul le superadmin gère les autres administrateurs.'
      : grantedCategories.length === 0
        ? 'Aucune autorisation d’administration ne vous est accordée : vous accédez à votre espace personnel et aux pages ouvertes à tous.'
        : 'Autorisations d’administration qui vous sont accordées :';

  return (
    <section aria-labelledby="account-access-heading" className="space-y-3">
      <Card aria-labelledby="account-access-heading" className="min-w-0">
        <CardHeader className="p-4 sm:p-5">
          <SecurityCardTitle
            icon={<Shield className="size-3.5" />}
            id="account-access-heading"
          >
            Droits d’administration
          </SecurityCardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <p className="text-foreground text-sm leading-6">{summary}</p>
          {grantedCategories.length > 0 && userData.role !== 'ADMIN' && (
            <div className="space-y-4">
              {grantedCategories.map((category) => (
                <div className="space-y-2" key={category.key}>
                  <h4 className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
                    {category.label}
                  </h4>
                  <ul className="space-y-1.5">
                    {category.permissions.map((permission) => (
                      <li
                        className="text-foreground flex items-start gap-2 text-sm"
                        key={permission.key}
                      >
                        <Check
                          aria-hidden="true"
                          className="text-success mt-0.5 size-4 shrink-0"
                        />
                        {permission.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {!userData.isProtected && (
          <CardFooter className="p-4 sm:p-5">
            <p className="text-muted-foreground text-xs">
              Pour obtenir un accès supplémentaire, adressez-vous à un
              administrateur.
            </p>
          </CardFooter>
        )}
      </Card>
    </section>
  );
};
