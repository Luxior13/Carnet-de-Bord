# Feuille de route — revue complète du 12 octobre 2026

## Périmètre et départ

Poursuite de la revue page par page demandée après les paramètres système.
Route `/systeme/feuille-de-route` : accès privé, présentation du catalogue,
recherche, filtres, URL, clavier, cartes et cohérence documentaire.
Départ propre au commit `f108f6c`, projet en développement.
Le [suivi courant](../pages/systeme/feuille-de-route.md) conserve les
décisions ; les anciens audits restent des photographies datées.

Le catalogue contient **39 chantiers**, **8 pôles cibles** et **6 étapes** :
33 chantiers à cadrer et 6 à compléter. Il ne promet ni dates de livraison ni
39 pages supplémentaires. Aucun module futur n'est activé par cette revue.

Intégration dans Next **15.5.23 en production**, Chromium et PostgreSQL 17
jetable : ports locaux `3121` et `54598`, base `roadmap_audit_test`, **52
migrations existantes appliquées**. Les comptes sont fictifs ; les sessions
sont créées par connexion et MFA réelles. Aucune base habituelle du projet utilisée.

## Sélection de la revue générale

| Sujets | Classement et justification |
| --- | --- |
| Q01–Q05 | À examiner : sens du plan, contenu, composition, accessibilité et recherche dans les 39 chantiers |
| Q06–Q07 | À examiner : saisie des filtres, remise à zéro, focus et compteur de résultats ; aucune mutation métier ni toast nécessaire |
| Q08 | Non applicable : aucun destinataire ni événement différé à notifier |
| Q09–Q10 | À examiner : frontière privée du layout, session et MFA ; paramètres d'URL et absence d'exposition des modules futurs |
| Q11 | Hors impact : aucune donnée personnelle dans le catalogue ; identité et sécurité de session restent au socle d'authentification |
| Q12–Q16 | Non applicables au catalogue : aucun stockage métier, migration, API propre, écriture concurrente, audit d'action ou suppression à ajouter |
| Q17–Q19 | À examiner : filtrage local, coût borné, responsabilité des données et réemploi des composants ; aucun cache ou service supplémentaire justifié |
| Q20–Q21 | Non applicables : aucune pièce, import ou export manipulé par cette page ; la matrice est une référence documentaire |
| Q22 | Non applicable : les étapes sont des priorités, pas des dates, durées ou périodes calculées |
| Q23–Q26 | Non applicables : intégrations, gouvernance, vie esport et finances sont décrites comme projets, sans traitement métier livré ici |
| Q27 | À examiner : distinguer catalogue testé, navigateur simulé et intégration authentifiée |
| Q28–Q29 | Hors impact : pas de nouveau service, configuration persistante, purge, sauvegarde ou procédure d'exploitation |
| Q30 | À examiner : cohérence entre catalogue, décisions, matrice, suivis et preuves ; aucune dépendance ajoutée |

## Composition et responsabilités retenues

- `PageIdentityHero` conserve le titre, le contexte et les trois compteurs.
  Les cartes regroupées par pôle conviennent à la lecture de descriptions et
  de prérequis. Un tableau de gestion, une pagination ou une barre
  d'enregistrement n'amélioreraient pas cette collection statique de 39 projets.
- Les surfaces de filtre et de section ainsi que les sélecteurs `compact`
  restent alignés sur le Répertoire. La recherche rejoint `ListSearchField`
  avec effacement partagé, tout en conservant son label visible associé.
- `Disclosure` porte les explications générales et les détails des cartes.
  Les cartes sont des articles identifiés par leur titre ; chaque commande
  de détail précise le chantier concerné dans son nom accessible.
- Le compteur donne un retour local ; `ContentState` explique une recherche
  vide et propose la remise à zéro. Aucun dialogue ni message différé ajouté.
- La recherche reste locale, insensible aux accents et à la casse, avec tous
  les termes requis et une limite de 200 caractères déjà présente avant cette
  passe. L'extraction `roadmap-search.ts` rend lecture, filtrage et correction
  d'URL testables sans déplacer le catalogue dans un service.
- Les données demeurent versionnées en code. Aucun besoin de table Prisma,
  d'éditeur de projets, de permission supplémentaire ou de fonctionnalité
  métier future n'a été démontré.

## Constats et corrections

| ID | Nature et impact | Correction / preuve | État |
| --- | --- | --- | --- |
| FDR-01 | Vérification historique manquante : le parcours privé n'avait été essayé qu'avec session et navigation simulées. | Huit scénarios Next/PostgreSQL réussis avec connexion MFA réelle, compte racine et compte USER, refus anonyme/cookie forgé/session périmée. Aucun défaut d'authentification trouvé dans cette passe. | Clos après vérification |
| FDR-02 · P2 | Après remise à zéro, le bouton devient désactivé ou disparaît de l'état vide ; aucun retour explicite du focus ne permettait de reprendre la saisie. | Retour à la recherche vérifié après les deux commandes de réinitialisation, à 320 et 1 440 px. | Clos après vérification client |
| FDR-03 · P2 | Les commandes de détail des 39 cartes portaient le même nom accessible, sans préciser le chantier lors d'une navigation par boutons. | Les 39 articles et commandes de détail sont nommés ; clavier et ouverture vérifiés dans Chromium. | Clos après vérification client |
| FDR-04 · P2 documentaire | `/activite/actualites` figurait dans le catalogue historique, mais manquait dans la table de correspondance de la matrice. | Ligne ajoutée ; comparaison des 57 destinations, chantiers, pôles et étapes sans écart. | Clos après vérification |

La migration vers le champ de recherche partagé est une harmonisation : le
label visible était déjà correctement associé à l'ancien champ. La limite
de 200 caractères existait aussi. Elles ne sont pas comptées comme des bugs
nouvellement corrigés. La normalisation locale fait maintenant coïncider
l'URL avec les filtres déjà affichés : recherche externe tronquée à 200
caractères, valeurs neutres ou invalides retirées, paramètres répétés réduits
à leur première valeur. Elle remplace l'entrée d'historique et conserve les
autres paramètres et l'ancre. Il s'agit d'une amélioration de cohérence, pas
de la correction d'une recherche auparavant illimitée.

## Vérifications exécutées

| Contrôle | Résultat et portée |
| --- | --- |
| Tests `roadmap-search`, `roadmap-card`, `list-controls`, `roadmap-catalog` | **20 tests réussis** : 7 recherche/URL, 2 cartes, 8 contrôles partagés et 3 catalogue. Ces derniers couvrent identités, références, socle partiel, graphe sans cycle ni prérequis d'étape ultérieure ; anciennes destinations réservées couvertes et absentes du menu actif |
| Comparaison catalogue / matrice | **39 lignes identiques** pour titre, pôle, étape, statut et prérequis ; **57 correspondances historiques** identiques après correction, sans omission, excédent ou doublon |
| TypeScript et lint ciblé | Réussis après les dernières modifications produit |
| Navigateur avec contexte simulé | **18 scénarios réussis**, dont 48 combinaisons pôle/étape et les 39 détails. [Protocole et preuves client](feuille-de-route-2026-10-12/banc-client/README.md) |
| Next avec authentification réelle | **8 scénarios réussis**. [Protocole d'intégration](feuille-de-route-2026-10-12/banc-integration/README.md), [résultats](feuille-de-route-2026-10-12/banc-integration/resultats.json) et [script](feuille-de-route-2026-10-12/banc-integration/run.cjs) |
| Suite web complète | **1 230 tests réussis**, 100 ignorés ; 107 fichiers, dont 101 réussis et 6 ignorés. Les variables des autres bases SQL dédiées n'étaient pas fournies ; ces scénarios ignorés ne sont pas des validations |
| Build, architecture et performance | Build de production, types, lint et budgets réussis. Taille gzip de la route : **268 308 octets** ; ce budget n'est pas une mesure de latence ni de capacité à grand volume |
| `bun run docs:check` | Réussi après mise à jour du rapport, des suivis et des index |

La comparaison documentaire a chargé le catalogue TypeScript réel, extrait
les lignes de la matrice et comparé leurs champs ; elle ne valide pas les
futures fonctions décrites. Les scripts de sauvegarde/restauration cités par
la carte Données existent ; cette revue ne rejoue pas une restauration.

Le banc client exerce les largeurs **320, 390, 768, 1 024, 1 440 et 1 920 px**,
recherche avec accents, mots multiples et critère de livraison, états vides,
effacement et label, clavier des menus/étapes/détails, historique précédent et
suivant, paramètres invalides ou répétés, recherche rapide et `StrictMode`.
Aucun débordement global ou de carte constaté. Couleurs forcées et taille de
police racine à 200 % sont essayées ; ce dernier cas n'est pas un zoom natif.
Le catalogue, les composants, les styles et l'historique du navigateur sont
réels ; session, cadre privé et abonnement Next à la navigation sont simulés.

L'intégration réelle exerce les largeurs **320, 390, 640, 768, 1 024, 1 440 et
1 920 px**, les filtres cumulés, précédent/suivant et rechargement, la saisie
rapide sans nouvelle requête de page/RSC, le retour depuis l'état vide, les
anciennes destinations et les paramètres atypiques rendus comme du texte.
Un compte USER sans permission administrative consulte le catalogue comme
prévu ; anonyme, cookie forgé et session réellement périmée n'accèdent pas à
la page privée. Les captures du cadre réel à
[390 px](feuille-de-route-2026-10-12/banc-integration/feuille-de-route-390.png)
et [1 440 px](feuille-de-route-2026-10-12/banc-integration/feuille-de-route-1440.png)
ont été inspectées. Aucun parcours d'un module futur n'est ouvert par ces liens.

## Verdict et limites

**Conforme sur le périmètre vérifié le 12 octobre 2026.**
Le catalogue et sa correspondance documentaire sont cohérents sur le périmètre
contrôlé. Les choix de priorité et les six socles existants sont conservés.
Les corrections d'interface sont vérifiées dans le banc client et les parcours
privés essentiels dans Next réel. **FDR-01 à FDR-04 sont clos** dans les limites
de leurs preuves ; aucun backend, modèle Prisma ou migration ajouté.

Les serveurs Next et PostgreSQL dédiés ont été arrêtés après validation.
Le dossier temporaire, les fixtures et les secrets de cette intégration ont
été supprimés ; seuls les scripts, résultats et captures expurgés sont conservés.

Pas de mesure de charge à grand volume ni de certification d'accessibilité
complète : lecteur d'écran, appareils physiques, zoom natif et extensions de
gestionnaire de mots de passe ne sont pas validés. La lecture du catalogue
ne prouve pas la livraison de ses projets.
Un changement de statut, de prérequis, de pôle ou de périmètre doit réexaminer
ensemble les décisions produit, le catalogue et la matrice.
