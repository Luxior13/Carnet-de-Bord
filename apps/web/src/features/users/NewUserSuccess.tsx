import { CheckCircle2, Copy } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import { userDetailPath } from '$constants/routes.constants';
import { Button } from '$ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '$ui/card';
import { Checkbox } from '$ui/checkbox';
import { Label } from '$ui/label';
import { Separator } from '$ui/separator';
import { ServiceIcon } from '$ui/service-icon';

import { FormSectionTitle } from './CreateUserParts';
import type { CreateUserController } from './useCreateUser';
import { UserAccessBadge } from './user-badges';

export const NewUserSuccess: FC<{
  controller: CreateUserController;
  onCreateAnother: () => void;
  returnHref: string;
}> = ({ controller, onCreateAnother, returnHref }) => {
  const {
    confirmationRef,
    copyMessage,
    copyTemporaryPassword,
    createdUser,
    passwordAcknowledged,
    setPasswordAcknowledged,
    temporaryPassword,
  } = controller;
  if (!createdUser || !temporaryPassword) return null;

  return (
    <Card>
      <CardHeader className="p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <ServiceIcon className="border-success/30 bg-success/10 text-success size-8">
            <CheckCircle2 className="size-4" />
          </ServiceIcon>
          <div className="min-w-0">
            <CardTitle ref={confirmationRef} tabIndex={-1}>
              Compte créé
            </CardTitle>
            <CardDescription className="mt-1 text-xs leading-5">
              Transmettez l&apos;identifiant et le mot de passe temporaire, puis
              complétez la fiche si nécessaire.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-5">
        <section aria-labelledby="created-password-title" className="space-y-2">
          <FormSectionTitle id="created-password-title">
            Mot de passe temporaire
          </FormSectionTitle>
          <div className="border-warning/25 bg-warning/10 rounded-md border p-3">
            <p className="text-muted-foreground mb-3 text-xs">
              À communiquer une seule fois. L&apos;utilisateur devra le changer
              à sa première connexion.
            </p>
            <div className="flex items-center gap-2">
              <code className="border-border bg-surface-inset text-foreground min-w-0 flex-1 overflow-x-auto rounded-md border px-3 py-2 font-mono text-sm">
                {temporaryPassword}
              </code>
              <Button
                aria-label="Copier le mot de passe temporaire"
                onClick={() => void copyTemporaryPassword()}
                size="icon"
                type="button"
                variant="outline"
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
          <p role="status" className="text-muted-foreground text-xs">
            {copyMessage}
          </p>
          <div className="flex min-h-11 items-center gap-3">
            <Checkbox
              id="password-preserved"
              checked={passwordAcknowledged}
              onCheckedChange={(value) =>
                setPasswordAcknowledged(value === true)
              }
            />
            <Label htmlFor="password-preserved" className="text-xs">
              J’ai conservé ce mot de passe pour le transmettre.
            </Label>
          </div>
        </section>
        <Separator />
        <section aria-labelledby="created-access-title" className="space-y-2">
          <FormSectionTitle id="created-access-title">Accès</FormSectionTitle>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground text-xs">Identifiant</span>
              <code className="text-foreground min-w-0 text-right text-xs break-all">
                {createdUser.loginName}
              </code>
            </div>
            {createdUser.contactEmail && (
              <>
                <Separator className="bg-border/60" />
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground text-xs">Contact</span>
                  <span className="text-foreground min-w-0 text-right text-xs break-all">
                    {createdUser.contactEmail}
                  </span>
                </div>
              </>
            )}
            <Separator className="bg-border/60" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs">Rôle</span>
              <UserAccessBadge user={createdUser} />
            </div>
            <Separator className="bg-border/60" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs">
                Mot de passe
              </span>
              <span className="border-warning/40 bg-warning/15 text-warning inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap">
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-current"
                />
                À changer
              </span>
            </div>
          </div>
        </section>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCreateAnother}>
          Créer un autre
        </Button>
        <Button asChild>
          <Link
            href={`${userDetailPath(createdUser.id)}?${new URLSearchParams({ returnTo: returnHref })}`}
          >
            Ouvrir la fiche
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
