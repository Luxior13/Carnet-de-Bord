import { ArrowLeft, SearchX } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';
import { ServiceIcon } from '$ui/service-icon';

const NotFoundPage: FC = () => {
  return (
    <div className="relative isolate flex min-h-svh items-center justify-center overflow-hidden p-4">
      <div aria-hidden="true" className="site-background-column" />
      <Card className="relative z-10 w-full max-w-md text-center">
        <CardContent className="space-y-6 px-6">
          <ServiceIcon className="mx-auto size-14">
            <SearchX className="size-7" />
          </ServiceIcon>
          <div className="space-y-2">
            <h1 className="text-5xl font-semibold tracking-tight">404</h1>
            <h2 className="text-xl font-semibold">Page introuvable</h2>
          </div>
          <p className="text-muted-foreground">
            La page que vous recherchez n&apos;existe pas ou a été déplacée.
          </p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="size-4" />
              Retour à l&apos;accueil
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFoundPage;
