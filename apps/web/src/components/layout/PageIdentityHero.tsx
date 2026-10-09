import React, { type FC, type ReactNode } from 'react';

import styles from './PageIdentityHero.module.css';

type PageIdentityHeroProps = {
  /** Optional action, aligned to the right of the hero on wide screens. */
  actions?: ReactNode;
  description?: ReactNode;
  icon: ReactNode;
  title: ReactNode;
};

/**
 * Hero de page aligné sur le bandeau du Répertoire : carte dégradée, icône,
 * titre et description. Il reste volontairement simple et sans état.
 */
export const PageIdentityHero: FC<PageIdentityHeroProps> = ({
  actions,
  description,
  icon,
  title,
}) => (
  <header className={styles.hero} data-slot="page-heading">
    <div className={styles.heroIdentity}>
      <span aria-hidden="true" className={styles.heroLogo}>
        {icon}
      </span>
      <div>
        <div className={styles.titleLine}>
          <h1>{title}</h1>
        </div>
        {description ? <p>{description}</p> : null}
      </div>
    </div>
    {actions}
  </header>
);
