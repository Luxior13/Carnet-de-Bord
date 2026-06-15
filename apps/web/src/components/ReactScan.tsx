'use client';

import { type FC, useEffect } from 'react';
import { scan } from 'react-scan';

const ReactScan: FC = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    scan({
      enabled: process.env.NODE_ENV === 'development',
    });
  }, []);

  return null;
};

export default ReactScan;
