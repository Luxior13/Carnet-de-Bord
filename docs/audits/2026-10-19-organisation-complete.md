# Organisation complète de la documentation — 19 octobre 2026

[Index des audits](README.md) · [Organisation documentaire](../methode/organisation-documentaire.md) ·
[Guide général](../REFERENCE_GENERALE.md)

## Demande et périmètre

Demande du propriétaire : analyser tous les documents du projet
`exemple-site-discord-main` (site Noctambule) et reprendre leur organisation
dans Carnet de Bord, en prenant le temps de tout récupérer.

- Source en lecture seule : `C:\Users\Luxior\Desktop\exemple-site-discord-main`,
  266 documents Markdown, organisés le 18 octobre 2026 (son rapport
  `2026-10-18-organisation-complete.md`). Lecture complète des consignes, de
  l’index, de la référence générale, de la méthode, des modèles, du design
  (principes, fondations, composants, comportements, gabarits, préférences,
  harmonisation), de la cartographie du système, des index de pages, de domaines,
  d’exploitation, de propositions et d’audits, d’exemples de fiches générées et
  travaillées, et du contrôleur documentaire avec ses tests.
- Dépôt cible : commit `a39d1c9` (travail du propriétaire sur les Autorisations
  commité avant la migration ; la version découpée du suivi Utilisateurs est
  identique à celle de ce commit). 271 documents Markdown lus : 172 dans `docs/`,
  95 dans `features/`, `AGENTS.md`, `CLAUDE.md` et les deux guides de la base.
- Travail documentaire et contrôleur (`scripts/check-docs.mjs` et ses tests).
  **Aucun code applicatif, aucune migration, aucune base n’a été modifié.**

Les règles métier, l’état de production et les décisions propres au site
Noctambule n’ont pas été transposées : seuls l’organisation, la méthode, la
grille de revue et les familles d’identifiants (Q33 à Q36) sont repris.

## Résultat

**Verdict : périmètre documentaire vérifié** (contrôles ci-dessous). Ce verdict
ne valide aucun comportement applicatif ; les fiches créées ne sont pas des
revues de page.

| Avant | Après |
| --- | --- |
| Revue générale en 30 questions dans `docs/qualite/` | [Référence générale](../REFERENCE_GENERALE.md) en 36 points groupés en 9 familles, chacun relié à son fichier (Q31 et Q32 réservés) |
| 12 suivis par module dans `docs/qualite/pages/`, jusqu’à 1 525 lignes de journal | 27 fiches et index dans `docs/pages/` : une fiche par page servie (13 routes `page.tsx`) et par section importante |
| `DESIGN_SYSTEM.md` et `COMPOSANTS.md` dans `docs/references/` | [Système de design](../design/README.md) : README, principes, fondations, composants, comportements, gabarits, préférences, harmonisation |
| Aucune cartographie du code (hors audit du 10 octobre) | [Cartographie du système](../systeme/README.md) : architecture, routes, API, données, tests, constats `SYS-xx` |
| Références canoniques mélangées dans `docs/references/` | Fiches transversales dans `references/`, règles métier dans [domaines](../domaines/README.md), [exploitation](../exploitation/README.md), [feuille de route](../propositions/feuille-de-route.md) |
| `docs/plans/` et `features/` à la racine | [Propositions](../propositions/README.md) avec statut et [intentions historiques](../propositions/intentions/README.md) |
| Rapports `AUDIT_<SUJET>_<date>.md`, trois sans date | Nommage `AAAA-MM-JJ-<périmètre>.md` |
| Pas de `README.md` racine ; `CLAUDE.md` sans import d’`AGENTS.md` | [README](../../README.md) ; [CLAUDE.md](../../CLAUDE.md) importe `AGENTS.md` et ajoute la boucle des préférences |
| Contrôleur limité aux liens et à des index par dossier | Contrôle des orphelins, d’une fiche par page de l’application, des rapports datés et de la casse exacte |

## Nouvelle arborescence

```text
docs/
├── REFERENCE_GENERALE.md, README.md
├── references/     30 fiches Q01–Q30, architecture d’une fonctionnalité, politique des retours
├── design/         README, principes, fondations, composants, comportements,
│                   gabarits, preferences, harmonisation
├── pages/          accueil, connexion, mon-compte/, membres/repertoire/,
│                   systeme/ (utilisateurs/, parametres, feuille-de-route,
│                   journal-activite), transverse/
├── domaines/       permissions, rôles métier, navigation, structure juridique
├── systeme/        architecture, routes, api, donnees, tests, constats
├── exploitation/   procédures d’exploitation
├── audits/         rapports datés ; dossiers de preuves inchangés
├── propositions/   feuille de route, sujets futurs, plans, intentions/
└── methode/        organisation, audit, grille de revue, contribution, modeles/
```

## Déplacements

Les 1 625 liens relatifs concernés ont été recalculés automatiquement dans tous
les documents, rapports et preuves compris, ancres comprises lorsque la section
visée a changé de fichier. Aucune ancre n’est restée sans correspondance. Les
fichiers sont déplacés sans `git mv` : Git détecte les renommages par similarité.

| Ancien chemin | Nouveau chemin |
| --- | --- |
| `docs/qualite/REVUE_GENERALE.md` | [REFERENCE_GENERALE.md](../REFERENCE_GENERALE.md), réécrit en parcours et familles |
| `docs/qualite/fiches/*.md` (30) | `docs/references/*.md`, mêmes noms |
| `docs/qualite/README.md`, `REFERENCES.md`, `decisions/README.md` | [methode/organisation-documentaire.md](../methode/organisation-documentaire.md), contenus fusionnés |
| `docs/qualite/AUDITS.md` | [methode/audit.md](../methode/audit.md) |
| `docs/qualite/CONTROLES.md` | [systeme/tests.md](../systeme/tests.md), complété par les familles de tests |
| `docs/qualite/SUJETS_FUTURS.md` | [propositions/sujets-futurs.md](../propositions/sujets-futurs.md) |
| `docs/qualite/modeles/revue-page.md`, `audit.md`, `decision.md` | [methode/modeles/](../methode/modeles/suivi-page.md) `suivi-page.md`, `rapport-audit.md`, `decision.md` |
| `docs/qualite/pages/README.md` | [pages/README.md](../pages/README.md) |
| `docs/qualite/pages/systeme-utilisateurs.md` | [pages/systeme/utilisateurs/](../pages/systeme/utilisateurs/README.md), découpé (voir ci-dessous) |
| `docs/qualite/pages/membres-repertoire.md` | [pages/membres/repertoire/](../pages/membres/repertoire/README.md), découpé |
| `docs/qualite/pages/mon-compte.md` | [pages/mon-compte/](../pages/mon-compte/README.md), découpé |
| `docs/qualite/pages/accueil.md`, `connexion.md` | [pages/accueil.md](../pages/accueil.md), [pages/connexion.md](../pages/connexion.md) |
| `docs/qualite/pages/systeme-parametres.md`, `systeme-feuille-de-route.md`, `systeme-journal-activite.md` | [pages/systeme/](../pages/systeme/README.md) `parametres.md`, `feuille-de-route.md`, `journal-activite.md` |
| `docs/qualite/pages/navigation-generale.md`, `etats-techniques.md`, `composants-partages.md`, `modales.md` | [pages/transverse/](../pages/transverse/README.md), mêmes noms |
| `docs/references/DESIGN_SYSTEM.md` | Réparti dans `docs/design/` (voir ci-dessous) |
| `docs/references/COMPOSANTS.md` | [design/composants.md](../design/composants.md) |
| `docs/references/FEEDBACK.md` | [references/feedback.md](../references/feedback.md) |
| `docs/references/FEATURE_ARCHITECTURE.md` | [references/architecture-fonctionnalite.md](../references/architecture-fonctionnalite.md) |
| `docs/references/NAVIGATION.md` | [domaines/navigation.md](../domaines/navigation.md) |
| `docs/references/PERMISSIONS.md` | [domaines/permissions.md](../domaines/permissions.md) |
| `docs/references/ROLES_ET_PERMISSIONS.md` | [domaines/roles-metier.md](../domaines/roles-metier.md) |
| `docs/references/STRUCTURE.md` | [domaines/structure-juridique.md](../domaines/structure-juridique.md) |
| `docs/references/FEUILLE_DE_ROUTE.md` | [propositions/feuille-de-route.md](../propositions/feuille-de-route.md) |
| `docs/references/OPERATIONS.md` | [exploitation/operations.md](../exploitation/operations.md) |
| `docs/plans/README.md` | [propositions/README.md](../propositions/README.md), réécrit |
| `docs/plans/FEATURES.md` | [propositions/catalogue-initial.md](../propositions/catalogue-initial.md) |
| `docs/plans/PLAN_PERSONNES_IDENTITE.md` | [propositions/membres-personnes-identite.md](../propositions/membres-personnes-identite.md) |
| `docs/plans/PLAN_REUNIONS.md` | [propositions/vie-interne-reunions.md](../propositions/vie-interne-reunions.md) |
| `docs/plans/PLAN_SPONSORS_PARTENAIRES.md` | [propositions/relations-sponsors-partenaires.md](../propositions/relations-sponsors-partenaires.md) |
| `docs/plans/UX_UI_PROPOSITION_2026-09-23.md` | [propositions/interface-proposition-ux-ui.md](../propositions/interface-proposition-ux-ui.md) |
| `features/**` (95 documents) | [docs/propositions/intentions/**](../propositions/intentions/README.md), même arborescence |

Rapports d’audit renommés dans `docs/audits/` (contenu inchangé hors liens) :

| Ancien nom | Nouveau nom |
| --- | --- |
| `AUDIT_ACCUEIL_2026-10-12.md` | `2026-10-12-accueil.md` |
| `AUDIT_AUTOCOMPLETION_2026-10-11.md` | `2026-10-11-autocompletion.md` |
| `AUDIT_AUTORISATIONS_SITE_2026-10-15.md` | `2026-10-15-autorisations-site.md` |
| `AUDIT_AUTORISATIONS_UTILISATEUR_2026-10-10.md` | `2026-10-10-autorisations-utilisateur.md` |
| `AUDIT_CLOTURE_SOCLE_2026-10-12.md` | `2026-10-12-cloture-socle.md` |
| `AUDIT_COMPOSANTS_2026-10-11.md` | `2026-10-11-composants.md` |
| `AUDIT_CONNEXION_2026-10-12.md` | `2026-10-12-connexion.md` |
| `AUDIT_CREATION_PERSONNE_2026-10-12.md` | `2026-10-12-creation-personne.md` |
| `AUDIT_CREATION_UTILISATEUR_2026-10-10.md` | `2026-10-10-creation-utilisateur.md` |
| `AUDIT_CREATION_UTILISATEUR_2026-10-11.md` | `2026-10-11-creation-utilisateur.md` |
| `AUDIT_DESIGN.md` | `2026-09-22-design.md` |
| `AUDIT_ETATS_TECHNIQUES_2026-10-12.md` | `2026-10-12-etats-techniques.md` |
| `AUDIT_FEUILLE_DE_ROUTE_2026-10-12.md` | `2026-10-12-feuille-de-route.md` |
| `AUDIT_FEUILLE_DE_ROUTE_LONG_TERME_2026-09-22.md` | `2026-09-22-feuille-de-route-long-terme.md` |
| `AUDIT_FICHE_PERSONNE_2026-10-12.md` | `2026-10-12-fiche-personne.md` |
| `AUDIT_FICHE_UTILISATEUR_2026-10-10.md` | `2026-10-10-fiche-utilisateur.md` |
| `AUDIT_FICHE_UTILISATEUR_2026-10-11.md` | `2026-10-11-fiche-utilisateur.md` |
| `AUDIT_MENUS_2026-10-10.md` | `2026-10-10-menus.md` |
| `AUDIT_MODALES_2026-10-11.md` | `2026-10-11-modales.md` |
| `AUDIT_MON_COMPTE_2026-10-11.md` | `2026-10-11-mon-compte.md` |
| `AUDIT_NAVIGATION_GENERALE_2026-10-12.md` | `2026-10-12-navigation-generale.md` |
| `AUDIT_NAVIGATION_SECTIONS_2026-10-11.md` | `2026-10-11-navigation-sections.md` |
| `AUDIT_PAGES_RESTANTES_2026-10-11.md` | `2026-10-11-pages-restantes.md` |
| `AUDIT_PARAMETRES_2026-10-11.md` | `2026-10-11-parametres.md` |
| `AUDIT_PARAMETRES_COMPLET_2026-10-11.md` | `2026-10-11-parametres-complet.md` |
| `AUDIT_REPERTOIRE_2026-10-10.md` | `2026-10-10-repertoire.md` |
| `AUDIT_REPERTOIRE_2026-10-11.md` | `2026-10-11-repertoire.md` |
| `AUDIT_SCHEMA_PRISMA_2026-10-13.md` | `2026-10-13-schema-prisma.md` |
| `AUDIT_SHADCN.md` | `2026-09-22-shadcn.md` |
| `AUDIT_TYPOGRAPHIE.md` | `2026-09-22-typographie.md` |
| `AUDIT_UI_UTILISATEURS_2026-09-26.md` | `2026-09-26-ui-utilisateurs.md` |
| `AUDIT_URLS_2026-09-24.md` | `2026-09-24-urls.md` |
| `AUDIT_UTILISATEURS_2026-10-10.md` | `2026-10-10-utilisateurs.md` |
| `AUDIT_UTILISATEURS_2026-10-11.md` | `2026-10-11-utilisateurs.md` |
| `COMPREHENSION_PROJET_2026-10-10.md` | `2026-10-10-comprehension-projet.md` |
| `ORGANISATION_DOCUMENTAIRE_2026-10-10.md` | `2026-10-10-organisation-documentaire.md` |
| `UX_UI_AUDIT_2026-09-24.md` | `2026-09-24-ux-ui.md` |

Les dossiers de preuves (`accueil-2026-10-12/`…) ne sont **pas** renommés :
leurs scripts `.cjs`, `.ts`, `.ps1` et leurs résultats JSON citent leur propre
chemin, et une preuve ne doit pas être réécrite.

### Découpage des suivis de page

Chaque section des anciens suivis a été déplacée **sans modification de
contenu** (seuls les liens sont recalculés) vers la fiche de la page ou de la
section qu’elle concerne, sous « Revues datées », un niveau de titre plus bas.
Les sections qui concernent tout le module restent dans le `README.md` du
module. Chaque fiche reçoit en tête l’identité, le rôle, la composition, les
décisions retenues, les points ouverts, les références et l’historique.

| Ancien suivi | Fiches |
| --- | --- |
| Utilisateurs | [README](../pages/systeme/utilisateurs/README.md) (synthèse, revues de la fiche, composants communs), [liste](../pages/systeme/utilisateurs/liste.md) (13 sections, registre USR-01 à USR-25), [création](../pages/systeme/utilisateurs/creation.md), [Profil](../pages/systeme/utilisateurs/fiche-profil.md) (nouvelle, « Suivi à compléter »), [Autorisations](../pages/systeme/utilisateurs/fiche-autorisations.md) (7 sections), [Sécurité](../pages/systeme/utilisateurs/fiche-securite.md) (4 sections) |
| Répertoire | [README](../pages/membres/repertoire/README.md), [liste](../pages/membres/repertoire/liste.md) (8 sections dont l’inventaire A à Z), [création](../pages/membres/repertoire/creation.md), [Identité](../pages/membres/repertoire/fiche-identite.md) (nouvelle), [Coordonnées](../pages/membres/repertoire/fiche-coordonnees.md) |
| Mon compte | [README](../pages/mon-compte/README.md), [Profil](../pages/mon-compte/profil.md), [Sécurité](../pages/mon-compte/securite.md) |

### Répartition de `DESIGN_SYSTEM.md`

| Ancienne section | Nouveau fichier |
| --- | --- |
| Introduction, « Référence visuelle choisie », §12 Règles pour ajouter une page, §13 Liens | [design/README.md](../design/README.md) (pages de référence, appliquer le système) |
| « Règle de réutilisation », §8 Onglets et rails, §10 Inventaire des composants | [design/composants.md](../design/composants.md) |
| §1 Principes | [design/principes.md](../design/principes.md) (socle visuel) |
| §2 Couleurs, §3 Typographie, §4 Espacements et arrondis, §5 Ombres, §11 Mouvement et accessibilité, §14 Où ranger un style | [design/fondations.md](../design/fondations.md) |
| §6 Focus et états, §9 États d’interface et barre d’enregistrement | [design/comportements.md](../design/comportements.md) |
| §7 Hiérarchie d’une page | [design/gabarits.md](../design/gabarits.md) |

## Créations

| Ensemble | Contenu | Source des informations |
| --- | --- | --- |
| Point d’entrée et consignes | Référence générale en 36 points, `AGENTS.md` restructuré, `CLAUDE.md` avec import et boucle des préférences, `README.md` racine | Ancienne revue générale, consignes existantes, modèle de l’exemple |
| Design | Principes, fondations (palette chiffrée, variantes autorisées, points de rupture), comportements, gabarits A à G, journal des préférences (26 entrées datées), harmonisation | `globals.css` (468 lignes), 10 fichiers CSS, 154 TSX, décisions datées des suivis |
| Fiches de page | 10 fiches et index nouveaux, en-têtes ajoutés aux fiches existantes | Code de chaque route, registres des points des suivis |
| Système | Architecture, routes, API, données, constats ; tests complétés | 13 pages, 33 routes API, 19 modèles et 12 énumérations, 54 migrations, 114 fichiers de tests |
| Méthode | Grille de questions de revue adaptée, guide de contribution, modèle de création ou évolution | Grille de l’exemple, conventions du dépôt |
| Index | `domaines/`, `exploitation/`, `pages/membres/`, `pages/systeme/`, `pages/transverse/` | Documents existants |

## Constats documentaires

| ID | Constat | Traitement |
| --- | --- | --- |
| DOC-01 | Les suivis de page étaient des journaux par module empilant des revues datées (jusqu’à 1 525 lignes) | Découpés en fiches par page et section, synthèse courante en tête, revues datées conservées |
| DOC-02 | Trois rapports n’avaient pas de date dans leur nom | Datés d’après leur titre (22 septembre 2026), sans date inventée |
| DOC-03 | Le design system décrivait encore le rôle des Autorisations en variante par défaut avec lignes alternées, contraire à la décision du 18 octobre et au code | Corrigé dans les [fondations](../design/fondations.md#espacements-et-arrondis) ; [HARMO-04](../design/harmonisation.md) |
| DOC-04 | La règle « valeur appliquée puis Modifier » des réglages était remplacée depuis la refonte des Paramètres du 14 octobre | Corrigée dans les [gabarits](../design/gabarits.md#d-page-de-réglages) et les [comportements](../design/comportements.md) |
| DOC-05 | « `PageHero` reste utilisé par des pages anciennes » alors que son seul consommateur n’est pas branché | Corrigé ; [SYS-01](../systeme/constats.md) |
| DOC-06 | Les badges de statut étaient décrits sans leur rayon réel (5 px) | Variantes autorisées complétées ; classe recopiée suivie par [HARMO-01](../design/harmonisation.md) |
| DOC-07 | Trois libellés de l’index des intentions étaient des lignes de citation | Remplacés par les titres des documents |
| DOC-08 | Le dossier racine `features/` portait le même nom que `apps/web/src/features` (code) | Déplacé dans `docs/propositions/intentions/` |
| DOC-09 | Des migrations appliquées citent d’anciens chemins de documentation | Documenté par [SYS-05](../systeme/constats.md), migrations non modifiées |

Constats techniques relevés pendant la cartographie : [SYS-01 à SYS-06](../systeme/constats.md)
(code dormant de l’actualité interne, composants sans consommateur, section
Activité retirée mais chargeable, redirections en double, planification de la
maintenance) et [HARMO-01 à HARMO-05](../design/harmonisation.md).

## Vérifications

Contrôles exécutés localement le 19 octobre 2026 ; ils ne prouvent pas une
exécution de la CI distante.

| Contrôle | Résultat |
| --- | --- |
| Migration en essai à blanc puis sur une copie, avant application | 271 documents lus, 1 625 liens réécrits, 0 ancre sans correspondance |
| Conservation du contenu | 5 388 lignes des anciens suivis, de `DESIGN_SYSTEM.md` et de `COMPOSANTS.md` comparées aux nouveaux fichiers (cibles de liens neutralisées) : 177 écarts, tous volontaires (titres renommés, libellés de liens, règles périmées corrigées, introduction et §12–13 du design réécrites) |
| Version du suivi Utilisateurs | Identique à celle du commit `a39d1c9` |
| `bun run docs:check` | Réussi : 302 documents contrôlés, 32 fiches, 27 fiches de page pour 13 routes, 38 rapports indexés, 3 025 liens locaux vérifiés |
| `bun run docs:check:test` | 16 tests réussis, dont fiche par page, orphelins (intentions comprises), preuves d’audit et guides de la base |
| Sauvegarde | Copie intégrale des anciens documents conservée hors dépôt pendant le travail |

## Limites

- Les fiches « Suivi à compléter » (Profil d’un utilisateur, Identité d’une
  personne) décrivent le code ; leur composition est à relever à la première reprise.
- Les synthèses de tête des fiches résument les revues datées ; en cas de doute,
  la revue datée et son rapport font foi.
- Aucun rendu n’a été observé dans un navigateur ; aucun test applicatif n’a été
  relancé, le code n’ayant pas changé.
- Les relevés de la cartographie et de l’harmonisation sont automatiques et datés.

## Suite proposée

1. Trancher les constats « à qualifier » : code dormant de l’actualité interne
   (SYS-01), composants sans consommateur (SYS-02), section Activité (SYS-03),
   redirections en double (SYS-04) — exigence « zéro code mort ».
2. Badge de statut commun (HARMO-01).
3. Compléter les deux fiches « Suivi à compléter » à leur première reprise.
4. Trancher la question ouverte [PREF-Q1](../design/preferences.md#questions-ouvertes)
   sur la synthèse sous 118 rem.
