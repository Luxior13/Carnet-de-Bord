import { FlaskConical } from 'lucide-react';
import type React from 'react';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '$ui/card';
import { PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';

export default function TestPage(): React.ReactNode {
  return (
    <AuthenticatedLayout breadcrumbs={[{ href: '/test', label: 'Test' }]}>
      <PageShell className="space-y-6">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Page active</p>
          <h1 className="text-2xl font-semibold tracking-tight">Test</h1>
        </div>
        <Card className="bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServiceIcon>
                <FlaskConical className="size-5" />
              </ServiceIcon>
              Page test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Cette page confirme que la sidebar peut afficher une nouvelle
              destination.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    </AuthenticatedLayout>
  );
}
