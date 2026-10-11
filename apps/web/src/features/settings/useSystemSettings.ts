'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  getSystemSettingDefinition,
  type SystemSettingKey,
} from '$constants/system-setting-catalog.constants';
import { useUnsavedNavigationGuard } from '$hooks/useUnsavedNavigationGuard';
import { ErrorCode } from '$types/api.types';
import type { SystemSettingItem } from '$types/platform.types';
import { ApiClientError, apiFetchJson, jsonRequest } from '$utils/api.utils';

import {
  getDraftNumber,
  getValidationMessage,
  isSettingDraftChanged,
  type NormalizedSystemSettingItem,
  normalizeSetting,
  normalizeSettings,
  SYSTEM_SETTING_KEYS,
} from './system-settings-page.helpers';

// This local controller owns requests, versions and drafts for this one page.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useSystemSettings = (canUpdate: boolean) => {
  const mountedRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const beginRequest = useCallback((): AbortController | null => {
    if (!mountedRef.current || requestRef.current) return null;
    const controller = new AbortController();
    requestRef.current = controller;

    return controller;
  }, []);
  const finishRequest = useCallback((controller: AbortController): void => {
    if (requestRef.current === controller) requestRef.current = null;
  }, []);
  const isCurrentRequest = useCallback(
    (controller: AbortController): boolean =>
      mountedRef.current && requestRef.current === controller,
    [],
  );
  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, []);
  const [settings, setSettings] = useState<Map<
    SystemSettingKey,
    NormalizedSystemSettingItem
  > | null>(null);
  const [drafts, setDrafts] = useState<Map<SystemSettingKey, string>>(
    () => new Map(),
  );
  const [editingKeys, setEditingKeys] = useState<Set<SystemSettingKey>>(
    () => new Set(),
  );
  const [saveErrors, setSaveErrors] = useState<Map<SystemSettingKey, string>>(
    () => new Map(),
  );
  const [conflicts, setConflicts] = useState<
    Map<
      SystemSettingKey,
      { reason: 'concurrent' | 'unknown'; status: 'ready' | 'unavailable' }
    >
  >(() => new Map());
  const [accessDenied, setAccessDenied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<SystemSettingKey | null>(null);
  const [checkingKey, setCheckingKey] = useState<SystemSettingKey | null>(null);
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
          ? isSettingDraftChanged(drafts.get(key) ?? '', setting.value) ||
              (editingKeys.has(key) && setting.isStoredValueInvalid)
          : false;
      }),
    [drafts, editingKeys, settings],
  );
  const {
    cancelPendingNavigation,
    confirmPendingNavigation,
    pendingNavigationHref,
    restoreFocus,
  } = useUnsavedNavigationGuard(hasUnsavedChanges);

  const handleAccessRefusal = useCallback((error: unknown): boolean => {
    if (
      !(error instanceof ApiClientError) ||
      (error.status !== 401 && error.status !== 403)
    )
      return false;
    setAccessDenied(true);
    setSettings(null);
    setDrafts(new Map());
    setEditingKeys(new Set());
    setConflicts(new Map());
    setSaveErrors(new Map());
    setPendingReduction(null);
    setPendingPasswordAction(null);
    setShowRefreshConfirmation(false);

    return true;
  }, []);

  const focusAfterRetry = useCallback((trigger: Element | null): void => {
    requestAnimationFrame(() => {
      if (
        !mountedRef.current ||
        (document.activeElement !== document.body &&
          document.activeElement !== trigger)
      )
        return;
      const target = contentRef.current?.querySelector<HTMLElement>(
        'h2, [data-settings-retry]',
      );
      if (target) {
        if (target.matches('h2')) target.tabIndex = -1;
        target.focus();
      }
    });
  }, []);

  const loadSettings = useCallback(async (): Promise<boolean> => {
    const controller = beginRequest();
    if (!controller) return false;
    const { signal } = controller;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    setIsLoading(true);
    setLoadError(null);
    try {
      const items = await apiFetchJson<SystemSettingItem[]>(
        '/api/systeme/parametres',
        { cache: 'no-store', signal },
      );
      if (!isCurrentRequest(controller)) return false;
      if (signal.aborted)
        throw new Error('Le délai de chargement est dépassé. Réessayez.');
      const normalizedSettings = normalizeSettings(items);
      setSettings(normalizedSettings);
      setSaveErrors(new Map());
      setConflicts(new Map());
      setEditingKeys(new Set());
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
      if (!isCurrentRequest(controller)) return false;
      if (handleAccessRefusal(error)) return false;
      setLoadError(
        signal.aborted
          ? 'Le délai de chargement est dépassé. Réessayez.'
          : error instanceof Error
            ? error.message
            : 'Impossible de charger les paramètres système',
      );

      return false;
    } finally {
      clearTimeout(timeout);
      if (isCurrentRequest(controller)) setIsLoading(false);
      finishRequest(controller);
    }
  }, [beginRequest, finishRequest, handleAccessRefusal, isCurrentRequest]);

  const requestRefresh = useCallback((): void => {
    if ((!settings && !loadError) || isLoading || savingKey || checkingKey)
      return;
    if (hasUnsavedChanges) {
      setShowRefreshConfirmation(true);

      return;
    }
    const trigger = document.activeElement;
    void loadSettings().then(() => focusAfterRetry(trigger));
  }, [
    hasUnsavedChanges,
    checkingKey,
    focusAfterRetry,
    isLoading,
    loadError,
    loadSettings,
    savingKey,
    settings,
  ]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

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

  const readConflict = useCallback(
    async (
      key: SystemSettingKey,
      controller: AbortController,
      reason: 'concurrent' | 'unknown',
    ): Promise<void> => {
      const { signal } = controller;
      const timeout = setTimeout(() => controller.abort(), 15_000);
      setCheckingKey(key);
      setConflicts((current) =>
        new Map(current).set(key, { reason, status: 'unavailable' }),
      );
      try {
        const items = await apiFetchJson<SystemSettingItem[]>(
          '/api/systeme/parametres',
          { cache: 'no-store', signal },
        );
        if (!isCurrentRequest(controller)) return;
        if (signal.aborted) throw new Error('Verification timed out');
        const latest = normalizeSettings(items).get(key);
        if (!latest) throw new Error('Catalogue de paramètres incomplet');
        setSettings((current) =>
          current ? new Map(current).set(key, latest) : current,
        );
        setConflicts((current) =>
          new Map(current).set(key, { reason, status: 'ready' }),
        );
        // Keep every draft and every unrelated setting version untouched.
      } catch (error) {
        if (!isCurrentRequest(controller)) return;
        handleAccessRefusal(error);
        // The unresolved conflict stays visible and blocks saving until a fresh value is available.
      } finally {
        clearTimeout(timeout);
        if (isCurrentRequest(controller)) setCheckingKey(null);
      }
    },
    [handleAccessRefusal, isCurrentRequest],
  );

  const reloadConflict = useCallback(
    async (key: SystemSettingKey): Promise<void> => {
      const controller = beginRequest();
      if (!controller) return;
      setIsLoading(true);
      try {
        await readConflict(
          key,
          controller,
          conflicts.get(key)?.reason ?? 'concurrent',
        );
      } finally {
        if (isCurrentRequest(controller)) setIsLoading(false);
        finishRequest(controller);
      }
    },
    [beginRequest, conflicts, finishRequest, isCurrentRequest, readConflict],
  );

  const updateSetting = useCallback(
    async (key: SystemSettingKey, value: number): Promise<void> => {
      const currentSetting = settings?.get(key);
      if (
        !canUpdate ||
        !currentSetting ||
        conflicts.has(key) ||
        getValidationMessage(key, String(value))
      )
        return;
      const controller = beginRequest();
      if (!controller) return;
      const { signal } = controller;
      const timeout = setTimeout(() => controller.abort(), 30_000);

      setSavingKey(key);
      setSaveErrors((current) => {
        const next = new Map(current);
        next.delete(key);

        return next;
      });
      try {
        const payload = await apiFetchJson<SystemSettingItem>(
          `/api/systeme/parametres/${encodeURIComponent(key)}`,
          jsonRequest(
            'PUT',
            {
              expectedVersion: currentSetting.version,
              value,
            },
            { signal },
          ),
        );
        if (!isCurrentRequest(controller)) return;
        if (signal.aborted) throw new Error('Save response timed out');
        const updatedSetting = normalizeSetting(payload, key);
        if (
          updatedSetting.isStoredValueInvalid ||
          updatedSetting.value !== value ||
          updatedSetting.version <= currentSetting.version
        )
          throw new Error('Unconfirmed setting update');
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
        setEditingKeys((current) => {
          const next = new Set(current);
          next.delete(key);

          return next;
        });
        toast.success(
          `Paramètre « ${getSystemSettingDefinition(key).label} » mis à jour avec succès`,
        );
      } catch (error) {
        if (!isCurrentRequest(controller)) return;
        clearTimeout(timeout);
        if (
          error instanceof ApiClientError &&
          error.code === ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED
        ) {
          setPendingPasswordAction({ key, value });

          return;
        }
        if (handleAccessRefusal(error)) return;
        if (error instanceof ApiClientError && error.status === 409) {
          await readConflict(key, controller, 'concurrent');

          return;
        }
        const uncertain =
          !(error instanceof ApiClientError) ||
          error.status >= 500 ||
          error.code === 'INVALID_RESPONSE';
        if (uncertain)
          setConflicts((current) =>
            new Map(current).set(key, {
              reason: 'unknown',
              status: 'unavailable',
            }),
          );
        setSaveErrors((current) =>
          new Map(current).set(
            key,
            uncertain
              ? 'La réponse n’a pas pu être confirmée. La valeur a peut-être été enregistrée : vérifiez-la avant une nouvelle tentative.'
              : error.message,
          ),
        );
      } finally {
        clearTimeout(timeout);
        if (isCurrentRequest(controller)) setSavingKey(null);
        finishRequest(controller);
      }
    },
    [
      beginRequest,
      canUpdate,
      conflicts,
      finishRequest,
      handleAccessRefusal,
      isCurrentRequest,
      readConflict,
      settings,
    ],
  );

  const handleSaveRequest = (key: SystemSettingKey): void => {
    if (
      !canUpdate ||
      !editingKeys.has(key) ||
      !settings ||
      isLoading ||
      savingKey ||
      checkingKey ||
      conflicts.has(key)
    )
      return;
    const setting = settings.get(key);
    if (!setting) return;
    const draftValue = drafts.get(key) ?? '';
    if (getValidationMessage(key, draftValue)) return;
    const value = getDraftNumber(draftValue);
    if (
      value === null ||
      (!setting.isStoredValueInvalid && value === setting.value)
    )
      return;

    if (
      getSystemSettingDefinition(key).passwordWhenDecreasing &&
      (setting.isStoredValueInvalid || value < setting.value)
    ) {
      setPendingReduction({ key, value });

      return;
    }

    void updateSetting(key, value);
  };

  return {
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
  };
};
