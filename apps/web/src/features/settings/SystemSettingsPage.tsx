'use client';

import { RefreshCw } from 'lucide-react';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { ContentState } from '$components/layout/ContentState';
import { AccessDeniedState } from '$components/layout/PageState';
import { AdminStepUpDialog } from '$components/users/user-detail/AdminStepUpDialog';
import {
  canShowNavigationItem,
  type NavigationSpace,
  type NavItem,
} from '$constants/app.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import {
  getSystemSettingDefinition,
  type SystemSettingKey,
} from '$constants/system-setting-catalog.constants';
import { useUser } from '$context/UserContext';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import { type ApiResponse, ErrorCode } from '$types/api.types';
import type { SystemSettingItem } from '$types/platform.types';
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
import { apiFetch, apiFetchJson, jsonRequest } from '$utils/api.utils';

import {
  formatSettingValue,
  getDraftNumber,
  getValidationMessage,
  isSettingDraftChanged,
  type NormalizedSystemSettingItem,
  normalizeSetting,
  normalizeSettings,
  SECTION_DEFINITIONS,
  SYSTEM_SETTING_KEYS,
} from './system-settings-page.helpers';
import { SystemSettingRow } from './SystemSettingRow';

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
        className="border-border-default overflow-hidden rounded-[8px] border"
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
  const [settings, setSettings] = useState<Map<
    SystemSettingKey,
    NormalizedSystemSettingItem
  > | null>(null);
  const [drafts, setDrafts] = useState<Map<SystemSettingKey, string>>(
    () => new Map(),
  );
  const [saveErrors, setSaveErrors] = useState<Map<SystemSettingKey, string>>(
    () => new Map(),
  );
  const [conflicts, setConflicts] = useState<
    Map<SystemSettingKey, 'ready' | 'unavailable'>
  >(() => new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<SystemSettingKey | null>(null);
  const [pendingReduction, setPendingReduction] = useState<{
    key: SystemSettingKey;
    value: number;
  } | null>(null);
  const [pendingPasswordAction, setPendingPasswordAction] = useState<{
    key: SystemSettingKey;
    value: number;
  } | null>(null);
  const [showRefreshConfirmation, setShowRefreshConfirmation] = useState(false);
  const hasUnsavedChanges = useMemo(
    () =>
      !!settings &&
      SYSTEM_SETTING_KEYS.some((key) => {
        const setting = settings.get(key);

        return setting
          ? isSettingDraftChanged(drafts.get(key) ?? '', setting.value)
          : false;
      }),
    [drafts, settings],
  );
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
  } = useUnsavedNavigationGuard(hasUnsavedChanges);

  const loadSettings = useCallback(
    async (signal?: AbortSignal): Promise<boolean> => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const items = await apiFetchJson<SystemSettingItem[]>(
          '/api/systeme/parametres',
          { signal },
        );
        const normalizedSettings = normalizeSettings(items);
        setSettings(normalizedSettings);
        setSaveErrors(new Map());
        setConflicts(new Map());
        setDrafts(
          new Map(
            SYSTEM_SETTING_KEYS.map((key) => {
              const setting = normalizedSettings.get(key);
              if (!setting) {
                throw new Error('Catalogue de paramètres incomplet');
              }

              return [key, String(setting.value)] as const;
            }),
          ),
        );

        return true;
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return false;
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les paramètres système',
        );

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const requestRefresh = useCallback((): void => {
    if ((!settings && !loadError) || isLoading || savingKey) return;
    if (hasUnsavedChanges) {
      setShowRefreshConfirmation(true);

      return;
    }
    void loadSettings();
  }, [
    hasUnsavedChanges,
    isLoading,
    loadError,
    loadSettings,
    savingKey,
    settings,
  ]);

  useEffect(() => {
    if (!canView) return;
    const controller = new AbortController();
    void loadSettings(controller.signal);

    return (): void => controller.abort();
  }, [canView, loadSettings]);

  const clearSettingFeedback = (key: SystemSettingKey): void => {
    setSaveErrors((current) => {
      const next = new Map(current);
      next.delete(key);

      return next;
    });
    setConflicts((current) => {
      const next = new Map(current);
      next.delete(key);

      return next;
    });
  };

  const reloadConflict = useCallback(
    async (key: SystemSettingKey): Promise<void> => {
      setIsLoading(true);
      setConflicts((current) => new Map(current).set(key, 'unavailable'));
      try {
        const items = await apiFetchJson<SystemSettingItem[]>(
          '/api/systeme/parametres',
        );
        const latest = normalizeSetting(
          items.find((item) => item.key === key),
          key,
        );
        setSettings((current) =>
          current ? new Map(current).set(key, latest) : current,
        );
        setConflicts((current) => new Map(current).set(key, 'ready'));
        // Keep every draft and every unrelated setting version untouched.
      } catch {
        // The unresolved conflict stays visible and blocks saving until a fresh value is available.
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const updateSetting = useCallback(
    async (key: SystemSettingKey, value: number): Promise<void> => {
      const currentSetting = settings?.get(key);
      if (!currentSetting || savingKey) return;

      setSavingKey(key);
      setSaveErrors((current) => {
        const next = new Map(current);
        next.delete(key);

        return next;
      });
      try {
        const response = await apiFetch(
          `/api/systeme/parametres/${encodeURIComponent(key)}`,
          jsonRequest('PUT', {
            expectedVersion: currentSetting.version,
            value,
          }),
        );
        const payload =
          (await response.json()) as ApiResponse<SystemSettingItem>;

        if (!response.ok || !payload.success) {
          const errorCode = payload.success ? null : payload.error.code;
          if (errorCode === ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED) {
            setPendingPasswordAction({ key, value });

            return;
          }
          if (errorCode === ErrorCode.CONFLICT) {
            await reloadConflict(key);

            return;
          }
          setSaveErrors((current) =>
            new Map(current).set(
              key,
              payload.success
                ? 'Impossible de modifier ce paramètre. Réessayez.'
                : payload.error.message,
            ),
          );

          return;
        }

        const updatedSetting = normalizeSetting(payload.data, key);
        setSettings((currentSettings) => {
          if (!currentSettings) return currentSettings;
          const nextSettings = new Map(currentSettings);
          nextSettings.set(key, updatedSetting);

          return nextSettings;
        });
        setDrafts((currentDrafts) => {
          const nextDrafts = new Map(currentDrafts);
          nextDrafts.set(key, String(updatedSetting.value));

          return nextDrafts;
        });
        toast.success(
          `Paramètre « ${getSystemSettingDefinition(key).label} » mis à jour avec succès`,
        );
      } catch {
        setSaveErrors((current) =>
          new Map(current).set(
            key,
            'Enregistrement impossible. Votre saisie est conservée ; réessayez.',
          ),
        );
      } finally {
        setSavingKey(null);
      }
    },
    [reloadConflict, savingKey, settings],
  );

  const handleSaveRequest = (key: SystemSettingKey): void => {
    if (!canUpdate || !settings || isLoading || savingKey || conflicts.has(key))
      return;
    const setting = settings.get(key);
    if (!setting) return;
    const draftValue = drafts.get(key) ?? '';
    if (getValidationMessage(key, draftValue)) return;
    const value = getDraftNumber(draftValue);
    if (value === null || value === setting.value) return;

    if (
      getSystemSettingDefinition(key).passwordWhenDecreasing &&
      value < setting.value
    ) {
      setPendingReduction({ key, value });

      return;
    }

    void updateSetting(key, value);
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

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { href: space.href, label: space.label },
        { href: item.href, label: item.label },
      ]}
    >
      {!canView ? (
        <AccessDeniedState
          actionHref={space.href}
          actionLabel="Retour au pôle Système"
          description="Cette page est réservée aux administrateurs autorisés."
        />
      ) : (
        <PageShell className="py-0">
          <PageCanvas contentClassName="space-y-5">
            <header
              className="flex flex-wrap items-start justify-between gap-4"
              data-slot="page-heading"
            >
              <div className="min-w-0">
                <h1 className="text-foreground text-[1.625rem] leading-tight font-semibold tracking-tight sm:text-[2rem]">
                  {item.label}
                </h1>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  Réglages globaux de Noctambule.
                </p>
              </div>
              <Button
                className="h-11 rounded-[8px] lg:h-10"
                disabled={
                  (!settings && !loadError) || isLoading || savingKey !== null
                }
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
            </header>

            {!settings && !loadError ? (
              <SettingsSkeleton />
            ) : loadError && !settings ? (
              <ContentState
                action={
                  <Button onClick={() => void loadSettings()} type="button">
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
                    className="border-border-default bg-surface-panel-raised overflow-hidden rounded-[8px] border"
                    key={section.id}
                  >
                    <div className="border-border-divider border-b px-4 py-4 @min-[40rem]/page:px-5">
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
                            conflict={conflicts.get(key) ?? 'none'}
                            disabled={isLoading || savingKey !== null}
                            draft={drafts.get(key) ?? String(setting.value)}
                            error={saveErrors.get(key)}
                            isSaving={savingKey === key}
                            key={key}
                            onChange={(value) => {
                              setDrafts((current) =>
                                new Map(current).set(key, value),
                              );
                              setSaveErrors((current) => {
                                const next = new Map(current);
                                next.delete(key);

                                return next;
                              });
                            }}
                            onKeepDraft={() => clearSettingFeedback(key)}
                            onReloadConflict={() => void reloadConflict(key)}
                            onReset={() => {
                              setDrafts((current) =>
                                new Map(current).set(
                                  key,
                                  String(setting.value),
                                ),
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
                        Une augmentation de durée ne restaure pas les données
                        déjà supprimées.
                      </p>
                    )}
                  </section>
                ))}
              </>
            ) : null}
          </PageCanvas>
        </PageShell>
      )}

      <AlertDialog
        open={pendingReduction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingReduction(null);
        }}
      >
        <AlertDialogContent className="animate-none! rounded-[8px] shadow-none [&_button]:min-h-11 [&_button]:rounded-[8px] lg:[&_button]:min-h-10">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Réduire la durée de conservation ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingReduction &&
              pendingReductionDefinition &&
              pendingReductionSetting
                ? `La conservation « ${pendingReductionDefinition.label} » passera de ${formatSettingValue(
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
              Réduire la durée
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showRefreshConfirmation}
        onOpenChange={setShowRefreshConfirmation}
      >
        <AlertDialogContent className="animate-none! rounded-[8px] shadow-none [&_button]:min-h-11 [&_button]:rounded-[8px] lg:[&_button]:min-h-10">
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
        <AlertDialogContent className="animate-none! rounded-[8px] shadow-none [&_button]:min-h-11 [&_button]:rounded-[8px] lg:[&_button]:min-h-10">
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter sans enregistrer ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les modifications des paramètres seront perdues. Vous pouvez
              rester sur la page pour les enregistrer ou les annuler.
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
        actorLoginName={userData?.loginName ?? ''}
        description={
          pendingPasswordDefinition
            ? `Confirmez votre mot de passe pour réduire la conservation de « ${pendingPasswordDefinition.label} ». La confirmation restera valable pendant trente minutes.`
            : 'Confirmez votre mot de passe pour continuer.'
        }
        onCancel={() => setPendingPasswordAction(null)}
        onComplete={async () => {
          const action = pendingPasswordAction;
          setPendingPasswordAction(null);
          if (action) await updateSetting(action.key, action.value);
        }}
        open={pendingPasswordAction !== null}
        proofKind="password"
        title="Confirmer cette réduction"
      />
    </AuthenticatedLayout>
  );
};
