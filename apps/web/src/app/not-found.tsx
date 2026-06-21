import { ArrowLeft, SearchX } from 'lucide-react';
import Link from 'next/link';
import React, { type FC } from 'react';

import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';

const NotFoundPage: FC = () => {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="space-y-6 px-6">
          <div className="bg-secondary text-primary mx-auto flex size-14 items-center justify-center rounded-lg">
            <SearchX className="size-7" />
          </div>
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
              Retour au tableau de bord
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFoundPage;
