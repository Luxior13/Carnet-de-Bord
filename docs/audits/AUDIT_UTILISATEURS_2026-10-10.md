# Audit — Utilisateurs, liste — 10 octobre 2026

**État après correction : USR-09 à USR-17 corrigés et vérifiés.** L'analyse initiale
ci-dessous reste historique ; les corrections et leurs preuves figurent dans la
[validation des corrections](#validation-des-corrections). Les validations
complémentaires encore ouvertes sont maintenues dans le suivi propriétaire.

## Périmètre et état examiné

Demande : analyser `/systeme/utilisateurs`, dans la continuité du Répertoire
retenu comme référence visuelle et UX. **Analyse et documentation uniquement :
aucune correction du code produit dans cette passe.**

- Branche `main`, commit `2f8db36` ; arbre de travail propre au début de cette
  passe. Les corrections documentaires précédentes sont déjà dans ce commit.
- Sources : [page](../../apps/web/src/app/systeme/utilisateurs/page.tsx),
  [liste](../../apps/web/src/features/users/UsersListPage.tsx),
  [synthèse](../../apps/web/src/features/users/UsersOverview.tsx),
  [GET](../../apps/web/src/app/api/users/route.ts),
  [projection de visibilité](../../apps/web/src/shared/server/user-visibility.ts),
  composants partagés, modèle User et tests du périmètre.
- Windows, Bun 1.4.2, Next 15.5.23, React 19.1.8 ; Chromium 149.0.7827.55.
- Navigateur isolé : vrais composants de la page et CSS compilé depuis les
  sources courantes, police Geist locale. Session, API, routage et enveloppe
  d'authentification simulés ; sidebar représentée par sa largeur réelle de
  264 px, header de 56 px, défilement dans `main`.
- 60 comptes fictifs, pages de 25 puis dernière page de 10 ; identités longues,
  emails `example.test`, états et rôles variés. Profil délégué avec accès à la
  liste, au contact, à la sécurité et à la création, puis retrait de droits.
- Largeurs : 1 920, 1 440, 1 280, 1 120, 1 100, 1 024, 768, 390 et 320 px,
  hauteur de 900 px. Aucun débordement horizontal global mesuré.
- Suivi propriétaire : [Utilisateurs](../qualite/pages/systeme-utilisateurs.md).
  Les formulaires, mutations et onglets de fiche ne font pas l'objet d'un nouvel
  audit ; leurs liens entrants/de retour sont examinés.

`E2E_DATABASE_URL` est absente de l'environnement de cette passe. Aucun lancement
du scénario E2E qui prépare la base ; aucune donnée réelle consultée ou modifiée.
La session Next complète, la base PostgreSQL et le débit réel ne sont pas validés
par ce banc. Les dates relatives des captures dépendent de l'heure de l'essai.

## Sélection des sujets

Les fiches pertinentes ont été lues après la revue générale.

| Classement | Sujets et raison |
| --- | --- |
| À examiner | Q01–Q05 : besoin, parcours, socle visuel, accessibilité, liste/recherche/pagination |
| À examiner | Q07, Q09–Q12, Q14 : erreurs, droits, sécurité, confidentialité, modèle lu, API et réponses concurrentes |
| À examiner | Q17, Q19, Q22, Q27, Q28, Q30 : coût apparent, découpage, dates, preuves, diagnostic d'erreur, documentation |
| Non applicable | Q06 : aucune mutation sur cette liste, saisie des filtres couverte par Q05 ; Q08 : aucun événement durable à notifier |
| Non applicable | Q18 : pas de goulot mesuré justifiant un cache ; Q21, Q23, Q26 : aucun import/export, automatisation ou engagement financier |
| Hors impact | Q13, Q15, Q16, Q29 : aucune migration, écriture d'historique, suppression ou donnée persistante modifiée ; exclusion des comptes supprimés relue |
| Hors impact | Q20 : avatars locaux existants, aucun téléversement ; Q24–Q25 : comptes techniques, aucune modification d'entité juridique, personne ou équipe |

Profondeur sensible pour les frontières de visibilité. Le résultat reste partiel
sur la sécurité intégrée, malgré les tests de routes avec dépendances simulées.

## Éléments et scénarios examinés

| Élément / scénario | Observation | Preuve et limite |
| --- | --- | --- |
| Titre, description, création | Hero partagé, libellé clair ; création conditionnée par `users:create`, contexte de liste dans son lien | Code ; visibilité du bouton avec profil délégué observée. Création non exécutée |
| Recherche | 100 caractères, délai de 400 ms, Entrée et effacement ; normalisation casse/accents français et caractères LIKE échappés | Code et tests d'API ; recherche par nom complet limitée, voir USR-12 |
| État, rôle, tri, réinitialisation | Paramètres normalisés, page remise à 1 ; rôle appliqué et URL mise à jour ; Échap ferme le Select et rend le focus au déclencheur | Chromium simulé pour rôle/réinitialisation/Échap ; tri serveur relu et départage testé |
| Tableau et cartes | Liens natifs avec nom accessible complet, avatars, badges explicites, colonnes conditionnelles ; adaptation sans débordement global | Chromium ; défaut bloquant de largeur de la première colonne, USR-11 |
| Synthèse | Total, trois niveaux d'accès, états et compteur de mot de passe ; compteurs globaux indépendants des filtres | Code et Chromium ; encombrement USR-13, suggestion USR-16 |
| Pagination / rechargement | Page 2 de 25 lignes conservée au rechargement ; page 999 ramenée à 3 avec 10 lignes ; flèches 44 × 44 px à 320/390 px | Chromium, API simulée ; déplacement du contenu insuffisant, USR-15 |
| Arrivée par URL / retour | `page=2&search=Martin` restauré ; `returnTo` des liens de fiche conserve ces paramètres ; valeur relue et sécurisée dans la fiche | Chromium pour les liens et la restauration ; retour complet dans Next non exécuté |
| Résultat vide / réponse dépassée | « Aucun utilisateur trouvé » et réinitialisation ; réponse lente précédente sans écrasement du résultat vide suivant | Chromium avec réponses temporisées et annulées |
| Panne après succès / reprise | Alerte persistante, heure de dernière réussite et bouton Réessayer ; incohérence du contexte affiché USR-14 | Chromium avec statut 500 simulé |
| Refus 403 non JSON | Résultats et synthèse purgés malgré un corps non JSON | Chromium ; ne prouve pas le refus d'une vraie session |
| Changement des droits connus | Changement de portée remonte la liste sans anciennes lignes ; retrait de `users:view` affiche le refus | Chromium sur contexte simulé ; revalidation serveur couverte séparément par tests unitaires |
| Projection des données | Contact absent et non recherché sans droit ; sécurité neutralisée sans droit ; identité du compte protégé masquée pour les tiers | Tests d'API avec Prisma/session simulés ; aucune fuite confirmée dans ces scénarios |
| Dernière connexion | Absence, masquage, valeur invalide et date ancienne distingués ; année présente pour l'ancien | Tests de présentation ; heure exacte non consultable depuis la liste, amélioration éventuelle |
| Coût et architecture | GET paginé, aucun N+1 visible ; agrégations répétées et recherche intermédiaire d'identifiants ; composant de 1 067 lignes | Code ; aucune mesure de base ni d'impact réel du découpage |

Les éléments partagés pertinents sont `PageShell`, `PageCanvas`,
`PageIdentityHero`, `PageAsideLayout`, `DataTableSection`, `Select`, `Button`,
`Input`, `ContentState`, les badges et `directory.module.css`. Leur réutilisation
est cohérente ; elle ne suffit pas à garantir la bonne largeur d'un tableau dont
le nombre de colonnes varie selon les droits.

## Constats datés

Les identifiants sont suivis dans le document propriétaire. État à cette date :
**ouvert**, responsable **à attribuer** pour chacun. Les suggestions ne sont pas
des décisions de développement déjà prises.

### USR-11 — P1, défaut : noms invisibles à une largeur intermédiaire

Avec contact et sécurité visibles, les colonnes fixes occupent 760 px. Le tableau
bascule dès 768 px de largeur disponible. À une fenêtre de 1 120 px avec sidebar,
le tableau mesure 779,22 px et la cellule « Compte » seulement 19,22 px : le texte
du nom mesure **0 px**. L'avatar déborde sur l'accès et les en-têtes se chevauchent.
L'identification visuelle, tâche principale de la liste, devient impossible.

Sources : largeurs des `TableHead` dans `UsersListPage`, seuil de
`DataTableDesktop`, `table-layout: fixed` dans le CSS partagé.
Preuve : [capture 1 120 px](utilisateurs-2026-10-10/utilisateurs-1120.png).
Préserver une largeur utile à l'identité et adapter le seuil tableau/cartes aux
colonnes effectivement visibles. Rejouer profils avec/sans contact et sécurité,
identités longues, largeurs proches du seuil et zoom avant clôture.

### USR-12 — P2, limite fonctionnelle : recherche par nom complet

Pour prénom `Élodie`, nom `Martin`, identifiant `emartin`, la saisie
`Élodie Martin` devient `%elodie martin%`, recherché indépendamment dans chaque
champ. Aucun champ ne contient le nom complet ; l'ordre inverse échoue aussi.
Constat **déduit du SQL construit**, sans exécution PostgreSQL dans cette passe.
Le contrat historique acceptait la sous-chaîne par champ ; le Répertoire gère
maintenant les mots répartis entre prénom et nom.

Action proposée : définir la recherche multi-mots d'identité, puis adapter le GET
en conservant les restrictions du contact et du compte protégé. Vérifier en base
isolée noms composés, ordre inverse, accents et caractères spéciaux. Ne pas copier
les filtres métier Personnes dans les comptes.

### USR-13 — P2, défaut de composition : synthèse empilée trop haute

La carte garde **423,56 px** de hauteur, latérale ou empilée. À 390 px, la recherche
commence vers **699 px** dans l'enveloppe simulée ; le premier compte atteint le
bas de la fenêtre de 900 px. À 1 440 px, la recherche commence vers 647 px.
Le passage sous le seuil du rail, 118 rem, conserve toutes les sections verticales.

Preuves : [mobile](utilisateurs-2026-10-10/utilisateurs-390.png),
[1 440 px](utilisateurs-2026-10-10/utilisateurs-1440.png).
Prévoir une présentation compacte lorsque la synthèse est empilée, en reprenant
le principe du Répertoire et en l'adaptant aux statistiques des comptes.

### USR-14 — P2, défaut : contexte ambigu des anciennes données après erreur

Reproduction : charger la page 2, sélectionner Administrateurs, faire échouer le
GET suivant. Le filtre et l'URL indiquent `role=ADMIN`, la pagination « Page 1 sur
3 », mais les lignes restent celles de la page 2 sans filtre, y compris des
Utilisateurs. L'alerte signale l'ancienneté sans donner les anciens critères/page.

Preuve : `staleAfterError` dans les [résultats](utilisateurs-2026-10-10/resultats.json)
et [capture d'erreur](utilisateurs-2026-10-10/erreur-filtre.png).
Conserver avec la dernière réponse son contexte, puis l'identifier explicitement,
ou masquer les lignes lorsque les critères/page ont changé et que la requête a
échoué. Rejouer changement de filtre, pagination, échec et reprise.

### USR-15 — P2, défaut de parcours : changement de page en bas de liste

Cliquer Page suivante depuis le bas charge bien les comptes 26–50, mais `main`
reste défilé à **1 469 px** dans l'essai desktop. Les premières nouvelles lignes
restent hors écran. Aucun déplacement vers les résultats n'est prévu dans le code.
Action : définir une reprise du défilement vers les résultats avec focus et annonce
adaptés au clavier, sans remonter inutilement au-dessus de la grande synthèse.

Concernant le retour de fiche : filtres/page sont transmis, mais la liste ne
mémorise pas le défilement ou la ligne focalisée. Le lien de son propre compte
va simplement à `/mon-compte`, sans `returnTo`. Ce sont des **points de parcours
à compléter/vérifier dans Next**, pas des pertes de position démontrées par ce
banc de routage simulé. Le Répertoire fournit un principe de restauration à adapter.

### USR-16 — P2, suggestion : synthèse globale et accès aux sous-ensembles

Clarifier visuellement que les compteurs sont globaux ; envisager des liens de
filtrage utiles comme au Répertoire. Aujourd'hui ce sont des `div`, sans action.
Définir les ensembles avant de rendre les chiffres cliquables : `role=ADMIN`
inclut techniquement le compte protégé, alors que le compteur « Administrateur »
le déduit pour le compter séparément comme « Superadmin ». Un lien naïf donnerait
un nombre de résultats différent du chiffre annoncé.

Reprise : prochain travail sur la synthèse, si l'usage de ces raccourcis est retenu.
Les chips génériques de filtres (USR-09) restent également une suggestion ; leur
absence n'est pas un défaut bloquant de conformité au Répertoire.

### USR-17 — P2, dette : responsabilités concentrées dans la liste

`UsersListPage.tsx` fait 1 067 lignes, sous son exception de budget de 1 100.
Il réunit synchronisation URL, chargement, permissions d'affichage, filtres,
tableau, cartes et pagination. Les tests de contrat de source vérifient certains
fragments JSX mais ne détectent pas USR-11 ou USR-14.
À la prochaine correction, extraire seulement les responsabilités qui facilitent
la validation : état/chargement, barre de filtres, cellules/cartes. Ajouter des
régressions comportementales pour les défauts corrigés ; aucun relèvement de
budget ou découpage mécanique pour le seul nombre de lignes.

## Contrôles exécutés et limites

Depuis `apps/web` :

```powershell
bun run test src/__tests__/users-list-presentation.test.ts src/__tests__/admin-users-list-a11y-contracts.test.ts src/__tests__/users-access-hardening.test.ts src/__tests__/api-auth.test.ts src/__tests__/permissions.test.ts src/__tests__/default-page-size-ux-contracts.test.ts src/__tests__/design-system-contracts.test.ts src/__tests__/server-page-auth.test.ts
bun run typecheck
bunx eslint src/features/users/UsersListPage.tsx src/features/users/UsersOverview.tsx src/features/users/users-list.utils.ts src/app/systeme/utilisateurs/page.tsx src/app/api/users/route.ts
bun run check:architecture
```

- **225 tests réussis dans 8 fichiers**, exécution directe sans cache Turbo.
  La suite de durcissement couvre aussi des routes voisines ; ce nombre n'est pas
  celui de 225 scénarios navigateur de la liste.
- **TypeScript et lint ciblé réussis.**
- **Documentation réussie** : `bun run docs:check`, 175 fichiers et 871 liens
  locaux/index contrôlés ; `git diff --check` sans erreur d'espacement.
- **Architecture échouée** : `components/ui/sidebar.tsx`, 925 lignes pour 900.
  Dépassement préexistant, extérieur à la liste ; aucun verdict global vert.
- Chromium : neuf largeurs, interactions décrites ci-dessus, aucune erreur
  JavaScript capturée. [Mesures et scénarios](utilisateurs-2026-10-10/resultats.json).
  Le banc temporaire utilise esbuild, les dépendances locales et des réponses
  fictives ; après un refus de lecture des dossiers parents dans le bac à sable,
  son lancement local autorisé a permis les contrôles. Banc retiré après usage.
- Aucun nouveau build Next, benchmark PostgreSQL, E2E authentifié, lecteur
  d'écran, Safari réel ou zoom natif exécuté. Les mesures ne certifient pas
  l'accessibilité complète ni les performances de production.

Le GET courant fait au maximum **8 opérations de liste/statistiques avec
recherche et droit de sécurité**, hors authentification : 7 dans le groupe
principal, plus la recherche SQL intermédiaire. Les anciennes mentions de neuf
opérations et de statistiques inutilisées ne décrivent plus cette version.
Tous les champs statistiques retournés alimentent la synthèse. La recherche
récupère toutefois tous les identifiants correspondants avant la pagination
`findMany` : coût à mesurer sur un volume représentatif (USR-02/USR-03).

## Verdict

**Corrections nécessaires**, en priorité USR-11. Le style commun constitue une
bonne base, mais le rendu intermédiaire, la densité de la synthèse et quelques
parcours ne sont pas encore au niveau du Répertoire. Les garde-fous testés sont
conservés : URL, réponse dépassée, purge sur refus et projections de champs.

Conclusion partielle sur l'intégration réelle. Les points ouverts et les
décisions courantes sont maintenus dans le [suivi propriétaire](../qualite/pages/systeme-utilisateurs.md).
Reprendre les scénarios concernés après correction, puis effectuer la validation
avec session/base isolées avant de déclarer la page globalement validée.

## Validation des corrections

Passe du 10 octobre 2026, après la demande « corrige tout ». Les défauts USR-11
à USR-15 et la dette USR-17 sont corrigés ; les améliorations USR-09 et USR-16
sont retenues et livrées. Les cartes radio de création sont également réconciliées
avec les primitives partagées (USR-10). Q06 est donc réactivé pour ce contrôle
de formulaire, sans changement des mutations. Q02 inclut le retour de Mon compte
et le squelette de fiche. Les autres sujets sélectionnés restent applicables.

### Corrections et preuves

| Point | Résultat implémenté | Preuve nouvelle |
| --- | --- | --- |
| USR-09 | Chips de recherche, état et rôle effaçables individuellement | Filtre de rôle affiché puis retiré dans Chromium ; composants partagés conservés |
| USR-10 | `Label`/`Input` partagés pour les cartes radio, association explicite et focus visible | `shadcn-boundaries` réussi ; sélection Administrateur au clavier avec Espace et `focus-within` observé |
| USR-11 | Seuils de tableau selon les quatre combinaisons de colonnes autorisées ; cartes avant manque de place pour le nom | Neuf largeurs ; quatre profils mesurés près de leur seuil, identité de 303 à 369 px ; [1 120 px corrigé](utilisateurs-2026-10-10/corrections/utilisateurs-1120.png) |
| USR-12 | Chaque mot de recherche peut correspondre à un champ d'identité différent ; email seulement selon les droits | 10 tests sur PostgreSQL réel : accents, ordre inverse, noms composés, caractères LIKE littéraux, contact autorisé/interdit, identité protégée, suppression logique ; nom complet exercé dans Chromium |
| USR-13 | Synthèse globale en grille compacte sous le seuil du rail | À 390 px : 235 px de haut, recherche à 511 px ; à 1 440 px : 180 px de haut, recherche à 403 px. [Mobile corrigé](utilisateurs-2026-10-10/corrections/utilisateurs-390.png) |
| USR-14 | Réponse attachée aux critères qui l'ont produite ; lignes/pagination masquées si ce contexte diffère | Page 2 → filtre Administrateur → erreur 500 : aucune ancienne ligne présentée ; Réessayer charge le filtre. [Erreur corrigée](utilisateurs-2026-10-10/corrections/erreur-filtre.png) |
| USR-15 | Pagination vers le début des résultats ; instantané de position/focus ; retour sécurisé de fiche et Mon compte, y compris pendant le chargement de fiche | Résultats à 56,42 px pour un `main` commençant à 56 px ; retour fiche avec page 2 et défilement 474 → 474 px, lien refocalisé ; retour Mon compte exercé ; 10 tests de normalisation/portée/expiration de navigation |
| USR-16 | Compteurs explicitement globaux et cliquables ; catégories Superadmin/Administrateur/Utilisateur exclusives | Le compteur Administrateurs et le GET filtré valent tous deux 20 ; le compte protégé est absent de ce sous-ensemble et reste masqué pour un tiers |
| USR-17 | Page séparée du contrôleur, des filtres, des résultats et de la navigation ; ancienne exception de 1 100 lignes retirée | Environ 220 lignes pour la page ; suite web, compilation et budget structurel réussis |

Le dépassement partagé de `components/ui/sidebar.tsx` est corrigé par extraction
de son contexte et du suivi de viewport. API publique et seuil mobile de 1 024 px
conservés, contrats sidebar réussis ; aucun seuil de budget relevé.

### Environnement et scénarios

- **Vrai serveur Next 15.5.23 de production**, sur port local réservé à ce banc,
  CSS, Geist, shell, routage, autorisations serveur et API du dépôt.
- **PostgreSQL 17 isolé**, base locale jetable `users_list_test`, 51 migrations
  appliquées, 61 comptes fictifs. Sessions de test insérées pour un compte
  délégué et le compte protégé, avec données de fixture nécessaires aux contrôles
  de session. Aucun accès à la base applicative, aucune donnée utilisateur réelle.
- Chromium 149.0.7827.55, hauteur 900 px ; largeurs 1 920, 1 440, 1 280, 1 120,
  1 100, 1 024, 768, 390 et 320 px. Aucun débordement horizontal mesuré dans
  le document ou `main`. Flèches de pagination 44 × 44 px à 320 et 390 px.
- Profils sans contact/sécurité, sécurité seule, contact seul et les deux :
  mesure de la première colonne à 1 120/1 200/1 280/1 440 px. Refus réels
  403 sans `users:view`, 401 sans session, contact non projeté ni recherché
  sans droit et filtre de sécurité refusé sans droit.
- Recherche par nom complet et accents, filtre depuis compteur, fermeture
  du Select avec Échap et restitution du focus, page 2/rechargement,
  page hors limites ramenée à la dernière, résultat vide, retour fiche/Mon compte.
- Panne 500 et refus 403 non JSON injectés après réussite : reprise et purge
  contrôlées. Réponse précédente retardée de 900 ms : aucun écrasement du
  nouveau résultat vide. Les erreurs et délais injectés ne sont pas présentés
  comme de vraies pannes d'infrastructure.
- Aucune erreur JavaScript capturée. Les captures conservent uniquement les
  comptes fictifs ; les [résultats détaillés](utilisateurs-2026-10-10/corrections/resultats.json)
  décrivent les mesures et scénarios exécutés.

### Commandes et limites

Depuis `apps/web`, avec les variables de test isolées pour le build et le serveur :

```powershell
$env:USERS_LIST_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:55439/users_list_test'
bun run test
bun run build
bun run lint
bun run check:architecture
bun run check:performance
```

- Suite web sans cache Turbo : **1 018 tests réussis, 15 ignorés** ; 84 fichiers
  réussis, un ignoré. Les 15 tests ignorés sont ceux du Répertoire PostgreSQL,
  faute de `PERSONS_LIST_TEST_DATABASE_URL`, sans rapport avec la recherche Users.
  Les dix tests PostgreSQL Utilisateurs ont bien été exécutés.
- **Build Next, types, lint, architecture et budget de build réussis.**
  Le découpage supprime le dépassement préexistant ; ce résultat remplace le
  verdict d'architecture de l'analyse initiale pour cet état corrigé.
- `bun run docs:check` réussi : 175 fichiers et 879 liens locaux/index contrôlés.
  `git diff --check` réussi après réconciliation des suivis.
- Serveur Next et instance PostgreSQL du banc arrêtés, fichiers et base jetables
  retirés après les essais ; captures et résultats fictifs conservés dans cet audit.

Les sessions préparées permettent de vérifier le parcours privé et les droits
serveur ; elles **ne valident pas la saisie de connexion ni le défi MFA**.
Les mutations de création, profil et sécurité n'ont pas été exécutées ici.
Pas de benchmark de charge sur volume représentatif, de lecteur d'écran,
de Safari réel, d'appareil physique ni de zoom natif. Les coûts et la collecte
intermédiaire d'identifiants de recherche restent à mesurer (USR-02/USR-03),
sans ajouter de cache ou d'index sur la seule base des 61 comptes de test.

Les défauts de liste corrigés sont clos sur ces preuves ; les décisions
d'exploitation, les responsables et les contrôles complémentaires restent dans
le [registre propriétaire](../qualite/pages/systeme-utilisateurs.md#registre-des-points-et-déclencheurs).
