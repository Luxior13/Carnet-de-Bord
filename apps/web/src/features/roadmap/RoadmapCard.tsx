import React from 'react';

import { Disclosure } from '$components/layout/Disclosure';
import { Badge } from '$ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '$ui/card';

import {
  getRoadmapItem,
  ROADMAP_KIND_LABELS,
  ROADMAP_STATUS_LABELS,
} from './roadmap.constants';
import type { RoadmapItem } from './roadmap.types';

export function RoadmapCard({ item }: { item: RoadmapItem }): React.ReactNode {
  const dependencies = item.dependsOn
    .map((id) => getRoadmapItem(id)?.title)
    .filter(Boolean);

  return (
    <Card className="min-w-0" id={`roadmap-${item.id}`}>
      <CardHeader className="space-y-2 p-4 pb-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">Étape {item.phase}</Badge>
          <Badge variant={item.status === 'partial' ? 'secondary' : 'outline'}>
            {ROADMAP_STATUS_LABELS[item.status]}
          </Badge>
          <Badge variant="outline">{ROADMAP_KIND_LABELS[item.kind]}</Badge>
        </div>
        <CardTitle as="h3" className="text-sm">
          {item.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 text-sm leading-6">
        <p className="text-muted-foreground">{item.description}</p>
        {item.baseline && (
          <p className="border-border text-muted-foreground border-l-2 pl-3">
            {item.baseline}
          </p>
        )}
        <div>
          <p className="font-medium">Première version prévue</p>
          <p className="text-muted-foreground">{item.firstRelease}</p>
        </div>
        <Disclosure
          className="border-border border-t pt-3"
          label="Public, prérequis et suite"
        >
          <dl className="mt-3 space-y-3">
            <div>
              <dt className="font-medium">Pour qui</dt>
              <dd className="text-muted-foreground">{item.audience}</dd>
            </div>
            <div>
              <dt className="font-medium">Prérequis</dt>
              <dd className="text-muted-foreground">
                {dependencies.length
                  ? dependencies.join(' · ')
                  : 'Cadrage initial, sans autre chantier métier préalable.'}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Critère de livraison</dt>
              <dd className="text-muted-foreground">{item.doneWhen}</dd>
            </div>
            <div>
              <dt className="font-medium">Ensuite, selon les besoins</dt>
              <dd className="text-muted-foreground">{item.later}</dd>
            </div>
          </dl>
        </Disclosure>
      </CardContent>
    </Card>
  );
}
