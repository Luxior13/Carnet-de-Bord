'use client';

import { LockKeyhole, Mail, User } from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SectionActionBar } from '$components/layout/SectionActionBar';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import {
  createAccountProfileDraft,
  isAccountFormSnapshot,
  isOlderAccountSnapshot,
  mergeAccountProfileDraft,
} from '$features/account/account.utils';
import { AccountPanel } from '$features/account/components/AccountPanel';
import { ContactEmailDialog } from '$features/account/components/ContactEmailDialog';
import type { UserType } from '$types/auth.types';
import { Button } from '$ui/button';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { Separator } from '$ui/separator';
import { ApiClientError, apiFetchJson } from '$utils/api.utils';

type ProfileSectionProps = {
  onDirtyChange: (isDirty: boolean) => void;
  onUpdate: (updatedUser?: UserType) => Promise<void>;
  userData: UserType;
};

const PROFILE_FIELD_MAX_LENGTH = 50;

export const ProfileSection: FC<ProfileSectionProps> = ({
  onDirtyChange,
  onUpdate,
  userData,
}) => {
  const [draft, setDraft] = useState(() => createAccountProfileDraft(userData));
  const { base: baseProfile, firstName, lastName } = draft;
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [latestProfileLabel, setLatestProfileLabel] = useState<string | null>(
    null,
  );
  const savingRef = useRef(false);
  const mountedRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const latestUserRef = useRef(userData);
  latestUserRef.current = userData;
  const formRef = useRef<HTMLFormElement>(null);
  const contactTriggerRef = useRef<HTMLButtonElement>(null);
  const [isContactDirty, setIsContactDirty] = useState(false);
  const [showContactEmailDialog, setShowContactEmailDialog] = useState(false);
  const onDirtyChangeRef = useRef(onDirtyChange);

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
    setDraft((current) => mergeAccountProfileDraft(current, userData));
  }, [userData]);
  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, []);

  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const firstNameError = !trimmedFirstName
    ? 'Le prénom est requis'
    : trimmedFirstName.length > PROFILE_FIELD_MAX_LENGTH
      ? 'Prénom trop long'
      : null;
  const lastNameError =
    trimmedLastName.length > PROFILE_FIELD_MAX_LENGTH ? 'Nom trop long' : null;
  const hasProfileChanges =
    trimmedFirstName !== baseProfile.firstName ||
    trimmedLastName !== (baseProfile.lastName ?? '');
  const isProfileDirty =
    hasProfileChanges || isContactDirty || isSaving || isRefreshing || conflict;
  const canEditProfile =
    userData.isProtected ||
    hasPermission(
      userData.role,
      PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
      userData.permissions,
    );
  const canEditContact =
    userData.isProtected ||
    hasPermission(
      userData.role,
      PERMISSIONS.ACCOUNT.UPDATE_CONTACT,
      userData.permissions,
    );

  useEffect(() => {
    onDirtyChange(isProfileDirty);
  }, [isProfileDirty, onDirtyChange]);

  useEffect(
    (): (() => void) => () => {
      onDirtyChangeRef.current(false);
    },
    [],
  );

  const focusProfile = (): void => {
    requestAnimationFrame(() => {
      if (!mountedRef.current) return;
      const form = formRef.current;
      const field =
        form?.querySelector<HTMLInputElement>(
          'input[aria-invalid="true"]:not(:disabled)',
        ) ?? form?.querySelector<HTMLInputElement>('input:not(:disabled)');
      const heading = form
        ?.closest('section')
        ?.querySelector<HTMLElement>('h2');
      if (field) field.focus();
      else if (heading) {
        heading.tabIndex = -1;
        heading.focus();
      }
    });
  };

  const handleSaveProfile = async (): Promise<void> => {
    if (savingRef.current || !mountedRef.current || conflict) return;
    if (!canEditProfile) {
      toast.error('Modification du profil non autorisée');

      return;
    }

    if (firstNameError || lastNameError) {
      toast.error('Corrigez les champs du profil avant de sauvegarder');

      return;
    }

    if (!hasProfileChanges) {
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      savingRef.current = true;
      setIsSaving(true);
      setSaveError(null);
      if (!baseProfile.updatedAt) {
        setConflict(true);
        setSaveError('Actualisez la version du profil avant de l’enregistrer.');

        return;
      }
      const data = await apiFetchJson<{ user: UserType }>('/api/auth/me', {
        body: JSON.stringify({
          expectedUpdatedAt: new Date(baseProfile.updatedAt).toISOString(),
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
        signal: controller.signal,
      });
      if (!mountedRef.current) return;
      if (
        controller.signal.aborted ||
        !isAccountFormSnapshot(data.user, userData.id)
      )
        throw new Error('Invalid profile response');
      const saved = isOlderAccountSnapshot(data.user, latestUserRef.current)
        ? latestUserRef.current
        : data.user;
      setDraft(createAccountProfileDraft(saved));
      setLatestProfileLabel(null);
      setConflict(false);
      toast.success('Profil mis à jour avec succès');
      void onUpdate(saved).catch(() => {
        if (mountedRef.current)
          toast.error(
            'Profil enregistré. La vue du compte n’a pas pu être actualisée.',
          );
      });
      focusProfile();
    } catch (failure) {
      if (!mountedRef.current) return;
      const uncertain =
        !(failure instanceof ApiClientError) ||
        failure.status >= 500 ||
        failure.code === 'INVALID_RESPONSE';
      setConflict(
        uncertain ||
          (failure instanceof ApiClientError && failure.status === 409),
      );
      setSaveError(
        uncertain
          ? 'La réponse n’a pas pu être confirmée. Actualisez la version avant de réessayer ; votre saisie est conservée.'
          : failure.message,
      );
      if (
        failure instanceof ApiClientError &&
        (failure.status === 401 || failure.status === 403)
      )
        void onUpdate().catch(() => {});
      focusProfile();
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
      savingRef.current = false;
      if (mountedRef.current) setIsSaving(false);
    }
  };

  const reloadProfileVersion = async (): Promise<void> => {
    if (savingRef.current || !mountedRef.current) return;
    savingRef.current = true;
    setIsRefreshing(true);
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const payload = await apiFetchJson<{ user: UserType }>('/api/auth/me', {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!mountedRef.current) return;
      if (
        controller.signal.aborted ||
        !isAccountFormSnapshot(payload.user, userData.id)
      )
        throw new Error('Lecture impossible');
      const latest = isOlderAccountSnapshot(payload.user, latestUserRef.current)
        ? latestUserRef.current
        : payload.user;
      setDraft((current) => mergeAccountProfileDraft(current, latest));
      setLatestProfileLabel(
        `Profil actuellement enregistré : ${[latest.firstName, latest.lastName].filter(Boolean).join(' ')}. Votre saisie est conservée ; vérifiez-la avant d’enregistrer.`,
      );
      setConflict(false);
      setSaveError(null);
      void onUpdate(latest).catch(() => {
        if (mountedRef.current)
          toast.error(
            'Version relue. La vue du compte n’a pas pu être actualisée.',
          );
      });
      focusProfile();
    } catch (failure) {
      if (mountedRef.current) {
        setSaveError(
          'Impossible de relire le profil. Réessayez ; votre saisie est conservée.',
        );
        if (
          failure instanceof ApiClientError &&
          (failure.status === 401 || failure.status === 403)
        )
          void onUpdate().catch(() => {});
      }
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
      savingRef.current = false;
      if (mountedRef.current) setIsRefreshing(false);
    }
  };

  const handleCancel = (): void => {
    if (savingRef.current) return;
    setDraft(
      createAccountProfileDraft(
        isOlderAccountSnapshot(userData, baseProfile) ? baseProfile : userData,
      ),
    );
    setSaveError(null);
    setConflict(false);
    setLatestProfileLabel(null);
    focusProfile();
  };

  return (
    <>
      <AccountPanel
        icon={<User className="size-4" />}
        title="Profil"
        description="Votre identité et votre adresse de contact"
      >
        <form
          ref={formRef}
          id="account-profile-form"
          autoComplete="off"
          aria-busy={isSaving || isRefreshing || undefined}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveProfile();
          }}
        >
          {saveError && (
            <p className="text-destructive mb-3 text-sm" role="alert">
              {saveError}
            </p>
          )}
          {latestProfileLabel && (
            <p className="text-muted-foreground mb-3 text-sm" role="status">
              {latestProfileLabel}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-firstName"
                className="text-muted-foreground text-xs"
                required
              >
                Prénom
              </Label>
              <Input
                id="edit-firstName"
                value={firstName}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    firstName: event.target.value,
                  }))
                }
                disabled={!canEditProfile || isSaving || isRefreshing}
                placeholder="Votre prénom"
                maxLength={PROFILE_FIELD_MAX_LENGTH}
                aria-invalid={!!firstNameError}
                aria-describedby={
                  firstNameError ? 'edit-firstName-error' : undefined
                }
              />
              {firstNameError && (
                <p
                  id="edit-firstName-error"
                  className="text-destructive text-xs"
                  role="alert"
                >
                  {firstNameError}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-lastName"
                className="text-muted-foreground text-xs"
              >
                Nom <span className="font-normal">(facultatif)</span>
              </Label>
              <Input
                id="edit-lastName"
                value={lastName}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    lastName: event.target.value,
                  }))
                }
                disabled={!canEditProfile || isSaving || isRefreshing}
                placeholder="Votre nom"
                maxLength={PROFILE_FIELD_MAX_LENGTH}
                aria-invalid={!!lastNameError}
                aria-describedby={
                  lastNameError ? 'edit-lastName-error' : undefined
                }
              />
              {lastNameError && (
                <p
                  id="edit-lastName-error"
                  className="text-destructive text-xs"
                  role="alert"
                >
                  {lastNameError}
                </p>
              )}
            </div>
          </div>

          {!canEditProfile && (
            <div className="text-muted-foreground border-warning/25 bg-warning/10 mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-xs">
              <LockKeyhole className="text-warning mt-0.5 size-3.5 shrink-0" />
              La modification du prénom et du nom est verrouillée sur ce compte.
            </div>
          )}

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="border-border/60 bg-surface-inset rounded-md border p-3">
              <p className="text-muted-foreground text-xs">Identifiant</p>
              <p className="text-foreground mt-1 font-mono text-sm break-all">
                {userData.loginName}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {userData.isProtected
                  ? 'Identifiant racine permanent, modifiable uniquement par une procédure de récupération hors ligne.'
                  : 'Distinct de votre adresse email. Seul un administrateur habilité peut le modifier.'}
              </p>
            </div>
            <div className="border-border/60 bg-surface-inset rounded-md border p-3">
              <p className="text-muted-foreground text-xs">Email de contact</p>
              <p className="text-foreground mt-1 text-sm break-all">
                {userData.contactEmail ?? 'Non renseigné'}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Facultatif, distinct de l&apos;identifiant et jamais utilisé
                pour vous connecter.
              </p>
              {canEditContact && (
                <Button
                  ref={contactTriggerRef}
                  disabled={isSaving || isRefreshing}
                  className="mt-2"
                  onClick={() => setShowContactEmailDialog(true)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Mail className="size-4" />
                  {userData.contactEmail ? 'Gérer' : 'Ajouter'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </AccountPanel>
      {(hasProfileChanges || conflict) && canEditProfile && (
        <SectionActionBar
          hasChanges={hasProfileChanges}
          saveDisabled={!!firstNameError || !!lastNameError}
          conflict={conflict}
          onResolveConflict={() => void reloadProfileVersion()}
          isSaving={isSaving}
          isResolvingConflict={isRefreshing}
          onCancel={handleCancel}
          saveForm="account-profile-form"
          saveType="submit"
        />
      )}
      {canEditContact && (
        <ContactEmailDialog
          contactEmail={userData.contactEmail}
          expectedUpdatedAt={userData.updatedAt}
          userId={userData.id}
          loginName={userData.loginName}
          onDirtyChange={setIsContactDirty}
          onAccessDenied={() => onUpdate()}
          restoreFocus={(event) => {
            event.preventDefault();
            contactTriggerRef.current?.focus();
          }}
          onCancel={() => setShowContactEmailDialog(false)}
          onSuccess={onUpdate}
          open={showContactEmailDialog}
        />
      )}
    </>
  );
};
