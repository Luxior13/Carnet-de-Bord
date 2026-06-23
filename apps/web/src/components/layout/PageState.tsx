import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import React, { type FC, type ReactNode } from 'react';

import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';
import { PageCanvas, PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

type PageStateTone = 'default' | 'destructive';

type PageStateProps = {
  actionHref?: string;
  actionLabel?: string;
  description: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
  tone?: PageStateTone;
};

const getToneClassName = (tone: PageStateTone): string =>
  tone === 'destructive'
    ? 'bg-destructive/10 text-destructive'
    : 'bg-primary/10 text-primary';

export const PageState: FC<PageStateProps> = ({
  actionHref,
  actionLabel,
  description,
  icon,
  title,
  tone = 'default',
}) => {
  return (
    <PageShell className="py-0">
      <PageCanvas>
        <Card className="mx-auto max-w-3xl py-0">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <ServiceIcon className={cn(getToneClassName(tone))}>
                {icon ?? <ShieldAlert className="size-5" />}
              </ServiceIcon>
              <div className="space-y-3">
                <div>
                  <h1 className="text-xl font-semibold">{title}</h1>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {description}
                  </p>
                </div>
                {actionHref && actionLabel && (
                  <Button asChild variant="outline">
                    <Link href={actionHref}>{actionLabel}</Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </PageCanvas>
    </PageShell>
  );
};

export const AccessDeniedState: FC<{
  actionHref?: string;
  actionLabel?: string;
  description: ReactNode;
}> = ({ actionHref, actionLabel, description }) => (
  <PageState
    actionHref={actionHref}
    actionLabel={actionLabel}
    description={description}
    title="Accès refusé"
    tone="destructive"
  />
);
