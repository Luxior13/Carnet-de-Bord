'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

import { RouteErrorState } from '$components/layout/RouteErrorState';
import { isPublicPagePath } from '$constants/security.constants';

export default function ErrorPage({
  error,
}: {
  error: Error & { digest?: string };
}): React.JSX.Element {
  const pathname = usePathname();

  return (
    <RouteErrorState
      digest={error.digest}
      standalone={isPublicPagePath(pathname)}
    />
  );
}
