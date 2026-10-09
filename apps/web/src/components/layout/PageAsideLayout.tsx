import React, { type FC, type ReactNode } from 'react';

import { cn } from '$utils/css.utils';

import styles from './PageAsideLayout.module.css';

type PageAsideLayoutProps = {
  /** Secondary content: right rail on wide screens, stacked below otherwise. */
  aside: ReactNode;
  children: ReactNode;
  className?: string;
  /** Full-width page heading, kept above the rail. */
  header?: ReactNode;
};

/**
 * Layout partagé des pages avec un rail secondaire. La colonne principale
 * garde la largeur de contenu standard ; le rail ne s'affiche à droite que si
 * la place existe, sans jamais réduire la colonne principale.
 */
export const PageAsideLayout: FC<PageAsideLayoutProps> = ({
  aside,
  children,
  className,
  header,
}) => (
  <div className={cn(styles.layout, className)}>
    {header ? <div className={styles.header}>{header}</div> : null}
    <div className={styles.main}>{children}</div>
    <div className={styles.aside}>{aside}</div>
  </div>
);
