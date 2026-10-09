# Suivi — Utilisateurs, liste

## Identité et périmètre

- Route : `/systeme/utilisateurs`.
- Fonction livrée : rechercher et consulter les comptes, leurs accès, leur état
  et leur dernière connexion ; accès à la création selon les droits.
- Type : liste de gestion privée ; fiche et formulaire de création hors de ce suivi.
- Sources : [page](../../../apps/web/src/app/systeme/utilisateurs/page.tsx),
  [liste](../../../apps/web/src/features/users/UsersListPage.tsx),
  [disposition](../../../apps/web/src/components/ui/directory.module.css).
- Ce suivi est amorcé le 26 septembre 2026 depuis les décisions et contrôles déjà
  consignés. La création du référentiel n’a pas rejoué ces contrôles.
- Passe de clôture du 26 septembre 2026 : classement des 30 sujets, lecture des
  fiches applicables, revue du code et corrections ciblées. Le niveau est
  **sensible** pour la conservation des données après révocation de droits.
  Les vérifications exécutées pendant cette passe sont distinguées ci-dessous.

## Décisions courantes

- Titre compact, description « Gérez les comptes et leurs accès. » en texte secondaire.
- Création dans la barre d’outils de la liste, adaptée aux droits.
- Sidebar ancrée à gauche ; rail indépendant à droite lorsque la place le permet.
- Largeur de travail privilégiée aux tailles intermédiaires ; centrage écran sur
  grand écran ; adaptation en cartes selon la largeur réelle.
- Palette bleue proche de la sidebar, badges discrets sans fond coloré dominant.
- Recherche, filtres, tri et pagination serveur ; la liste n’affiche pas tous les
  comptes à la fois. Permissions effectives décrites dans [PERMISSIONS](../../references/PERMISSIONS.md).
- Aucun nouveau toast ou événement durable n’est nécessaire pour simplement lire
  la liste ou changer un filtre. Les événements de sécurité des autres parcours
  conservent leurs règles propres.
- Les comptes ne sont pas les fiches Personnes du Répertoire.

## Conclusion de la passe de clôture

Les corrections identifiées dans cette passe sont vérifiées localement. Le rendu
retenu est conservé ; cette revue n’impose pas une nouvelle refonte visuelle.
La page n’est pas certifiée « parfaite » : l’intégration avec des sessions et une
base réelles, la capacité SQL et l’accessibilité complète restent à vérifier.
Le détail et le formulaire de création nécessitent leur propre revue.

### Défauts corrigés

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

## Sélection des 30 sujets

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

## Contrat de liste relu

- `users:view` requis côté serveur. Création via `users:create` ; contact via
  `users:view_contact` ou `users:update_contact` ; sécurité via `users:view_security`.
  Les exceptions du compte protégé restent celles de la politique centrale.
- Recherche de 100 caractères maximum sur identifiant, prénom et nom ; email
  seulement si autorisé. Recherche insensible à la casse, par sous-chaîne de
  chaque champ ; aucune promesse de recherche approximative ou insensible aux accents.
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
- Les trois chiffres de la Vue d’ensemble sont **globaux**, indépendants des
  filtres. Ils excluent les comptes supprimés ; le compteur de changement de mot
  de passe respecte le périmètre de sécurité et masque le compte protégé aux tiers.
  Le total des résultats près des filtres et dans la pagination est **filtré**.
- Une panne réseau/serveur conserve la dernière réponse et signale son ancienneté.
  Un refus d’accès efface cette réponse. Une modification connue des droits de
  lecture recharge la liste sans afficher les anciennes données pendant l’attente.
  Cela ne remplace pas la vérification de session côté serveur.

## Vérifications exécutées pendant la clôture

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

## Utilisation du guide pour le prochain changement

Une retouche de description concerne surtout Q01, Q02, Q03, Q04 et Q27 ; le reste
peut être regroupé hors impact si aucun effet indirect n’est identifié.

Une nouvelle commande sur un compte réactive au minimum les questions Q06, Q07,
Q09, Q10, Q14 et Q15. Q08 se décide selon l’événement, pas automatiquement.
Un changement de stockage ou de suppression impose de reconsidérer Q11 à Q16 et Q29.

Ces exemples ne remplacent pas le passage de toutes les questions de sélection.

## Contrôles historiques et limites

Le [rapport daté](../../audits/AUDIT_UI_UTILISATEURS_2026-09-26.md) conserve le détail des
mesures, décisions et limites. Les captures, relevés et scripts temporaires ont
été supprimés à la demande de l’utilisateur.

Les essais antérieurs incluent disposition, clavier, pagination simulée, erreurs
réseau et réponses tardives. Ils ne constituent pas un benchmark de la base réelle.
Une modification future doit choisir ses propres vérifications pertinentes.

## Alignement sur la page de référence — 10 octobre 2026

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
- Lignes du tableau compactées comme sur le répertoire : identifiant et email
  repliés sur la ligne du nom (12 px), avatar 36 px, suppression de la hauteur
  minimale forcée de 64 px.

Non appliqué : la recherche reste insensible à la casse mais pas aux accents.
Une recherche insensible aux accents demande soit des colonnes normalisées sur
`User` (migration + backfill), soit `unaccent`/`translate` en SQL brut — à cadrer
comme un petit chantier de schéma, pas comme une retouche visuelle.

Vérifications : TypeScript, lint, build réussis ; 133 tests ciblés réussis
(contrats d'accessibilité, taille de page, présentation, durcissement des accès).

## Points ouverts et déclencheurs

| Point | Suite concrète | Déclencheur |
| --- | --- | --- |
| Parcours réels avec permissions/session/base | Préparer une base E2E isolée et les profils nécessaires | Avant conclusion fonctionnelle globale |
| Volumes et coûts serveur | Mesurer requêtes, agrégations et pages éloignées sur données représentatives | Hausse de volume ou travail de performance |
| Agrégations du GET | Mesurer les neuf opérations de liste/statistiques au maximum, hors auth/réglage ; plusieurs statistiques retournées ne sont pas utilisées par ce rail. Évaluer ensuite une projection plus petite sans casser les consommateurs | Benchmark serveur ; aucun cache ajouté sans mesure |
| Plafond de pagination | Réexaminer curseur, stratégie de recherche ou taille de page si 1 000 pages deviennent nécessaires ; l’interface borne et explique désormais la limite | Volume réellement proche du plafond, selon la taille configurée |
| Lecteur d’écran, appareils réels, zoom natif | Exécuter les parcours importants dans ces environnements | Revue d’accessibilité complète |
| Graisses visuelles dans WebKit Windows | Comparer dans Safari réel avant toute correction globale de police | Revue de compatibilité |
| Finalité, responsable et conservation du traitement des comptes | Faire qualifier et consigner la politique applicable ; aucune validation organisationnelle ou juridique déduite de la revue du code | Cadrage de l’exploitation avec données réelles ou nouvelle entité |
| Responsables et fréquence de suivi | Désigner selon l’exploitation réelle | Mise en place du suivi opérationnel |
| Chips de filtres actifs | Ajouter les chips retirables (recherche, statut, rôle) comme sur le répertoire, en plus du bouton de réinitialisation | Cohérence avec la page de référence |

Ne pas présenter ces points comme nouveaux défauts prouvés ni comme déjà résolus.
Les trois variables `E2E_DATABASE_URL`, `E2E_SUPERADMIN_LOGIN_NAME` et
`E2E_SUPERADMIN_PASSWORD` sont absentes de l’environnement de cette passe.
La base applicative n’a pas été utilisée comme base de test.
