'use client';

import {
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldAlert,
} from 'lucide-react';
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
import { PageHero } from '$components/layout/PageHero';
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
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '$ui/card';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';
import { Skeleton } from '$ui/skeleton';
import { apiFetch, apiFetchJson, jsonRequest } from '$utils/api.utils';

import {
  formatSettingValue,
  formatUpdatedAt,
  getDraftNumber,
  getSettingPresentation,
  getValidationMessage,
  type NormalizedSystemSettingItem,
  normalizeSetting,
  normalizeSettings,
  SECTION_DEFINITIONS,
  SYSTEM_SETTING_KEYS,
} from './system-settings-page.helpers';

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
    <Skeleton className="h-24 rounded-xl" />
    <div className="grid gap-4 lg:grid-cols-2">
      {[...Array(4)].map((_, index) => (
        <Skeleton className="h-72 rounded-xl" key={index} />
      ))}
    </div>
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
      SYSTEM_SETTING_KEYS.some(
        (key) => drafts.get(key) !== String(settings.get(key)?.value),
      ),
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

  const updateSetting = useCallback(
    async (key: SystemSettingKey, value: number): Promise<void> => {
      const currentSetting = settings?.get(key);
      if (!currentSetting || savingKey) return;

      setSavingKey(key);
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
            const reloaded = await loadSettings();
            if (reloaded) {
              toast.warning(
                'Ce paramètre a été modifié par un autre administrateur. Les valeurs ont été rechargées.',
              );
            } else {
              toast.error(
                "Ce paramètre a été modifié, mais l'actualisation a échoué. Réessayez avant toute nouvelle modification.",
              );
            }

            return;
          }

          toast.error(
            payload.success
              ? 'Impossible de modifier ce paramètre'
              : payload.error.message,
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
        toast.error('Impossible de modifier ce paramètre');
      } finally {
        setSavingKey(null);
      }
    },
    [loadSettings, savingKey, settings],
  );

  const handleSaveRequest = (key: SystemSettingKey): void => {
    if (!settings || isLoading || savingKey) return;
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
            <PageHero
              actions={
                <Button
                  disabled={
                    (!settings && !loadError) || isLoading || savingKey !== null
                  }
                  onClick={requestRefresh}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RefreshCw
                    className={isLoading ? 'size-4 animate-spin' : 'size-4'}
                  />
                  Actualiser
                </Button>
              }
              description={item.description}
              icon={<Settings className="size-5" />}
              meta={
                <Badge variant={canUpdate ? 'secondary' : 'outline'}>
                  {canUpdate ? 'Administration' : 'Lecture seule'}
                </Badge>
              }
              title={item.label}
              tone="system"
            />

            <ContentState
              description="Les réglages s'appliquent à tout le site. Réduire une durée de conservation peut entraîner une suppression irréversible au prochain nettoyage du worker."
              icon={<ShieldAlert className="size-4" />}
              kind="warning"
              role="status"
              title="Configuration globale"
            />

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
                    className="space-y-3"
                    key={section.id}
                  >
                    <div>
                      <h2
                        className="text-base font-semibold"
                        id={`settings-${section.id}-title`}
                      >
                        {section.title}
                      </h2>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {section.description}
                      </p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {section.keys.map((key) => {
                        const definition = getSystemSettingDefinition(key);
                        const presentation = getSettingPresentation(key);
                        const setting = settings.get(key);
                        if (!setting) return null;
                        const Icon = presentation.icon;
                        const draftValue =
                          drafts.get(key) ?? String(setting.value);
                        const parsedDraft = getDraftNumber(draftValue);
                        const validationMessage = getValidationMessage(
                          key,
                          draftValue,
                        );
                        const dirty = draftValue !== String(setting.value);
                        const changed =
                          parsedDraft !== null && parsedDraft !== setting.value;
                        const isSaving = savingKey === key;
                        const actionsDisabled = isLoading || savingKey !== null;
                        const fieldId = `system-setting-${key.replaceAll('.', '-')}`;
                        const titleId = `${fieldId}-title`;
                        const helpId = `${fieldId}-help`;
                        const unitId = `${fieldId}-unit`;
                        const errorId = `${fieldId}-error`;
                        const isRecommended =
                          setting.value === definition.defaultValue;

                        return (
                          <Card
                            aria-labelledby={titleId}
                            className="h-full"
                            key={key}
                            role="group"
                          >
                            <CardHeader>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                  <ServiceIcon className="bg-primary/10 text-primary-emphasis size-9">
                                    <Icon className="size-4" />
                                  </ServiceIcon>
                                  <div className="min-w-0">
                                    <h3
                                      className="text-base leading-6 font-semibold"
                                      id={titleId}
                                    >
                                      {definition.label}
                                    </h3>
                                    <p className="text-muted-foreground mt-1 text-sm leading-5">
                                      {definition.description}
                                    </p>
                                  </div>
                                </div>
                                <Badge
                                  className="shrink-0"
                                  variant={
                                    isRecommended ? 'outline' : 'secondary'
                                  }
                                >
                                  {isRecommended
                                    ? 'Recommandé'
                                    : 'Personnalisé'}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
                              {canUpdate ? (
                                <div className="space-y-2">
                                  <Label htmlFor={fieldId} required>
                                    Valeur globale
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      aria-describedby={`${unitId} ${helpId}${validationMessage ? ` ${errorId}` : ''}`}
                                      aria-invalid={
                                        validationMessage ? true : undefined
                                      }
                                      aria-label={`Valeur globale — ${definition.label}`}
                                      disabled={actionsDisabled}
                                      id={fieldId}
                                      inputMode="numeric"
                                      max={definition.max}
                                      min={definition.min}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        setDrafts((currentDrafts) => {
                                          const nextDrafts = new Map(
                                            currentDrafts,
                                          );
                                          nextDrafts.set(key, value);

                                          return nextDrafts;
                                        });
                                      }}
                                      required
                                      step={1}
                                      type="number"
                                      value={draftValue}
                                    />
                                    <span
                                      className="text-muted-foreground min-w-14 text-sm"
                                      id={unitId}
                                    >
                                      {definition.unit === 'days'
                                        ? 'jours'
                                        : 'lignes'}
                                    </span>
                                  </div>
                                  <p
                                    className="text-muted-foreground text-xs leading-5"
                                    id={helpId}
                                  >
                                    Entre {definition.min} et {definition.max}.
                                    Valeur recommandée :{' '}
                                    {definition.defaultValue}.
                                  </p>
                                  {validationMessage && (
                                    <p
                                      className="text-destructive text-xs"
                                      id={errorId}
                                      role="alert"
                                    >
                                      {validationMessage}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                    Valeur active
                                  </p>
                                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                                    {formatSettingValue(
                                      setting.value,
                                      definition.unit,
                                    )}
                                  </p>
                                </div>
                              )}

                              {changed &&
                                definition.passwordWhenDecreasing &&
                                parsedDraft !== null &&
                                parsedDraft < setting.value && (
                                  <ContentState
                                    description="Les données dépassant la nouvelle durée pourront être supprimées au prochain nettoyage."
                                    kind="warning"
                                    title="Réduction sensible"
                                  />
                                )}

                              <p className="text-muted-foreground text-sm leading-6">
                                {presentation.impact}
                              </p>
                              <p className="text-muted-foreground mt-auto text-xs">
                                {setting.version === 0
                                  ? 'Valeur recommandée active · jamais modifié'
                                  : `Dernière modification : ${formatUpdatedAt(setting.updatedAt)}`}
                              </p>
                            </CardContent>
                            {canUpdate && (
                              <CardFooter className="flex flex-wrap justify-end gap-2">
                                <Button
                                  aria-label={`Annuler les modifications — ${definition.label}`}
                                  disabled={actionsDisabled || !dirty}
                                  onClick={() =>
                                    setDrafts((currentDrafts) => {
                                      const nextDrafts = new Map(currentDrafts);
                                      nextDrafts.set(
                                        key,
                                        String(setting.value),
                                      );

                                      return nextDrafts;
                                    })
                                  }
                                  size="sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  Annuler
                                </Button>
                                <Button
                                  aria-label={`Rétablir la valeur recommandée — ${definition.label}`}
                                  disabled={
                                    actionsDisabled ||
                                    Number(draftValue) ===
                                      definition.defaultValue
                                  }
                                  onClick={() =>
                                    setDrafts((currentDrafts) => {
                                      const nextDrafts = new Map(currentDrafts);
                                      nextDrafts.set(
                                        key,
                                        String(definition.defaultValue),
                                      );

                                      return nextDrafts;
                                    })
                                  }
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  <RotateCcw className="size-4" />
                                  Valeur recommandée
                                </Button>
                                <Button
                                  aria-label={`Enregistrer — ${definition.label}`}
                                  disabled={
                                    actionsDisabled ||
                                    !changed ||
                                    validationMessage !== null
                                  }
                                  onClick={() => handleSaveRequest(key)}
                                  size="sm"
                                  type="button"
                                >
                                  {isSaving ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Save className="size-4" />
                                  )}
                                  Enregistrer
                                </Button>
                              </CardFooter>
                            )}
                          </Card>
                        );
                      })}
                    </div>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Réduire la durée de conservation ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingReduction &&
              pendingReductionDefinition &&
              pendingReductionSetting
                ? `${pendingReductionDefinition.label} passera de ${formatSettingValue(
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
        <AlertDialogContent>
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
        <AlertDialogContent>
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
