'use client';

import { Copy, Loader2, Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import React, { type FC, type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { ErrorCode } from '$types/api.types';
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
import { Card, CardContent, CardHeader } from '$ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '$ui/dialog';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Switch } from '$ui/switch';
import { ApiClientError } from '$utils/api.utils';
import { PHONE_COUNTRY_OPTIONS } from '$utils/phone-country-options';

import {
  addPartnerChannel,
  deletePartnerChannel,
  getPartner,
  updatePartnerChannel,
} from '../partner.api';
import type { PartnerChannel, PartnerDetail } from '../types/partner.types';

const ORGANIZATION_CHANNEL_LABELS = [
  'Général',
  'Partenariats',
  'Facturation',
  'Presse',
  'Standard',
  'Support',
] as const;

type ChannelType = PartnerChannel['type'];

const getTypeLabel = (type: ChannelType): string =>
  type === 'EMAIL' ? 'Email' : 'Téléphone';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const copyValue = async (label: string, value: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copié`);
  } catch {
    toast.error('Copie impossible');
  }
};

const ChannelRow: FC<{
  canManage: boolean;
  channel: PartnerChannel;
  onEdit: (channel: PartnerChannel) => void;
}> = ({ canManage, channel, onEdit }) => {
  const isEmail = channel.type === 'EMAIL';
  const label = isEmail ? 'Email' : 'Numéro';

  return (
    <li className="border-border-divider flex min-w-0 items-center gap-2 border-b py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <a
          className="hover:text-primary-emphasis block truncate text-sm font-medium hover:underline"
          href={`${isEmail ? 'mailto' : 'tel'}:${channel.value}`}
        >
          {channel.value}
        </a>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          {channel.label}
          {channel.isPrimary && (
            <>
              <span aria-hidden="true"> · </span>
              <span className="text-success">Principal</span>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canManage && (
          <Button
            aria-label={`Modifier ${isEmail ? 'cet email' : 'ce téléphone'}`}
            onClick={() => onEdit(channel)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
        <Button
          aria-label={`Copier ${label.toLowerCase()}`}
          onClick={() => void copyValue(label, channel.value)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Copy className="size-3.5" />
        </Button>
      </div>
    </li>
  );
};

const ChannelCollection: FC<{
  canManage: boolean;
  channels: PartnerChannel[];
  onEdit: (channel: PartnerChannel) => void;
  type: ChannelType;
}> = ({ canManage, channels, onEdit, type }) => {
  const isEmail = type === 'EMAIL';
  const Icon = isEmail ? Mail : Phone;

  return (
    <section aria-labelledby={`partner-${type.toLowerCase()}-heading`}>
      <div className="mb-1.5 flex items-center gap-2">
        <Icon aria-hidden="true" className="text-muted-foreground size-4" />
        <h3
          className="text-sm font-semibold"
          id={`partner-${type.toLowerCase()}-heading`}
        >
          {isEmail ? 'Emails' : 'Téléphones'}
        </h3>
        <Badge variant="secondary">{channels.length}</Badge>
      </div>
      {channels.length > 0 ? (
        <ul>
          {channels.map((channel) => (
            <ChannelRow
              canManage={canManage}
              channel={channel}
              key={channel.id}
              onEdit={onEdit}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground border-border-divider rounded-lg border border-dashed px-3 py-4 text-center text-sm">
          {isEmail ? 'Aucun email général' : 'Aucun téléphone général'}
        </p>
      )}
    </section>
  );
};

const PartnerChannelDialog: FC<{
  channel: PartnerChannel | null;
  defaultType: ChannelType;
  onChange: (partner: PartnerDetail) => void;
  onClose: () => void;
  partner: PartnerDetail;
}> = ({ channel, defaultType, onChange, onClose, partner }) => {
  const [type, setType] = useState<ChannelType>(channel?.type ?? defaultType);
  const [label, setLabel] = useState(channel?.label ?? 'Général');
  const [value, setValue] = useState(channel?.value ?? '');
  const [countryCode, setCountryCode] = useState(channel?.countryCode ?? 'FR');
  const [isPrimary, setIsPrimary] = useState(
    channel?.isPrimary ??
      !partner.channels.some((item) => item.type === defaultType),
  );
  const [baseline, setBaseline] = useState({
    countryCode: channel?.countryCode ?? 'FR',
    isPrimary: channel?.isPrimary ?? false,
    label: channel?.label ?? 'Général',
    value: channel?.value ?? '',
  });
  const [channelVersion, setChannelVersion] = useState(
    channel?.version ?? null,
  );
  const [dirty, setDirty] = useState({
    countryCode: false,
    isPrimary: false,
    label: false,
    value: false,
  });
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const isEditing = Boolean(channel);
  const hasChanges = Object.values(dirty).some(Boolean);

  const selectType = (nextType: ChannelType): void => {
    setType(nextType);
    setValue('');
    setCountryCode('FR');
    setIsPrimary(!partner.channels.some((item) => item.type === nextType));
  };

  const refreshAfterConflict = async (error: ApiClientError): Promise<void> => {
    try {
      const fresh = await getPartner(partner.id);
      onChange(fresh);
      if (!channel) {
        toast.error(error.message);

        return;
      }
      const freshChannel = fresh.channels.find(
        (item) => item.id === channel.id,
      );
      if (!freshChannel) {
        toast.error(
          `${error.message} Cette coordonnée n’existe plus ; la fiche a été actualisée.`,
        );
        onClose();

        return;
      }
      setChannelVersion(freshChannel.version);
      if (!dirty.label) setLabel(freshChannel.label);
      if (!dirty.value) setValue(freshChannel.value);
      if (!dirty.countryCode) {
        setCountryCode(freshChannel.countryCode ?? 'FR');
      }
      if (!dirty.isPrimary) setIsPrimary(freshChannel.isPrimary);
      const nextBaseline = {
        countryCode: freshChannel.countryCode ?? 'FR',
        isPrimary: freshChannel.isPrimary,
        label: freshChannel.label,
        value: freshChannel.value,
      };
      setDirty((current) => ({
        countryCode:
          current.countryCode && countryCode !== nextBaseline.countryCode,
        isPrimary: current.isPrimary && isPrimary !== nextBaseline.isPrimary,
        label: current.label && label.trim() !== nextBaseline.label,
        value: current.value && value.trim() !== nextBaseline.value,
      }));
      setBaseline(nextBaseline);
      setConflictNotice(
        'La fiche a été actualisée. Votre saisie est conservée ; vérifiez-la avant de réessayer.',
      );
      toast.error(`${error.message} La fiche a été actualisée.`);
    } catch {
      setConflictNotice(
        'La fiche n’a pas pu être actualisée. Réessayez dans un instant.',
      );
      toast.error(`${error.message} Actualisation impossible.`);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const normalizedLabel = label.trim();
    const normalizedValue = value.trim();
    if (!normalizedLabel || !normalizedValue) return;

    setSaving(true);
    try {
      const updated =
        channel && channelVersion
          ? await updatePartnerChannel(partner.id, channel.id, {
              channelVersion,
              ...(type === 'PHONE' ? { countryCode } : {}),
              isPrimary,
              label: normalizedLabel,
              value: normalizedValue,
            })
          : await addPartnerChannel(partner.id, {
              ...(type === 'PHONE' ? { countryCode } : {}),
              isPrimary,
              label: normalizedLabel,
              type,
              value: normalizedValue,
            });
      onChange(updated);
      toast.success(`${getTypeLabel(type)} ${channel ? 'modifié' : 'ajouté'}`);
      onClose();
    } catch (error) {
      if (
        channel &&
        error instanceof ApiClientError &&
        error.code === ErrorCode.PARTNER_CHANNEL_VERSION_CONFLICT
      ) {
        await refreshAfterConflict(error);
      } else {
        toast.error(
          getErrorMessage(error, 'La coordonnée n’a pas pu être enregistrée.'),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (): Promise<void> => {
    if (!channel || !channelVersion) return;
    setDeleting(true);
    try {
      const updated = await deletePartnerChannel(
        partner.id,
        channel.id,
        channelVersion,
      );
      onChange(updated);
      toast.success('Coordonnée supprimée');
      onClose();
    } catch (error) {
      setDeleteOpen(false);
      if (
        error instanceof ApiClientError &&
        error.code === ErrorCode.PARTNER_CHANNEL_VERSION_CONFLICT
      ) {
        await refreshAfterConflict(error);
      } else {
        toast.error(
          getErrorMessage(error, 'La coordonnée n’a pas pu être supprimée.'),
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog
        open={!deleteOpen}
        onOpenChange={(open) => {
          if (!open && !saving) onClose();
        }}
      >
        <DialogContent
          className="grid h-[100svh] max-h-[100svh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:h-auto sm:max-h-[85svh] sm:max-w-2xl"
          fullscreenOnMobile
        >
          <DialogHeader className="border-border-divider border-b px-4 py-4 pr-14 text-left sm:px-5">
            <DialogTitle>
              {channel ? 'Modifier la coordonnée' : 'Ajouter une coordonnée'}
            </DialogTitle>
            <DialogDescription>
              Réservez cet espace aux standards, boîtes et numéros génériques de
              l’organisation.
            </DialogDescription>
          </DialogHeader>
          <form className="contents" id="partner-channel-form" onSubmit={save}>
            <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              {conflictNotice && (
                <p
                  className="border-warning/50 bg-warning/10 rounded-lg border p-3 text-sm"
                  role="status"
                >
                  {conflictNotice}
                </p>
              )}
              <div className="grid gap-2">
                {channel ? (
                  <p
                    className="text-sm font-medium"
                    id="partner-channel-type-label"
                  >
                    Type
                  </p>
                ) : (
                  <Label htmlFor="partner-channel-type">Type</Label>
                )}
                {channel ? (
                  <div
                    aria-labelledby="partner-channel-type-label"
                    className="bg-surface-inset rounded-lg border px-3 py-2 text-sm"
                  >
                    {getTypeLabel(type)}
                  </div>
                ) : (
                  <Select
                    disabled={saving}
                    onValueChange={(nextType) =>
                      selectType(nextType as ChannelType)
                    }
                    value={type}
                  >
                    <SelectTrigger className="w-full" id="partner-channel-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="PHONE">Téléphone</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {channel && (
                  <p className="text-muted-foreground text-xs">
                    Le type reste fixe afin de conserver un historique cohérent.
                  </p>
                )}
              </div>
              <div
                className={
                  type === 'PHONE'
                    ? 'grid gap-4 sm:grid-cols-[12rem_1fr]'
                    : 'grid gap-4'
                }
              >
                {type === 'PHONE' && (
                  <div className="grid gap-2">
                    <Label htmlFor="partner-channel-country">Pays</Label>
                    <Select
                      disabled={saving}
                      onValueChange={(nextCountry) => {
                        setCountryCode(nextCountry);
                        setDirty((current) => ({
                          ...current,
                          countryCode: nextCountry !== baseline.countryCode,
                        }));
                      }}
                      value={countryCode}
                    >
                      <SelectTrigger
                        className="w-full"
                        id="partner-channel-country"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PHONE_COUNTRY_OPTIONS.map(([code, countryLabel]) => (
                          <SelectItem key={code} value={code}>
                            {countryLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="partner-channel-value">
                    {getTypeLabel(type)}
                  </Label>
                  <Input
                    autoComplete="off"
                    disabled={saving}
                    id="partner-channel-value"
                    maxLength={320}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setValue(nextValue);
                      setDirty((current) => ({
                        ...current,
                        value: nextValue.trim() !== baseline.value,
                      }));
                    }}
                    placeholder={
                      type === 'EMAIL'
                        ? 'contact@organisation.fr'
                        : '01 23 45 67 89'
                    }
                    required
                    type={type === 'EMAIL' ? 'email' : 'tel'}
                    value={value}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner-channel-label">Libellé</Label>
                <Input
                  autoComplete="off"
                  disabled={saving}
                  id="partner-channel-label"
                  list="partner-channel-label-suggestions"
                  maxLength={40}
                  onChange={(event) => {
                    const nextLabel = event.target.value;
                    setLabel(nextLabel);
                    setDirty((current) => ({
                      ...current,
                      label: nextLabel.trim() !== baseline.label,
                    }));
                  }}
                  placeholder="Général"
                  required
                  value={label}
                />
                <datalist id="partner-channel-label-suggestions">
                  {ORGANIZATION_CHANNEL_LABELS.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
              </div>
              <div className="bg-surface-inset flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
                <div className="grid gap-0.5">
                  <Label htmlFor="partner-channel-primary">
                    {getTypeLabel(type)} principal
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Remplace le principal actuel du même type.
                  </p>
                </div>
                <Switch
                  checked={isPrimary}
                  disabled={saving}
                  id="partner-channel-primary"
                  onCheckedChange={(checked) => {
                    setIsPrimary(checked);
                    setDirty((current) => ({
                      ...current,
                      isPrimary: checked !== baseline.isPrimary,
                    }));
                  }}
                />
              </div>
            </div>
            <DialogFooter className="border-border-divider bg-surface-inset border-t px-4 py-4 sm:justify-between sm:px-5">
              {channel && (
                <Button
                  disabled={saving}
                  onClick={() => setDeleteOpen(true)}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 className="size-4" />
                  Supprimer
                </Button>
              )}
              <div className="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
                <Button
                  disabled={saving}
                  onClick={onClose}
                  type="button"
                  variant="outline"
                >
                  Annuler
                </Button>
                <Button
                  disabled={
                    saving ||
                    !label.trim() ||
                    !value.trim() ||
                    (isEditing && !hasChanges)
                  }
                  type="submit"
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette coordonnée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Elle disparaîtra de la fiche. Cette action sera conservée dans le
              journal d’activité.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const PartnerOrganizationChannelsSection: FC<{
  canManage: boolean;
  onChange: (partner: PartnerDetail) => void;
  partner: PartnerDetail;
}> = ({ canManage, onChange, partner }) => {
  const [editor, setEditor] = useState<{
    channel: PartnerChannel | null;
    defaultType: ChannelType;
  } | null>(null);
  const emails = partner.channels.filter((channel) => channel.type === 'EMAIL');
  const phones = partner.channels.filter((channel) => channel.type === 'PHONE');

  return (
    <>
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <h2 className="font-semibold">Coordonnées de l’organisation</h2>
            <p className="text-muted-foreground text-sm">
              Standards et boîtes génériques. Les coordonnées personnelles
              restent dans le Répertoire.
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() => setEditor({ channel: null, defaultType: 'EMAIL' })}
              size="sm"
              type="button"
            >
              <Plus className="size-4" />
              Ajouter une coordonnée
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-2">
          <ChannelCollection
            canManage={canManage}
            channels={emails}
            onEdit={(channel) =>
              setEditor({ channel, defaultType: channel.type })
            }
            type="EMAIL"
          />
          <ChannelCollection
            canManage={canManage}
            channels={phones}
            onEdit={(channel) =>
              setEditor({ channel, defaultType: channel.type })
            }
            type="PHONE"
          />
        </CardContent>
      </Card>

      {editor && (
        <PartnerChannelDialog
          channel={editor.channel}
          defaultType={editor.defaultType}
          key={editor.channel?.id ?? `new-${editor.defaultType}`}
          onChange={onChange}
          onClose={() => setEditor(null)}
          partner={partner}
        />
      )}
    </>
  );
};
