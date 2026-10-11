'use client';

import { RefreshCw, Settings } from 'lucide-react';
import React, { type FC, useEffect, useMemo } from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { PageIdentityHero } from '$components/layout/PageIdentityHero';
import { AccessDeniedState } from '$components/layout/PageState';
import { AdminStepUpDialog } from '$components/users/user-detail/AdminStepUpDialog';
import {
  canShowNavigationItem,
  type NavigationSpace,
  type NavItem,
} from '$constants/app.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { getSystemSettingDefinition } from '$constants/system-setting-catalog.constants';
import { useUser } from '$context/UserContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '$ui/alert-dialog';
import { Button } from '$ui/button';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';

import {
  formatSettingValue,
  SECTION_DEFINITIONS,
  SYSTEM_SETTING_KEYS,
} from './system-settings-page.helpers';
import { SystemSettingRow } from './SystemSettingRow';
import { useSystemSettings } from './useSystemSettings';

type SystemSettingsPageProps = {
  item: NavItem;
  space: NavigationSpace;
};

const SettingsSkeleton: FC = () => (
  <div
    aria-label="Chargement des paramètres"
    className="space-y-5"
    role="status"
  >
    {SECTION_DEFINITIONS.map((section) => (
      <div
        className="border-border-content overflow-hidden rounded-[10px] border"
        key={section.id}
      >
        <Skeleton className="h-20 rounded-none" />
        {SYSTEM_SETTING_KEYS.filter(
          (key) => getSystemSettingDefinition(key).section === section.id,
        ).map((key) => (
          <Skeleton className="mt-px h-36 rounded-none" key={key} />
        ))}
      </div>
    ))}
  </div>
);

const SystemSettingsContent: FC<{
  actorLoginName: string;
  canUpdate: boolean;
  item: NavItem;
}> = ({ actorLoginName, canUpdate, item }) => {
  const {
    accessDenied,
    cancelPendingNavigation,
    checkingKey,
    clearSettingFeedback,
    confirmPendingNavigation,
    conflicts,
    contentRef,
    drafts,
    editingKeys,
    handleSaveRequest,
    isLoading,
    loadError,
    loadSettings,
    pendingNavigationHref,
    pendingPasswordAction,
    pendingReduction,
    refreshButtonRef,
    reloadConflict,
    requestRef,
    requestRefresh,
    restoreFocus,
    saveErrors,
    savingKey,
    setDrafts,
    setEditingKeys,
    setPendingPasswordAction,
    setPendingReduction,
    setSaveErrors,
    setShowRefreshConfirmation,
    settings,
    showRefreshConfirmation,
    updateSetting,
  } = useSystemSettings(canUpdate);

  useEffect(() => {
    if (accessDenied) contentRef.current?.focus();
  }, [accessDenied, contentRef]);

  const restoreSettingFocus = (event: Event): void => {
    if (
      document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
      )
    ) {
      event.preventDefault();

      return;
    }
    const target = contentRef.current?.querySelector<HTMLElement>(
      'input[type="number"]:not(:disabled), button[data-setting-edit]:not(:disabled)',
    );
    if (target) {
      event.preventDefault();
      target.focus({ preventScroll: true });
    }
  };

  const renderedSections = useMemo(
    () =>
      SECTION_DEFINITIONS.map((section) => ({
        ...section,
        keys: SYSTEM_SETTING_KEYS.filter(
          (key) => getSystemSettingDefinition(key).section === section.id,
        ),
      })),
    [],
  );
  const pendingReductionDefinition = pendingReduction
    ? getSystemSettingDefinition(pendingReduction.key)
    : null;
  const pendingReductionSetting =
    pendingReduction && settings ? settings.get(pendingReduction.key) : null;
  const pendingPasswordDefinition = pendingPasswordAction
    ? getSystemSettingDefinition(pendingPasswordAction.key)
    : null;

  if (accessDenied)
    return (
      <div
        aria-label="Accès aux paramètres refusé"
        ref={contentRef}
        role="region"
        tabIndex={-1}
      >
        <AccessDeniedState description="Votre session ou vos droits ne permettent plus d’accéder aux paramètres système. Rechargez la page après avoir vérifié votre accès." />
      </div>
    );

  return (
    <div ref={contentRef}>
      <PageShell className="py-0">
        <PageCanvas contentClassName="space-y-5">
          <PageIdentityHero
            actions={
              <Button
                aria-busy={isLoading || undefined}
                aria-disabled={isLoading || undefined}
                className="h-11 rounded-[8px] aria-disabled:pointer-events-none aria-disabled:opacity-50 lg:h-10"
                disabled={
                  (!settings && !loadError) ||
                  savingKey !== null ||
                  checkingKey !== null
                }
                ref={refreshButtonRef}
                onClick={requestRefresh}
                type="button"
                variant="outline"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={isLoading ? 'size-4 animate-spin' : 'size-4'}
                />
                Actualiser
              </Button>
            }
            description="Réglages globaux de Noctambule."
            icon={<Settings aria-hidden="true" />}
            title={item.label}
          />

          {!settings && !loadError ? (
            <SettingsSkeleton />
          ) : loadError && !settings ? (
            <ContentState
              action={
                <Button
                  data-settings-retry
                  onClick={requestRefresh}
                  type="button"
                >
                  Réessayer
                </Button>
              }
              description={loadError}
              kind="error"
              layout="panel"
              title="Paramètres indisponibles"
            />
          ) : settings ? (
            <>
              {loadError && (
                <ContentState
                  action={
                    <Button
                      disabled={isLoading || savingKey !== null}
                      onClick={requestRefresh}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Réessayer
                    </Button>
                  }
                  description={`${loadError} Les valeurs déjà affichées n'ont pas été remplacées.`}
                  kind="error"
                  title="Actualisation impossible"
                />
              )}
              {renderedSections.map((section) => (
                <section
                  aria-labelledby={`settings-${section.id}-title`}
                  className="border-border-content bg-surface-panel overflow-hidden rounded-[10px] border"
                  key={section.id}
                >
                  <div className="border-border-divider bg-surface-panel-header border-b px-4 py-4 @min-[40rem]/page:px-5">
                    <h2
                      className="text-foreground text-base font-semibold"
                      id={`settings-${section.id}-title`}
                    >
                      {section.title}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                      {section.description}
                    </p>
                  </div>
                  <div className="divide-border-divider divide-y">
                    {section.keys.map((key) => {
                      const setting = settings.get(key);
                      if (!setting) return null;

                      return (
                        <SystemSettingRow
                          canUpdate={canUpdate}
                          conflict={conflicts.get(key)?.status ?? 'none'}
                          conflictReason={conflicts.get(key)?.reason}
                          disabled={
                            isLoading ||
                            savingKey !== null ||
                            checkingKey !== null
                          }
                          draft={drafts.get(key) ?? String(setting.value)}
                          error={saveErrors.get(key)}
                          isEditing={editingKeys.has(key)}
                          isSaving={savingKey === key && checkingKey !== key}
                          isRefreshing={checkingKey === key}
                          key={key}
                          onCancel={() => {
                            if (requestRef.current) return;
                            setDrafts((current) =>
                              new Map(current).set(key, String(setting.value)),
                            );
                            if (conflicts.get(key)?.status !== 'unavailable')
                              clearSettingFeedback(key);
                            setEditingKeys((current) => {
                              const next = new Set(current);
                              next.delete(key);

                              return next;
                            });
                          }}
                          onChange={(value) => {
                            if (requestRef.current) return;
                            setDrafts((current) =>
                              new Map(current).set(key, value),
                            );
                            setSaveErrors((current) => {
                              const next = new Map(current);
                              next.delete(key);

                              return next;
                            });
                          }}
                          onEdit={() =>
                            setEditingKeys((current) =>
                              new Set(current).add(key),
                            )
                          }
                          onKeepDraft={() => clearSettingFeedback(key)}
                          onReloadConflict={() => void reloadConflict(key)}
                          onReset={() => {
                            setDrafts((current) =>
                              new Map(current).set(key, String(setting.value)),
                            );
                            clearSettingFeedback(key);
                          }}
                          onSave={() => handleSaveRequest(key)}
                          setting={setting}
                        />
                      );
                    })}
                  </div>
                  {section.id === 'retention' && (
                    <p className="text-muted-foreground border-border-divider border-t px-4 py-3 text-xs leading-5 @min-[40rem]/page:px-5">
                      Une augmentation de durée ne restaure pas les données déjà
                      supprimées.
                    </p>
                  )}
                </section>
              ))}
            </>
          ) : null}
        </PageCanvas>
      </PageShell>

      <AlertDialog
        open={pendingReduction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingReduction(null);
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={restoreSettingFocus}
          className="rounded-[10px] [&_button]:min-h-11 lg:[&_button]:min-h-10"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingReductionSetting?.isStoredValueInvalid
                ? 'Réparer la durée de conservation ?'
                : 'Réduire la durée de conservation ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingReduction &&
              pendingReductionDefinition &&
              pendingReductionSetting
                ? pendingReductionSetting.isStoredValueInvalid
                  ? `La valeur enregistrée est invalide. La conservation « ${pendingReductionDefinition.label} » sera fixée à ${formatSettingValue(pendingReduction.value, pendingReductionDefinition.unit)}. Le nettoyage du journal pourra reprendre lors de la prochaine maintenance ; les données plus anciennes pourront alors être supprimées.`
                  : `La conservation « ${pendingReductionDefinition.label} » passera de ${formatSettingValue(
                      pendingReductionSetting.value,
                      pendingReductionDefinition.unit,
                    )} à ${formatSettingValue(
                      pendingReduction.value,
                      pendingReductionDefinition.unit,
                    )}. Les données plus anciennes pourront être supprimées au prochain nettoyage et ne pourront pas être restaurées en augmentant ensuite cette durée.`
                : 'Les données plus anciennes pourront être supprimées au prochain nettoyage.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conserver la durée actuelle</AlertDialogCancel>
            <AlertDialogAction
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              onClick={() => {
                const action = pendingReduction;
                setPendingReduction(null);
                if (action) void updateSetting(action.key, action.value);
              }}
            >
              {pendingReductionSetting?.isStoredValueInvalid
                ? 'Réparer la durée'
                : 'Réduire la durée'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showRefreshConfirmation}
        onOpenChange={setShowRefreshConfirmation}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            refreshButtonRef.current?.focus();
          }}
          className="rounded-[10px] [&_button]:min-h-11 lg:[&_button]:min-h-10"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonner les modifications ?</AlertDialogTitle>
            <AlertDialogDescription>
              L’actualisation remplacera les valeurs que vous avez modifiées
              sans les enregistrer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer la modification</AlertDialogCancel>
            <AlertDialogAction
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              onClick={() => {
                setShowRefreshConfirmation(false);
                void loadSettings();
              }}
            >
              Abandonner et actualiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingNavigationHref !== null}
        onOpenChange={(open) => {
          if (!open) cancelPendingNavigation();
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={restoreFocus}
          className="rounded-[10px] [&_button]:min-h-11 lg:[&_button]:min-h-10"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter sans enregistrer ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les modifications des paramètres seront perdues. Vous pouvez
              rester sur la page pour les enregistrer ou les annuler. Une
              opération déjà envoyée peut avoir été appliquée ; quitter la page
              ne l’annule pas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelPendingNavigation}>
              Rester
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmPendingNavigation}
            >
              Quitter sans enregistrer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminStepUpDialog
        actorLoginName={actorLoginName}
        description={
          pendingPasswordDefinition
            ? `Confirmez votre mot de passe pour ${pendingPasswordAction && settings?.get(pendingPasswordAction.key)?.isStoredValueInvalid ? 'réparer' : 'réduire'} la conservation de « ${pendingPasswordDefinition.label} ». La confirmation restera valable pendant trente minutes.`
            : 'Confirmez votre mot de passe pour continuer.'
        }
        onCloseAutoFocus={restoreSettingFocus}
        onCancel={() => setPendingPasswordAction(null)}
        onComplete={async () => {
          const action = pendingPasswordAction;
          setPendingPasswordAction(null);
          if (action) await updateSetting(action.key, action.value);
        }}
        open={pendingPasswordAction !== null}
        proofKind="password"
        title={
          pendingPasswordAction &&
          settings?.get(pendingPasswordAction.key)?.isStoredValueInvalid
            ? 'Confirmer cette réparation'
            : 'Confirmer cette réduction'
        }
      />
    </div>
  );
};

export const SystemSettingsPage: FC<SystemSettingsPageProps> = ({
  item,
  space,
}) => {
  const { userData } = useUser();
  const canView = canShowNavigationItem(userData, item);
  const canUpdate =
    !!userData &&
    (userData.isProtected ||
      hasPermission(
        userData.role,
        PERMISSIONS.SETTINGS.UPDATE,
        userData.permissions,
      ));

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { href: space.href, label: space.label },
        { href: item.href, label: item.label },
      ]}
    >
      {canView && userData ? (
        <SystemSettingsContent
          actorLoginName={userData.loginName}
          canUpdate={canUpdate}
          item={item}
          key={
            userData.id + ':' + canUpdate + ':' + userData.mustChangePassword
          }
        />
      ) : (
        <AccessDeniedState
          actionHref={space.href}
          actionLabel="Retour au pôle Système"
          description="Cette page est réservée aux administrateurs autorisés."
        />
      )}
    </AuthenticatedLayout>
  );
};
