import React, { type FC, type ReactNode } from 'react';

import { cn } from '$utils/css.utils';

import styles from './PageIdentityHero.module.css';

type PageIdentityHeroProps = {
  /** Optional action, aligned to the right of the hero on wide screens. */
  actions?: ReactNode;
  /** Densité réduite pour les pages de formulaire ou de confirmation. */
  compact?: boolean;
  description?: ReactNode;
  /** Petit libellé au-dessus du titre, par exemple « Mon compte ». */
  eyebrow?: ReactNode;
  icon: ReactNode;
  /** Optional complementary content, displayed under the description. */
  meta?: ReactNode;
  title: ReactNode;
};

/**
 * Hero de page aligné sur le bandeau du Répertoire : carte dégradée, icône,
 * titre et description. Il reste volontairement simple et sans état.
 */
export const PageIdentityHero: FC<PageIdentityHeroProps> = ({
  actions,
  compact = false,
  description,
  eyebrow,
  icon,
  meta,
  title,
}) => (
  <header
    className={cn(styles.hero, compact && styles.compact)}
    data-slot="page-heading"
  >
    <div className={styles.heroIdentity}>
      <span aria-hidden="true" className={styles.heroLogo}>
        {icon}
      </span>
      <div>
        {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
        <div className={styles.titleLine}>
          <h1>{title}</h1>
          {compact && meta ? (
            <div className={styles.metaInline}>{meta}</div>
          ) : null}
        </div>
        {description ? <p>{description}</p> : null}
        {!compact && meta ? <div className={styles.meta}>{meta}</div> : null}
      </div>
    </div>
    {actions}
  </header>
);
