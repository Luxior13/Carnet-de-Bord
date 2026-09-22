'use client';

import React, { type ComponentProps, type FC, useId } from 'react';

import { SectionPanel } from '$components/layout/SectionPanel';

type AccountPanelProps = Omit<ComponentProps<typeof SectionPanel>, 'titleId'>;

export const AccountPanel: FC<AccountPanelProps> = (props) => {
  const titleId = useId();

  return <SectionPanel {...props} titleId={titleId} />;
};
