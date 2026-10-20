# Liste des utilisateurs

[Index des pages](../../../pages/README.md) · [Utilisateurs](README.md) · [Design](../../../design/README.md) · [Guide général](../../../REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/systeme/utilisateurs` |
| Espace | Système |
| Gabarit visé | [A. Liste de gestion](../../../design/gabarits.md#a-liste-de-gestion) |
| État d’harmonisation | Page de référence, complément du Répertoire (validée le 17 octobre 2026), alignée le 20 octobre 2026 sur les filtres rapides — voir [Harmonisation](../../../design/harmonisation.md#état-par-page) |
| Point d’entrée | [page.tsx](../../../../apps/web/src/app/systeme/utilisateurs/page.tsx) → [UsersListPage](../../../../apps/web/src/features/users/UsersListPage.tsx) |
| Contrôle d’accès | `users:view` (page et `GET /api/users`) ; colonnes contact `users:view_contact`, sécurité `users:view_security` ; création `users:create` |
| Chargement / erreur dédiés | oui, `UsersDirectorySkeleton` / commune à l’application |

## Rôle et tâches principales

Retrouver un compte par son nom, son identifiant ou son état, comparer accès,
état et dernière connexion, puis ouvrir sa fiche ou créer un compte selon ses
droits. Critère de réussite : le bon compte est trouvé sans afficher une donnée
non autorisée, et le retour de fiche retrouve le contexte de la liste.

## Composition actuelle

- Bandeau `PageIdentityHero` avec description et action « Nouvel utilisateur ».
- `DataTableSection` et `directory.module.css` : `ListSearchField` à
  gauche ; à droite, réinitialisation (place réservée quand elle est masquée,
  sauf sous 640 px) puis tri, qui affleure le bord droit.
- En dessous, deux groupes de filtres rapides (`$ui/quick-filter`), chacun
  précédé de son libellé : « État » (Tous, Actifs, Désactivés, Mot de passe à
  changer) et « Rôle » (Superadmin, Administrateurs, Utilisateurs), nommés
  « Filtrer par état » et « Filtrer par rôle » pour les lecteurs d’écran ;
  nombre de comptes trouvés à droite.
- Plus de carte de synthèse ni de rail (20 octobre 2026) ; tableau puis cartes
  selon la largeur et les colonnes autorisées, `ListPagination` (25 lignes).
- États : squelette, lignes en attente pendant un chargement, vide, erreur avec
  reprise, accès refusé.

## Décisions retenues

Décisions détaillées dans [Décisions courantes](#décisions-courantes) ; en résumé :

- Référence visuelle complémentaire du Répertoire, confirmée par le
  propriétaire le 17 octobre 2026 : couleurs aux bons endroits, informations
  claires, densité satisfaisante ([préférences](../../../design/preferences.md)).
- Trois catégories d’accès exclusives (Superadmin, Administrateur, Utilisateur) ;
  fond d’avatar par accès : rouge clair, ambre, bleu clair.
- Recherche, filtres, tri et pagination côté serveur ; seuils du tableau selon
  les colonnes autorisées (48, 52, 56 ou 64 rem).
- Retour de fiche : critères, page, position et lien focalisé restaurés par un
  instantané d’onglet limité à 30 minutes et lié au compte et aux droits.
- Filtres rapides (20 octobre 2026, standard des listes validé sur le
  Répertoire) : l’état garde « Tous » et un seul choix ; chaque rôle est un
  interrupteur, un second appui le retire. Les deux se combinent avec la
  recherche, qui reste appliquée. Compteurs à facettes, toujours affichés :
  chaque état compte avec la recherche et le rôle choisi, chaque rôle avec la
  recherche et l’état choisi (`buildUsersStatsQuery`). « Mot de passe à
  changer » reste réservé à `users:view_security`.
- Le champ dit ce qu’il cherche : « Nom, identifiant ou email… » ou « Nom ou
  identifiant… » selon `users:view_contact`, avec le même nom accessible.
- Plus d’étiquettes de filtres actifs ni de mention « 25 par page » : le bouton
  enfoncé, le champ et la pagination portent déjà ces informations.
- Focus : un seul anneau, celui de la ligne quand son lien a le focus clavier.

## Points ouverts

Registre complet : [Registre des points et déclencheurs](#registre-des-points-et-déclencheurs).

| ID | Nature / priorité | État | Point et prochaine vérification |
| --- | --- | --- | --- |
| USR-26 | Composition, P2 | Clos | Carte « Vue d’ensemble » (environ 180 px) et menus État et Rôle remplacés par deux groupes de filtres rapides ([HARMO-06](../../../design/harmonisation.md#constats)) |
| USR-27 | Harmonisation, P2 | Clos | Étiquettes de filtres actifs (recherche, état, rôle) retirées : redondantes avec le champ et les boutons enfoncés |
| USR-28 | Composition, P3 | Clos | Tri décalé du bord droit par la place réservée à la réinitialisation ; mention « 25 par page » retirée (`pageSize` supprimé du contrôleur) |
| USR-29 | Libellés, P3 | Clos | Champ « Rechercher… » dont le périmètre n’était donné que par une infobulle `title` ; texte d’exemple et nom accessible explicites |
| USR-30 | Accessibilité, P2 | Clos | Anneau de ligne aussi au clic souris (`focus-within`) ; désormais au seul focus clavier du lien ; tailles `text-[11px]` / `text-[13px]` normalisées |
| USR-31 | États, P3 | Clos | Chargement des résultats en bloc unique ; lignes `UsersListRowsSkeleton` partagées avec le squelette de page |
| USR-04 | Capacité | Ouvert, conditionnel | Revoir curseur ou taille de page si 1 000 pages deviennent nécessaires |
| USR-05 | Accessibilité | À vérifier | Lecteur d’écran, appareils réels et zoom natif |
| USR-06 | Compatibilité | À vérifier | Graisses dans WebKit, à comparer dans Safari réel |
| USR-07 | Confidentialité | À qualifier | Finalité, responsable et conservation du traitement des comptes |
| USR-08 | Exploitation | À attribuer | Responsables et fréquence de suivi |

## Références

- [Page Utilisateurs](../../../domaines/permissions.md#page-utilisateurs) et fiche [Permissions](../../../references/permissions.md)
- [Listes, recherche, filtres et pagination](../../../references/listes-recherche.md)
- Audits : [26 septembre 2026](../../../audits/2026-09-26-ui-utilisateurs.md), [10 octobre 2026](../../../audits/2026-10-10-utilisateurs.md), [11 octobre 2026](../../../audits/2026-10-11-utilisateurs.md)
- Banc client de la reprise : [20 octobre 2026](../../../audits/utilisateurs-2026-10-20/banc-client/README.md)

## Historique

- 26 septembre 2026 : suivi amorcé avec la passe de clôture de la liste.
- 10 et 11 octobre 2026 : alignement sur le Répertoire, puis revue approfondie.
- 19 octobre 2026 : fiche propre à la liste, créée par découpage du suivi du module.
- 20 octobre 2026 : reprise en profondeur, alignement sur les filtres rapides
  du Répertoire (HARMO-06), USR-26 à USR-31 clos.

## Revues datées

Sections déplacées le 19 octobre 2026 depuis l’ancien suivi du module, sans
modification de leur contenu. Elles conservent leur date, leur portée et leurs
preuves ; la synthèse ci-dessus porte l’état courant.

### Reprise en profondeur — 20 octobre 2026

Deuxième page de la reprise générale, après la liste du Répertoire, à la
demande du propriétaire (« on passe à la prochaine page », « passe à cette
page »). Le standard des listes validé le même jour sur le Répertoire s’applique
par défaut aux pages du même gabarit : la correction attendue était déjà
consignée (HARMO-06).

- **Avant** : banc du 11 octobre rejoué sur le code de départ, 42 scénarios sur
  42 ; captures [390 px](../../../audits/utilisateurs-2026-10-20/banc-client/avant-users-390.png)
  et [1 440 px](../../../audits/utilisateurs-2026-10-20/banc-client/avant-users-1440.png).
- **Constats** : USR-26 à USR-31 ci-dessus.
- **Rôle en filtres rapides** : choisi pour garder ses compteurs, visibles
  jusqu’ici dans la synthèse ; confirmé par le propriétaire
  ([PREF-Q2](../../../design/preferences.md#questions-tranchées)).
- **Revue du rendu réel** : sur demande d’avis du propriétaire, deux défauts
  relevés dans la ligne de filtres : « Tous » enfoncé semblait contredire un
  rôle enfoncé, et l’état enfoncé se voyait mal. « Ok go » : libellé visible
  devant chaque groupe à la place du filet, état enfoncé en bordure et texte
  d’accent, sur les deux listes. Bancs rejoués en entier, 42 et 41 scénarios.
- **Compteurs à facettes** : retour du propriétaire, « dès que je sélectionne,
  les compteurs s’enlèvent et tout décale ». `GET /api/users` renvoie
  désormais des `stats` à facettes au lieu de compteurs globaux ; la barre
  les affiche toujours. Le banc vérifie qu’un bouton ne bouge pas quand on
  retire un rôle (42 sur 42). Attentes de `users-list-postgres.test.ts`
  étendues aux facettes, **non exécutées** faute de PostgreSQL local (corrigé à
  vérifier).
- **Livré** : `UsersListToolbar` (deux groupes, tri au bord droit, champ
  explicite), `UsersListPage` sans `PageAsideLayout`, `UsersOverview` et ses
  styles supprimés, `UsersListResults` (anneau, tailles), squelettes alignés,
  `pageSize` retiré de `useUsersList`. Le bouton de filtre rapide devient le
  composant partagé `$ui/quick-filter`, adopté aussi par le Répertoire.
  Règle `overviewMetric` morte retirée de `directory.module.css`.
- **Régression corrigée au passage** : depuis le déplacement de la
  réinitialisation avant le tri (même jour), la place réservée décalait le menu
  de tri vers la droite sous 640 px, sur les deux listes. Elle n’est plus
  réservée sur téléphone.
- **Vérifié** : types, lint, format, budget d’architecture, Vitest complet avec
  le nouveau `users-list-toolbar.test.ts` (compteurs, interrupteurs, droits) et
  le contrat d’accessibilité mis à jour ;
  [banc client](../../../audits/utilisateurs-2026-10-20/banc-client/README.md)
  42 scénarios sur 42, et banc du Répertoire rejoué, 41 sur 41.
- **Non vérifié** : session, hydratation Next et PostgreSQL réels (aucun
  changement serveur), lecteur d’écran réel, rendu sur le serveur de dev.

### Revue approfondie — 11 octobre 2026

Nouvelle passe demandée après celle du Répertoire, en contexte développement.
Périmètre : liste, GET, schéma utile à sa lecture, navigation, comportements,
droits, coût serveur et refactorisation. Le [rapport du jour](../../../audits/2026-10-11-utilisateurs.md)
distingue les corrections, preuves et limites ; il ne remplace pas les audits
propres aux mutations de création et de fiche.

Décisions courantes complémentaires :

- Recherche et pagination restent dans PostgreSQL : aucune collecte de tous
  les identifiants correspondants dans l'application. Le service de lecture
  réalise deux requêtes, une pour page/total filtré, une pour synthèse globale.
  Les droits et projections HTTP restent contrôlés dans la route.
  Les alias publics du compte protégé acceptent aussi mots inversés et espaces
  multiples ; ils ne sont jamais mélangés à son identité privée pour un tiers.
- Pendant une pagination, conserver les dernières lignes, leur numéro et leur
  total tant que les critères sont identiques ; une réponse pour d'autres
  critères n'est pas réaffichée sous le nouveau filtre. Une erreur est explicite.
- La pagination ajoute une entrée d'historique. Les critères sont normalisés,
  les filtres consomment la saisie courante et les paramètres inutiles disparaissent.
- Reset et retrait d'un filtre rendent le focus à la recherche. Réessayer mène
  aux résultats après réussite ; un nouvel échec permet de réessayer au clavier.
  Une saisie différente annule une ancienne intention de repositionnement.
- Retour de fiche et rechargement peuvent restaurer le lien actuellement
  focalisé ; il doit appartenir à la liste, être visible et interne. L'instantané
  reste unique, limité à 30 minutes et lié au compte, aux droits et aux critères.
- Les noms accessibles des compteurs incluent leur valeur ; « Identité protégée »
  reste lisible au clavier et au tactile. Une donnée masquée est distinguée
  d'une donnée absente. Les cartes conditionnent explicitement l'email aux droits,
  comme le tableau, et réutilisent le jeton de focus commun.
- Aucun nouveau modèle, index, migration, cache ni dépendance n'est nécessaire.
  Le schéma User est valide et ses 19 contrôles SQL ciblés passent dans la base
  isolée migrée. Les données habituelles du projet n'ont pas été modifiées.

**Liste conforme sur le périmètre vérifié ; USR-18 à USR-25 clos.**
1 145 tests web réussis (18 tests SQL Personnes ignorés), 42 scénarios client
simulés puis reprise ciblée du retour de fiche, dix parcours réels sur
Next/MFA/PostgreSQL et 33 mesures de scénarios serveur jusqu'à 10 000 comptes.
Build, types, lint, budgets et documentation vérifiés. Les limites d'appareils,
de charge et de mutations hors périmètre restent explicites dans le rapport.

### Décisions courantes

- Les flèches de pagination ont une cible de 44 px sous 640 px, mesurée aussi
  sur Utilisateurs à 320 et 390 px pendant la correction du 10 octobre.
- Titre compact, description « Gérez les comptes et leurs accès. » en texte secondaire.
- Création dans le hero de la page, adaptée aux droits.
- Sidebar ancrée à gauche ; rail indépendant à droite lorsque la place le permet.
- Largeur de travail privilégiée aux tailles intermédiaires ; centrage écran sur
  grand écran ; adaptation en cartes selon la largeur réelle.
- Seuils de tableau propres à cette liste, selon les colonnes autorisées :
  48 rem sans contact/sécurité, 52 rem avec sécurité, 56 rem avec contact,
  64 rem avec les deux. La colonne Compte conserve au moins 260 px au seuil ;
  les primitives partagées de tableau/cartes et leurs alternances restent utilisées.
- Synthèse globale compacte en grille lorsqu'elle est empilée, rail vertical
  à partir de 118 rem. Ses liens ouvrent un sous-ensemble exact en effaçant
  les autres filtres et la page, tout en conservant le tri. **Remplacé le
  20 octobre 2026** par les filtres rapides, qui se combinent.
- Trois ensembles d'accès exclusifs : Superadmin (`isProtected`),
  Administrateur (ADMIN non protégé), Utilisateur (USER non protégé).
  Le filtre `role=SUPERADMIN` est une catégorie de liste, pas un nouveau rôle
  persistant ni une nouvelle permission.
- Filtres actifs de recherche, état et rôle effaçables individuellement
  (**remplacé le 20 octobre 2026** : boutons enfoncés et champ de recherche).
  Après pagination, défilement et focus reviennent au début des résultats.
  Le retour d'une fiche ou de Mon compte retrouve critères, page, position et
  lien focalisé. Un seul instantané de navigation par onglet, valide 30 minutes,
  est lié au compte, aux droits et aux critères, puis effacé après restauration.
  Il contient l'URL de recherche (donc les termes saisis), la portée technique,
  la position et le lien cible ; aucune copie des lignes de réponse.
- Palette bleue proche de la sidebar, badges discrets sans fond coloré dominant.
- Fond des avatars de compte selon l'accès (demande du 10 octobre 2026) :
  Superadmin rouge clair (`destructive`), Administrateur ambre (`warning`),
  Utilisateur bleu clair (`info`). Seul le fond change ; dessin DiceBear et
  graine d'identité sont conservés. Le libellé d'accès reste explicite dans son
  badge. Règle portée par `UserAvatar`, également utilisée dans la fiche,
  la confirmation de création, Mon compte et la sidebar ; avatars Personnes distincts.
- Recherche, filtres, tri et pagination serveur ; la liste n’affiche pas tous les
  comptes à la fois. Permissions effectives décrites dans [Permissions](../../../domaines/permissions.md).
- Aucun nouveau toast ou événement durable n’est nécessaire pour simplement lire
  la liste ou changer un filtre. Les événements de sécurité des autres parcours
  conservent leurs règles propres.
- Les comptes ne sont pas les fiches Personnes du Répertoire.

### Conclusion de la passe de clôture — 26 septembre 2026

Les corrections identifiées dans cette passe sont vérifiées localement. Le rendu
retenu est conservé ; cette revue n’impose pas une nouvelle refonte visuelle.
La page n’est pas certifiée « parfaite » : l’intégration avec des sessions et une
base réelles, la capacité SQL et l’accessibilité complète restent à vérifier.
Le détail et le formulaire de création nécessitent leur propre revue.

#### Défauts corrigés

| Constat | Correction | Vérification de cette passe |
| --- | --- | --- |
| Les comptes à égalité de nom/date n’avaient pas de départage unique entre pages | Identifiant ajouté comme dernier critère aux trois tris serveur | Tests des requêtes de liste pour chaque tri ; exécution SQL réelle non rejouée |
| Un refus 401/403 pouvait conserver les résultats précédents | Suppression locale des lignes, statistiques, pagination et date de fraîcheur, avant même de lire le corps d’erreur | Chromium : 403 JSON et 401 non JSON après un succès |
| Des coordonnées ou signaux de sécurité chargés avant une modification de droits pouvaient subsister | Nouvelle instance de liste lorsque l’identité ou les droits de lecture des champs changent ; requête précédente annulée | Chromium : droits retirés puis serveur indisponible ; aucune ancienne donnée affichée. Droits inchangés : aucune requête supplémentaire |
| Un échec de changement de page associait les anciennes lignes au nouveau numéro | Pagination attachée à la dernière réponse réussie ; nouvelle tentative sur la page demandée | Chromium : échec de page 2, maintien de « 1–20 sur 43 », puis succès « 21–40 sur 43 » |
| Le total trouvé était présenté comme entièrement « affiché », y compris après une erreur | Libellé « trouvé », état « Résultats non actualisés » et date de dernière réussite | Chromium : succès, erreur, nouvelle tentative, aucun résultat |
| Une URL ou un grand total pouvait proposer des pages dépassant la borne serveur | Client borné à 1 000 pages ; invitation explicite à affiner la recherche au-delà | Chromium : URL page 999999 et total simulé de 30 001 comptes ; page 1000 maximale, bouton Suivant désactivé |
| Une connexion masquée était annoncée « Jamais » ; une ancienne date ne précisait pas l’année | « Masquée » distinct de « Jamais » et « Indisponible » ; année sur les dates anciennes ou d’une autre année | Tests de présentation et lecture du rendu Chromium |
| La recherche promettait l’email sans droit de consultation ; l’email autorisé manquait en cartes | Aide de recherche adaptée aux droits et adresse visible en présentation mobile | Tests de permissions de présentation ; Chromium avec et sans droit de contact |

Ces corrections restent dans la liste, ses aides de présentation et son GET.
Aucune mutation de compte, migration, dépendance ou nouvelle permission.

### Sélection des 30 sujets

« À examiner » désigne le classement de sélection ; la colonne suivante indique
le résultat de cette passe. Les validations par simulation ne valent pas une
validation de l’intégration réelle.

| ID | Classement | Résultat et décision adaptée à cette page |
| --- | --- | --- |
| Q01 | À examiner | **Examiné dans le code** : retrouver et consulter les comptes ; accès à la création selon les droits. Périmètre limité à la liste. |
| Q02 | À examiner | **Examiné dans le code** : liens natifs, contexte dans l’URL et `returnTo` contrôlé sur la collection ; compte courant vers Mon compte. Parcours réel vers les destinations encore à vérifier. |
| Q03 | À examiner | **Validé partiellement** : cinq largeurs sans débordement dans le banc Chromium. Palette, badges, contours, survols et densité héritent des contrôles visuels datés ; aucune nouvelle validation complète de police/couleur revendiquée. |
| Q04 | À examiner | **Validé partiellement** : ouverture des filtres et sélection au clavier, Échap et retour du focus dans Chromium. Lecteur d’écran, zoom natif et appareils réels restent ouverts. |
| Q05 | À examiner | **Corrigé et vérifié** : tris départagés, pages bornées, états vide/erreur, réponse tardive, pagination cohérente avec les lignes et email mobile. Voir le contrat ci-dessous. |
| Q06 | Non applicable | Aucune mutation ni formulaire métier dans la liste. Recherche et filtres couverts par Q05 ; le lien de création ne transfère pas ici la responsabilité du formulaire. |
| Q07 | À examiner | **Corrigé et vérifié** : erreur locale persistante avec Réessayer, fraîcheur de la dernière réponse et annonce de résultats adaptée. Aucun toast ajouté aux lectures/filtres. |
| Q08 | Non applicable | Consulter et filtrer ne produit aucun événement durable à adresser à un tiers. L’avertissement de mot de passe est un état existant, pas une nouvelle notification. |
| Q09 | À examiner | **Corrigé et vérifié par simulation** : purge du résultat sur refus et changement du périmètre de lecture. Tests serveur des permissions et projections rejoués ; intégration session/base encore à vérifier. |
| Q10 | À examiner | **Examiné dans le code et tests ciblés** : authentification et permission serveur, bornes des paramètres, refus du filtre de sécurité non autorisé, protections de cache et limitation de requêtes existantes. Aucun test d’intrusion global. |
| Q11 | À examiner | **Examiné dans le code** : identité protégée, adresse selon les droits, recherche limitée aux champs autorisés, données fictives pour les essais. Qualification du traitement et conservation : point organisationnel ouvert, aucune durée inventée. |
| Q12 | À examiner | **Examiné dans le code** : modèle User, identifiant unique, sélection explicite sans hash de mot de passe, exclusion des comptes supprimés et index existants. Aucune modification du schéma ; plans SQL non mesurés. |
| Q13 | Hors impact | Aucun changement de schéma, de format persistant ou de migration. |
| Q14 | À examiner | **Corrigé et vérifié par simulation** : GET borné, abandon de la requête précédente, réponse tardive ignorée et reprise après erreur. Pas de nouvelle transaction ou commande à rendre idempotente. |
| Q15 | Hors impact | Cette lecture ne modifie pas l’historique métier. Audit des actions sensibles conservé dans les parcours concernés ; erreurs techniques via le mécanisme existant. |
| Q16 | Hors impact | Aucune suppression de compte ou de capacité ; filtre `deletedAt: null` relu. Vider un résultat local devenu interdit n’est pas effacer une donnée persistante. |
| Q17 | À examiner | **Examiné dans le code / à vérifier sur base réelle** : rendu paginé, recherche différée, agrégations et index identifiés. Aucun résultat de benchmark SQL déduit des fixtures. |
| Q18 | Non applicable | Aucun goulot mesuré justifiant un cache, une virtualisation ou un nouvel index. Les agrégations supplémentaires sont un candidat de mesure pour Q17. |
| Q19 | À examiner | **Validé pour les contrôles exécutés** : helpers limités à la présentation de cette liste, composants partagés conservés, TypeScript/lint et budget d’architecture réussis. |
| Q20 | Hors impact | Avatars générés localement déjà existants ; aucun ajout de téléversement, document, stockage ou fournisseur externe. |
| Q21 | Non applicable | Aucun import/export de comptes dans cette liste. |
| Q22 | À examiner | **Corrigé et vérifié** : dates masquées/absentes/invalides distinguées, année visible dans l’historique ancien. Format français et fuseau du navigateur, sans nouvelle règle de calendrier. |
| Q23 | Non applicable | Aucun traitement différé, webhook ou intégration externe ajouté par la consultation. |
| Q24 | Hors impact | Les accès sont techniques ; aucun mandat, pouvoir de signature ou rattachement juridique modifié. Ne pas assimiler ADMIN à un dirigeant. |
| Q25 | Hors impact | Aucun joueur, roster, adhésion ou relation datée modifié. Personne et compte restent séparés. |
| Q26 | Non applicable | Aucun montant, contrat ou engagement financier. |
| Q27 | À examiner | **Validé pour les contrôles exécutés** : 215 tests ciblés, TypeScript, lint, architecture et scénarios Chromium décrits ci-dessous. E2E réel non exécuté. |
| Q28 | À examiner | **Examiné dans le code** : erreur serveur contextualisée, absence de cache HTTP des API privées, reprise locale et architecture d’exploitation inchangée. Aucun déploiement ni essai de panne d’infrastructure. |
| Q29 | Hors impact | Aucun format de sauvegarde, fichier, clé, rétention ou donnée persistante modifié. La restauration du site relève du suivi opérationnel. |
| Q30 | À examiner | **Validé pour le suivi** : documentation actualisée, liens locaux contrôlés, aucune modification de manifeste ou lockfile. Pas de nouvelle règle de framework à introduire. |

### Contrat de liste relu

- `users:view` requis côté serveur. Création via `users:create` ; contact via
  `users:view_contact` ou `users:update_contact` ; sécurité via `users:view_security`.
  Les exceptions du compte protégé restent celles de la politique centrale.
- Recherche de 100 caractères maximum : chaque mot doit correspondre à
  l'identifiant, au prénom ou au nom, indépendamment de l'ordre des mots.
  L'email est une alternative sur la saisie complète, seulement si autorisé.
  Casse et accents français normalisés, caractères LIKE échappés ; aucune
  recherche approximative. L'identité privée du compte protégé reste exclue
  pour les tiers, qui peuvent rechercher son nom public.
- Recherche différée de 400 ms. Filtre ou tri changé : page 1. Rechargement et
  retour depuis une fiche reprennent le contexte URL. La pagination ne constitue
  pas un instantané immuable si un autre administrateur modifie des comptes.
- Taille de page par défaut : `PAGINATION.DEFAULT_LIMIT` (25), plafonnée à 100 par
  le GET. Les limites explicites restent prises en compte ; aucun réglage global
  administrateur ne pilote plus cette préférence d'affichage.
  La taille effective est conservée pour les pages suivantes. Borne partagée de
  1 000 pages : filtrer au-delà ; réexaminer la stratégie si ce plafond devient réel.
- Tri par nom, dernière connexion décroissante (absences en fin), ou création
  décroissante ; identifiant unique en dernier départage. Le compte protégé est
  placé en premier pour les autres comptes afin de ne pas révéler son identité par le tri.
- Les chiffres de la Vue d’ensemble sont **globaux**, indépendants des
  filtres. Ils excluent les comptes supprimés ; le compteur de changement de mot
  de passe respecte le périmètre de sécurité et masque le compte protégé aux tiers.
  Le total des résultats près des filtres et dans la pagination est **filtré**.
- Une panne réseau/serveur conserve les lignes seulement si leur contexte
  correspond aux critères et à la page courants, en signalant leur ancienneté.
  Sinon elles sont masquées, ainsi que leur pagination et leur date de fraîcheur.
  Les compteurs globaux peuvent rester visibles après une panne ordinaire.
  Un refus d'accès efface toute la réponse. Une modification connue des droits de
  lecture recharge la liste sans afficher les anciennes données pendant l’attente.
  Cela ne remplace pas la vérification de session côté serveur.

### Vérifications exécutées pendant la clôture

Dans `apps/web`, le 26 septembre 2026 :

```text
bunx vitest run src/__tests__/users-list-presentation.test.ts src/__tests__/users-access-hardening.test.ts src/__tests__/admin-users-list-a11y-contracts.test.ts src/__tests__/api-auth.test.ts src/__tests__/api-response.test.ts src/__tests__/design-system-contracts.test.ts src/__tests__/authenticated-shell-ux-contracts.test.ts
bunx tsc --noEmit
bunx eslint src/features/users/users-list.utils.ts src/features/users/UsersListPage.tsx src/app/systeme/utilisateurs/page.tsx src/app/api/users/route.ts src/__tests__/users-list-presentation.test.ts src/__tests__/users-access-hardening.test.ts src/__tests__/admin-users-list-a11y-contracts.test.ts
bun run check:architecture
```

Résultats : **215 tests réussis sur 7 fichiers**, TypeScript/lint/architecture
réussis. Les tests de routes simulent les dépendances : ils ne prouvent pas
l’exécution réelle de Prisma, des sessions ou de la base. Les contrats de source
ne remplacent pas les essais d’interaction.

Banc Chromium temporaire : composants réels de page/liste/contrôles et CSS du
projet, API et contexte utilisateur simulés, navigation Next remplacée par un
adaptateur local, enveloppe de sidebar reproduite. Scénarios :

- succès, connexion masquée et ancienne année ; erreur de page puis nouvelle tentative ;
- refus 403 JSON et 401 non JSON après succès, sans lignes ni statistiques résiduelles ;
- retrait des droits de contact/sécurité suivi d’une panne ; actualisation de session
  à droits identiques sans rechargement inutile ;
- recherche lente Louise suivie de Camille, sans écrasement par la réponse tardive ;
- total simulé de 30 001 comptes et URL extrême ; borne de pagination explicite ;
- zéro résultat avec accès à la création ;
- largeurs 320, 390, 1024, 1440 et 1920 px sans débordement horizontal,
  contact visible en mobile, filtres au clavier et Échap avec retour du focus.

Aucune erreur JavaScript observée dans ces scénarios. Ce banc utilise une police
de repli et ne revalide pas le rendu Geist ni le shell réel. Aucune capture créée ;
serveur et fichiers temporaires retirés après les contrôles. `git diff --check`
et les liens locaux du suivi sont contrôlés en fin de passe.

### Utilisation du guide pour le prochain changement

Une retouche de description concerne surtout Q01, Q02, Q03, Q04 et Q27 ; le reste
peut être regroupé hors impact si aucun effet indirect n’est identifié.

Une nouvelle commande sur un compte réactive au minimum les questions Q06, Q07,
Q09, Q10, Q14 et Q15. Q08 se décide selon l’événement, pas automatiquement.
Un changement de stockage ou de suppression impose de reconsidérer Q11 à Q16 et Q29.

Ces exemples ne remplacent pas le passage de toutes les questions de sélection.

### Contrôles historiques et limites

Le [rapport daté](../../../audits/2026-09-26-ui-utilisateurs.md) conserve le détail des
mesures, décisions et limites. Les captures, relevés et scripts temporaires ont
été supprimés à la demande de l’utilisateur.

Les essais antérieurs incluent disposition, clavier, pagination simulée, erreurs
réseau et réponses tardives. Ils ne constituent pas un benchmark de la base réelle.
Une modification future doit choisir ses propres vérifications pertinentes.

### Alignement sur la page de référence — 10 octobre 2026

`/membres/repertoire` est devenue la page de référence visuelle et UX. Cette
passe aligne la liste des comptes sans changer le métier :

- Squelette structuré aligné sur la référence : nouveau `loading.tsx` de route
  et `UsersDirectorySkeleton` (bandeau dégradé + lignes avec avatar et badges),
  remplaçant le pavé unique.
- Bouton « valider » de recherche (chevron) retiré : la recherche se déclenche
  à la frappe et avec Entrée, comme le répertoire.
- Pagination affiche désormais « Page N sur M ».
- Légende masquée ajoutée au tableau pour l'accessibilité.
- Avatars des comptes passés en style DiceBear `voxel-bot`, carrés (7 px),
  alignés sur le répertoire.
- Vue d'ensemble : comptage par rôle (Superadmin, Administrateur, Utilisateur)
  avec les badges d'accès correspondants pour relier la statistique au badge.
- Recherche insensible aux accents (et à la casse) via `translate`/`lower` en
  SQL, avec normalisation du terme côté serveur.
- Survol d'une ligne : le nom du compte se souligne (et passe en teinte
  primaire) comme sur le répertoire, pour renforcer le lien cliquable.
- Lignes du tableau et cartes mobiles compactées comme sur le répertoire :
  identifiant sous le nom en deux lignes serrées (16 px chacune) tenant dans la
  hauteur de l'avatar 36 px, suppression de la hauteur minimale forcée de
  64 px. L'indicateur « Identité protégée » est une icône (bouclier) avec
  infobulle au survol. L'identifiant masqué n'est plus affiché : un compte
  protégé montre uniquement son nom public et l'icône.
- Colonne « Email » dédiée (220 px, texte 12 px tronqué), affichée seulement
  aux acteurs autorisés à consulter le contact ; l'email n'est plus collé au
  nom dans le tableau. En cartes mobiles, il reste sur la ligne du nom.
- Colonne « Dernière connexion » en 11 px atténué, comme « Dernière
  modification » du répertoire ; flèche de fin de ligne retirée (le nom et la
  ligne restent cliquables, sans colonne d'action redondante).

Rectification documentaire lors de l'analyse suivante du 10 octobre : la
normalisation des accents via `translate`/`lower` est bien implémentée dans le GET.
L'ancien paragraphe « Non appliqué » contredisait le code et la liste ci-dessus.

Vérifications : TypeScript, lint, build réussis ; 133 tests ciblés réussis
(contrats d'accessibilité, taille de page, présentation, durcissement des accès).

### Analyse de la liste après alignement — 10 octobre 2026

#### Complément : menus partagés

Le [contrôle transverse du 10 octobre](../../../audits/2026-10-10-menus.md)
vérifie les filtres de liste, le rôle et les sélecteurs pôle/page de permissions
dans les vrais composants avec contexte simulé. Les surcharges de focus et
d'arrondi sont retirées : déclencheur 6 px, panneau 7 px, option 4 px, anneau
partagé au focus et pendant l'ouverture. Les classes des sélecteurs d'Activité
dormants sont alignées, sans réactiver ni valider cet onglet. Les 1 036 tests web
réussissent (25 ignorés) ; les anciennes preuves de mutations restent distinctes.

Complément du même jour : les trois filtres de liste utilisent désormais
`variant="compact"` sur le déclencheur et le contenu du sélecteur. Leur style
est extrait de `directory.module.css` pour être partagé avec les fiches du
Répertoire. Rendu calculé et ouverture/fermeture vérifiés à 320, 390, 768 et
1 440 px dans le banc du [complément Répertoire](../../../audits/2026-10-10-menus.md#complément--présentation-des-sélecteurs-du-répertoire).

#### Analyse initiale

Voir le [rapport daté](../../../audits/2026-10-10-utilisateurs.md) pour la
sélection des 30 sujets, les reproductions et les captures. Passe d'analyse :
**aucun code produit modifié**.

- 225 tests dans 8 fichiers, TypeScript et lint ciblé réussis. Architecture
  échouée sur la sidebar partagée : 925 lignes pour 900, dépassement préexistant.
- Chromium isolé, vrais composants/CSS et 60 comptes fictifs, neuf largeurs de
  320 à 1 920 px. Aucun débordement horizontal global ; noms pourtant invisibles
  à 1 120 px lorsque contact et sécurité sont affichés. Voir USR-11.
- Synthèse empilée de 424 px environ, recherche repoussée vers 699 px sur mobile ;
  besoin de compacter (USR-13). Flèches mobiles 44 × 44 px cette fois mesurées
  directement sur Utilisateurs, complétant le contrôle précédent du Répertoire.
- Filtres/URL, rechargement, page hors limites, résultat vide, réponse dépassée,
  réessai et purge sur 403 non JSON exercés. Défauts de contexte après erreur et
  de défilement lors de la pagination suivis en USR-14/USR-15.
- Les scénarios navigateur simulent session/API/routage. `E2E_DATABASE_URL`
  absente ; aucune validation du parcours Next avec session/base réelles,
  de la charge SQL, d'un lecteur d'écran ou de Safari réel dans cette passe.
- Documents réconciliés avec le code : emplacement de création, accents,
  statistiques et coût apparent du GET. Les résultats de septembre et des
  passes antérieures ci-dessus restent historiques.

### Corrections après audit — 10 octobre 2026

La demande « corrige tout » autorise la correction des défauts et les améliorations
de liste retenues. Q06 est réactivé pour les primitives radio de création ; Q02
couvre aussi le retour de Mon compte et celui du squelette de fiche. Les autres
sujets sélectionnés dans l'audit restent applicables. Aucune migration produit,
nouvelle dépendance, permission ou mutation métier ajoutée.

- USR-09/USR-16 : filtres effaçables, synthèse explicitement globale et compteurs
  cliquables correspondant aux ensembles du GET.
- USR-10 : cartes radio de création composées avec `Label` et `Input` partagés ;
  choix au clavier et repère de focus vérifiés.
- USR-11/USR-13 : seuils selon les colonnes et synthèse compacte. À 390 px,
  synthèse de 235 px et recherche vers 511 px dans le vrai shell ; à 1 120 px,
  cartes lisibles avec contact et sécurité, sans débordement.
- USR-12 : recherche multi-mots réellement exécutée dans PostgreSQL, avec
  noms composés, ordre inverse, accents, caractères spéciaux et droits de contact.
- USR-14 : contexte attaché à la réponse ; une erreur de nouveau filtre ne
  réaffiche plus les anciennes lignes. Purge sur refus 401/403 conservée.
- USR-15 : reprise de position/focus et `returnTo` sécurisé jusque dans Mon compte
  et le chargement de fiche ; changement de page repositionné sur les résultats.
- USR-17 : contrôleur de chargement, filtres, résultats et navigation séparés ;
  page ramenée à environ 220 lignes. Exception de budget de 1 100 lignes retirée.
  Extraction du contexte et du suivi de viewport de la sidebar partagée : son
  dépassement de budget préexistant est également corrigé, sans relever le seuil.

**Preuves.** Build Next de production, types, lint, architecture et budget de build
réussis. Suite web : **1 018 tests réussis, 15 ignorés** (répertoire PostgreSQL sans
sa variable dédiée), dont 10 nouveaux tests SQL Utilisateurs et 10 de navigation.
Chromium avec Next, authentification serveur et PostgreSQL réels : neuf largeurs,
quatre combinaisons de droits de champs, pagination, retour fiche/Mon compte,
rechargement, recherche, erreurs injectées et reprise, réponse dépassée, refus
réels pour visiteur et profil sans droit. Aucune erreur JavaScript capturée.
[Mesures et captures](../../../audits/2026-10-10-utilisateurs.md#validation-des-corrections).

Base jetable locale : 51 migrations appliquées, 61 comptes fictifs et sessions
de test insérées. Le formulaire de connexion et le défi MFA n'ont pas été joués ;
les mutations de profil/création ne sont pas couvertes par cette passe. Le petit
jeu de données ne mesure pas la charge de production. Les anciennes preuves
de septembre et de l'analyse initiale ci-dessus restent datées.

### Fond des avatars par accès — 10 octobre 2026

Retouche visuelle légère : Q01/Q03/Q04/Q19/Q27/Q30 examinés pour la couleur,
le composant partagé et sa vérification ; autres sujets hors impact, sans
modification des données, droits, parcours ou interactions. Fond SVG transparent
et couleurs sémantiques du conteneur ; initiales de secours lisibles sur ce fond.

TypeScript et lint ciblé réussis. Chromium isolé avec le vrai composant et le CSS
du projet : trois accès contrôlés à 36 et 64 px, même dessin pour une même graine.
Comparaison SVG sur 40 graines : seule la couleur de fond change. Documentation
DiceBear 10 consultée via Context7 et comparée à la version installée 10.7.0.
Les parcours complets des pages consommatrices n'ont pas été rejoués pour cette
retouche ; les essais de liste précédents restent datés.

### Registre des points et déclencheurs

Les correctifs clos et les validations restantes sont distingués ci-dessous.
Les responsables opérationnels des points ouverts restent à attribuer.

| Point | Suite concrète | Déclencheur |
| --- | --- | --- |
| USR-01 — Parcours réels avec permissions/session/base | **Clos pour la liste le 11 octobre** : dix parcours Next/PostgreSQL avec connexion mot de passe/MFA, droits, révocation, fiche/retour/rechargement ; mutations de création et de fiche suivies dans leurs audits propres | Changement d'authentification, permissions ou navigation ; aucune certification globale des autres mutations |
| USR-02 — Volumes et coûts serveur | **Mesuré et clos au périmètre actuel le 11 octobre** : 33 scénarios sur 25/1k/10k comptes, 20 échantillons chacun ; recherche large et page de 25 vérifiées à 33k en test SQL | Croissance significative, pages profondes fréquentes ou latence distante excessive ; aucune charge concurrente déduite |
| USR-03 — Coût du GET et de la recherche | **Corrigé et mesuré le 11 octobre** : plus de collecte de tous les IDs ; deux requêtes pour page/total et synthèse, médiane de recherche large 91,69 → 17,37 ms à 10k dans le banc local | Maintenir les droits et l'égalité des résultats ; mesurer avant tout cache/index supplémentaire |
| USR-04 — Plafond de pagination | Réexaminer curseur, stratégie de recherche ou taille de page si 1 000 pages deviennent nécessaires ; l’interface borne et explique désormais la limite | Volume réellement proche du plafond, selon la taille configurée |
| USR-05 — Lecteur d’écran, appareils réels, zoom natif | Exécuter les parcours importants dans ces environnements | Revue d’accessibilité complète |
| USR-06 — Graisses visuelles dans WebKit Windows | Comparer dans Safari réel avant toute correction globale de police | Revue de compatibilité |
| USR-07 — Finalité, responsable et conservation du traitement des comptes | Faire qualifier et consigner la politique applicable ; aucune validation organisationnelle ou juridique déduite de la revue du code | Cadrage de l’exploitation avec données réelles ou nouvelle entité |
| USR-08 — Responsables et fréquence de suivi | Désigner selon l’exploitation réelle | Mise en place du suivi opérationnel |
| USR-09 — Chips de filtres actifs | **Corrigé et vérifié** : recherche, état et rôle effaçables ; scénario navigateur de recherche et filtre | Clos le 10 octobre ; maintenir avec la barre de filtres |
| USR-10 — Primitives des cartes radio de création | **Corrigé et vérifié** : primitives partagées, contrat réussi, sélection et focus clavier Chromium | Clos le 10 octobre ; mutations de création non rejouées |
| USR-11 — P1, identité invisible dans le tableau | **Corrigé et vérifié** : seuils adaptés aux quatre profils de colonnes ; identité mesurée de 303 à 369 px dans les profils proches du seuil | Clos le 10 octobre ; refaire les mesures à tout ajout de colonne |
| USR-12 — P2, recherche par nom complet | **Corrigé et vérifié** : mots répartis entre les champs, 10 tests PostgreSQL réels et recherche navigateur | Clos le 10 octobre ; conserver les régressions de visibilité |
| USR-13 — P2, synthèse empilée | **Corrigé et vérifié** : grille compacte, neuf largeurs ; 235 px à 390 px | Clos le 10 octobre ; contrôler les vrais nouveaux compteurs |
| USR-14 — P2, anciennes lignes sous de nouveaux critères | **Corrigé et vérifié** : anciennes lignes masquées sous un autre contexte ; erreur après page 2, filtre ADMIN et réessai exécutés | Clos le 10 octobre ; préserver lors des changements de chargement |
| USR-15 — P2, pagination et reprise de position | **Corrigé et vérifié** : résultats remis à portée au changement de page ; retours fiche/Mon compte avec page, défilement et focus dans Next réel | Clos le 10 octobre ; conserver la portée compte/droits de l'instantané |
| USR-16 — P2, compteurs globaux utilisables | **Corrigé et vérifié** : libellé global, liens natifs et catégories exclusives ; compteur Administrateurs et résultat tous deux à 20 dans le jeu de test | Clos le 10 octobre ; ne pas confondre rôle stocké et catégorie de liste |
| USR-17 — P2, découpage de la liste | **Corrigé et vérifié** : responsabilités séparées, exception de budget retirée, suite web et build réussis | Clos le 10 octobre ; maintenir les responsabilités par module |
| USR-18 — P2, plafond SQL caché de recherche | **Clos le 11 octobre** : erreur P2035 reproduite à 33k puis supprimée ; page bornée, deux requêtes, SQL réel et intégration vérifiés | Conserver la régression de recherche large |
| USR-19 — P2, contexte de pagination | **Clos le 11 octobre** : lignes, numéro, total et retour de fiche correspondent à la réponse affichée pendant attente/erreur | Changement du contrôleur ou des liens de liste |
| USR-20 — P2, historique et recherche en attente | **Clos le 11 octobre** : Back entre pages, filtre utilisant la saisie courante, normalisation immédiate des URL | Changement du routeur, de la recherche ou des filtres |
| USR-21 — P2, reprise de navigation | **Clos le 11 octobre** : focus différé annulable, instantané consommé avec contrôle, retour de fiche puis rechargement avec focus vérifiés | Changement de critères, de portée ou de disposition |
| USR-22 — P2, focus après action | **Clos le 11 octobre** : effacement/reset vers recherche ; reprise réussie vers résultats, nouvel échec vers Réessayer | Changement des commandes ou états d'erreur |
| USR-23 — P2, sémantique et focus visuel | **Clos le 11 octobre** : valeurs des compteurs annoncées, identité protégée lisible, avatars décoratifs et jeton de focus commun | Nouvelle colonne, compteur ou variante de carte |
| USR-24 — P2, garde locale du contact mobile | **Clos le 11 octobre** : même condition de permission sur tableau et cartes, serveur réel et donnée excessive simulée contrôlés | Changement des projections ou données de carte |
| USR-25 — P2, alias publics recherchables | **Clos le 11 octobre** : mots inversés/espaces multiples acceptés, mots privés exclus, SQL réel | Changement des alias ou de la recherche |

Les preuves avant/après figurent dans les
[rapports du 10 octobre](../../../audits/2026-10-10-utilisateurs.md) et
[du 11 octobre](../../../audits/2026-10-11-utilisateurs.md).
La correction a utilisé sa propre base locale jetable et des sessions fictives,
sans utiliser la base applicative ni les identifiants E2E de l'exploitant.
