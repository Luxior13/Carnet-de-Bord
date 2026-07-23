'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { type FC, type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '$ui/card';
import { Checkbox } from '$ui/checkbox';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import { Textarea } from '$ui/textarea';
import { ApiClientError } from '$utils/api.utils';

import { createPartner } from '../partner.api';
import { PARTNER_STATUS_LABELS } from '../partner.constants';

export const PartnerCreateForm: FC<{ returnHref: string }> = ({
  returnHref,
}) => {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sponsor, setSponsor] = useState(true);
  const [partner, setPartner] = useState(false);
  const [status, setStatus] =
    useState<keyof typeof PARTNER_STATUS_LABELS>('PROSPECT');

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!sponsor && !partner) {
      setError('Sélectionnez Sponsor ou Partenaire.');

      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await createPartner({
        categories: [
          ...(sponsor ? ['SPONSOR'] : []),
          ...(partner ? ['PARTNER'] : []),
        ],
        channels: [
          ...(String(form.get('email') ?? '').trim()
            ? [
                {
                  isPrimary: true,
                  label: 'Général',
                  type: 'EMAIL',
                  value: String(form.get('email')),
                },
              ]
            : []),
          ...(String(form.get('phone') ?? '').trim()
            ? [
                {
                  countryCode: 'FR',
                  isPrimary: true,
                  label: 'Général',
                  type: 'PHONE',
                  value: String(form.get('phone')),
                },
              ]
            : []),
        ],
        contact: null,
        currentSituation: null,
        description: String(form.get('description') ?? '').trim() || null,
        endedOn: null,
        name: String(form.get('name') ?? ''),
        startedOn:
          status === 'ACTIVE' || status === 'ENDED'
            ? String(form.get('startedOn') ?? '') || null
            : null,
        status,
        website: String(form.get('website') ?? '').trim() || null,
      });
      if (response.duplicateWarning) {
        sessionStorage.setItem(
          `partner-duplicate:${response.partner.id}`,
          response.duplicateWarning.names.join(', '),
        );
      }
      toast.success('Fiche partenaire créée');
      router.push(
        `/bureau-juridique/partenaires/${encodeURIComponent(response.partner.id)}?${new URLSearchParams({ returnTo: returnHref })}`,
      );
    } catch (caught) {
      setError(
        caught instanceof ApiClientError
          ? caught.message
          : 'La fiche ne peut pas être créée.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <form autoComplete="off" onSubmit={(event) => void submit(event)}>
        <CardHeader>
          <h2 className="font-semibold">Informations essentielles</h2>
          <p className="text-muted-foreground text-sm">
            Commencez simplement ; les contacts et le suivi se complètent
            ensuite dans la fiche.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="partner-name">Nom de l’organisation</Label>
            <Input
              autoComplete="off"
              id="partner-name"
              maxLength={200}
              name="name"
              required
            />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Catégories</legend>
            <div className="flex flex-wrap gap-5">
              <Label className="flex items-center gap-2">
                <Checkbox
                  checked={sponsor}
                  onCheckedChange={(value) => setSponsor(value === true)}
                />
                Sponsor
              </Label>
              <Label className="flex items-center gap-2">
                <Checkbox
                  checked={partner}
                  onCheckedChange={(value) => setPartner(value === true)}
                />
                Partenaire
              </Label>
            </div>
          </fieldset>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="partner-status">Statut initial</Label>
              <select
                className="border-input bg-surface h-10 rounded-md border px-3 text-sm"
                id="partner-status"
                onChange={(event) =>
                  setStatus(
                    event.target.value as keyof typeof PARTNER_STATUS_LABELS,
                  )
                }
                value={status}
              >
                {Object.entries(PARTNER_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {(status === 'ACTIVE' || status === 'ENDED') && (
              <div className="grid gap-2">
                <Label htmlFor="partner-started">Début de relation</Label>
                <Input id="partner-started" name="startedOn" type="date" />
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="partner-description">Description courte</Label>
            <Textarea
              id="partner-description"
              maxLength={500}
              name="description"
              rows={3}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="partner-website">Site internet</Label>
              <Input
                autoComplete="off"
                id="partner-website"
                name="website"
                placeholder="https://…"
                type="url"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-email">Email général</Label>
              <Input
                autoComplete="off"
                id="partner-email"
                name="email"
                type="email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="partner-phone">Téléphone général</Label>
              <Input
                autoComplete="off"
                id="partner-phone"
                name="phone"
                type="tel"
              />
            </div>
          </div>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            disabled={submitting}
            onClick={() => router.push(returnHref)}
            type="button"
            variant="outline"
          >
            Annuler
          </Button>
          <Button disabled={submitting} type="submit">
            <ArrowRight className="size-4" />
            {submitting ? 'Création…' : 'Créer et ouvrir la fiche'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
