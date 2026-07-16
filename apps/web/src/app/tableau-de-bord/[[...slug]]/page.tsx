import { notFound, redirect } from 'next/navigation';
import React from 'react';

type TableauDeBordPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function TableauDeBordPage({
  params,
}: TableauDeBordPageProps): Promise<React.ReactNode> {
  const { slug = [] } = await params;

  // The live dashboard is the application home page. Keep the historical
  // route as a stable alias without rendering the preparation template.
  if (slug.length === 0) redirect('/');

  notFound();
}
