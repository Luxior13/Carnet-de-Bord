# Documentation du projet

**Tout travail commence par la [référence générale](REFERENCE_GENERALE.md)** :
elle liste les 36 points à examiner et renvoie, pour chacun, au fichier qui
l’approfondit. Cet index sert ensuite à retrouver un document ; ce n’est pas
une liste de lecture obligatoire. Ne lire que ce qui sert ; un sujet absent du
besoin et de ses effets indirects est ignoré.

## Carte de la documentation

```text
docs/
├── REFERENCE_GENERALE.md   Point d’entrée : parcours et 36 points à examiner
├── README.md               Cet index
├── references/             Fiches transversales, une par point du guide
├── design/                 Système de design : référence, préférences, harmonisation
├── pages/                  Une fiche par page et par section importante
├── domaines/               Règles métier : permissions, rôles, navigation, structure
├── systeme/                Cartographie du code : architecture, routes, API, données, tests
├── exploitation/           Déploiement, sauvegarde, restauration, secrets
├── audits/                 Rapports datés et leurs preuves
├── propositions/           Feuille de route, plans, propositions, intentions historiques
└── methode/                Organisation, méthode d’audit, grille de revue, modèles, contribution
```

| Dossier | Point d’entrée | Rôle | Quand l’ouvrir |
| --- | --- | --- | --- |
| Fiches | [Guide général](REFERENCE_GENERALE.md#2-points-à-examiner) | Règles transversales : cadrage, accès, sécurité, données, formulaires, retours, tests… | Quand le point correspondant du guide est concerné |
| Design | [design/README.md](design/README.md) | Pages de référence, principes, fondations, composants, comportements, gabarits, [préférences](design/preferences.md), [harmonisation](design/harmonisation.md) | Toute interface |
| Pages | [pages/README.md](pages/README.md) | État courant, décisions et points ouverts de chaque page et section | Avant de toucher une page |
| Domaines | [domaines/README.md](domaines/README.md) | Permissions, rôles métier, navigation, structure juridique | Quand une règle métier est en jeu |
| Système | [systeme/README.md](systeme/README.md) | Ce qui existe dans le code et les constats `SYS-xx` | Avant de créer, modifier ou retirer une route, une API, un modèle ou un test |
| Exploitation | [exploitation/README.md](exploitation/README.md) | Procédures d’exécution, de sauvegarde et de reprise | Déploiement, sauvegarde, incident |
| Audits | [audits/README.md](audits/README.md) | Preuves datées des campagnes | Pour une preuve ou l’historique d’un périmètre |
| Propositions | [propositions/README.md](propositions/README.md) | Feuille de route, besoins futurs, plans et intentions avec statut | Avant de proposer ou reprendre une évolution |
| Méthode | [organisation documentaire](methode/organisation-documentaire.md) | Où écrire chaque information, [méthode d’audit](methode/audit.md), [grille de revue de page](methode/questions-revue-page.md), [modèles](methode/modeles/suivi-page.md), [contribution](methode/guide-contribution.md) | Pour documenter, auditer ou contribuer |

Consignes des agents : [AGENTS.md](../AGENTS.md) et [CLAUDE.md](../CLAUDE.md).
Installation : [README du projet](../README.md).

## Contrôle du référentiel

Depuis la racine, `bun run docs:check` lance le [contrôleur](../scripts/check-docs.mjs) :

- liens locaux, images et ancres de `AGENTS.md`, `CLAUDE.md`, `README.md`, de cet
  index, du guide général, de **tous** les documents de `docs/` (rapports
  d’audit et preuves compris) et des guides de la base
  (`packages/database/prisma/README.md`, `ROOT_RECOVERY.md`) ;
- chaque document de `references/` est relié depuis le guide ;
- chaque document de `references/`, `design/`, `domaines/`, `systeme/`,
  `exploitation/`, `propositions/` et `methode/` est accessible depuis les
  points d’entrée (aucun orphelin) ;
- chaque fiche de `pages/` est accessible depuis l’index des pages ;
- **chaque page de l’application** (`apps/web/src/app/**/page.tsx`) est citée
  par une fiche de `pages/` ;
- chaque rapport daté de `audits/` (`AAAA-MM-JJ-<périmètre>.md`) est relié
  depuis l’index des audits ;
- les liens utilisent des chemins relatifs avec la casse exacte, pour fonctionner
  aussi sous Linux.

Un lien valide ne prouve ni la justesse du texte ni une fonction livrée.
Utiliser des liens Markdown relatifs ; un chemin écrit entre backticks reste du
texte et n’est pas contrôlé. Les exemples dans des blocs de code sont ignorés.

`bun run docs:check:test` exécute les tests du contrôleur. Les deux commandes
font partie de `bun run check`, lancé par la [CI](../.github/workflows/ci.yml) ;
sa configuration ne prouve pas une exécution distante réussie.

Les dossiers de preuves des audits contiennent des scripts et des JSON qui
citent leur propre chemin : ne pas les renommer ni les déplacer.
