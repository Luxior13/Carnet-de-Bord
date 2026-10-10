# Suivi — Utilisateurs, liste

## Identité et périmètre

- Route : `/systeme/utilisateurs`.
- Fonction livrée : rechercher et consulter les comptes, leurs accès, leur état
  et leur dernière connexion ; accès à la création selon les droits.
- Type principal : liste de gestion privée ; les passes de création et de fiche
  sont consignées dans leurs sections dédiées, avec leur périmètre propre.
- Sources : [page](../../../apps/web/src/app/systeme/utilisateurs/page.tsx),
  [liste](../../../apps/web/src/features/users/UsersListPage.tsx),
  [disposition](../../../apps/web/src/components/ui/directory.module.css).
- Ce suivi est amorcé le 26 septembre 2026 depuis les décisions et contrôles déjà
  consignés. La création du référentiel n’a pas rejoué ces contrôles.
- Passe de clôture du 26 septembre 2026 : classement des 30 sujets, lecture des
  fiches applicables, revue du code et corrections ciblées. Le niveau est
  **sensible** pour la conservation des données après révocation de droits.
  Les vérifications exécutées pendant cette passe sont distinguées ci-dessous.
- Passe du 10 octobre 2026 : **alignement visuel de la liste terminé**, alignée sur la page
  de référence `/membres/repertoire` (voir la section dédiée plus bas).
- Analyse puis corrections du 10 octobre 2026 : **USR-09 à USR-17 corrigés et
  vérifiés**, avec serveur Next et PostgreSQL isolés. Les limites de validation
  restantes sont distinguées dans les points ouverts.
  [Rapport et preuves avant/après](../../audits/AUDIT_UTILISATEURS_2026-10-10.md).
- Audit suivant du formulaire `/systeme/utilisateurs/nouveau` : **corrections
  nécessaires**, distinctes des correctifs de liste. Voir USR-N01 à USR-N07 et
  [le rapport de création](../../audits/AUDIT_CREATION_UTILISATEUR_2026-10-10.md).

## Décisions courantes

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
  les autres filtres et la page, tout en conservant le tri.
- Trois ensembles d'accès exclusifs : Superadmin (`isProtected`),
  Administrateur (ADMIN non protégé), Utilisateur (USER non protégé).
  Le filtre `role=SUPERADMIN` est une catégorie de liste, pas un nouveau rôle
  persistant ni une nouvelle permission.
- Filtres actifs de recherche, état et rôle effaçables individuellement.
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
  comptes à la fois. Permissions effectives décrites dans [PERMISSIONS](../../references/PERMISSIONS.md).
- Aucun nouveau toast ou événement durable n’est nécessaire pour simplement lire
  la liste ou changer un filtre. Les événements de sécurité des autres parcours
  conservent leurs règles propres.
- Les comptes ne sont pas les fiches Personnes du Répertoire.

## Conclusion de la passe de clôture — 26 septembre 2026

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

## Formulaire de création — revue du 10 octobre 2026

- URL vérifiée : `/systeme/utilisateurs/nouveau` (canonique ; l'ancien
  `/administration/utilisateurs/nouveau` est redirigé). `returnTo` reste borné
  à la collection utilisateurs.
- Champs conservés : prénom (obligatoire), nom (facultatif, décision du
  2026-10-10 pour le contexte esport où le nom complet n'est pas toujours connu),
  identifiant de connexion (obligatoire), email de contact (facultatif), rôle
  (`USER`, `ADMIN` seulement pour un compte protégé). Aucun champ ajouté : le
  compte est distinct de la fiche Personne ; l'identité complète et les
  relations se renseignent sur la fiche. Le schéma reflète ce choix :
  `User.lastName` est nullable (migration `20261010150000`), et la lecture
  normalise `null` en chaîne vide pour l'affichage.
- Interface recentrée sur la tâche : hero `PageIdentityHero` compact (dégradé
  des pages de référence, avatar DiceBear du compte créé, badges d'accès
  partagés `UserAccessBadge`), formulaire en une seule carte alignée sur le
  formulaire de création du répertoire (en-tête avec `ServiceIcon`, sections
  « Identité », « Connexion » et « Accès » en libellés majuscules discrets).
  Le rôle est choisi par cartes radio (Utilisateur / Administrateur) avec
  description, au lieu d'un menu déroulant.
- Écran de succès aplati sur le même gabarit : remise du mot de passe
  temporaire puis synthèse des accès, sans cartes imbriquées.
- Aligné sur le répertoire : champs en style `Input` partagé, dernier fil
  d'Ariane sans lien vers lui-même, focus placé sur le premier champ invalide
  après validation. Autocomplétion désactivée (règle globale du 2026-10-10) :
  `autoComplete="off"` sur le formulaire, champs sans `name` ni `autoComplete`
  explicite, et champ email en `type="text"` avec `inputMode="email"`.
- Vérifié : TypeScript et lint au vert. Le parcours réel (création, mot de
  passe temporaire, relance d'authentification pour ADMIN) reste à valider en
  base réelle.

### Audit ciblé du formulaire — 10 octobre 2026

Lecture du formulaire, POST, validation, transaction et droits ; Chromium avec
composants/CSS réels mais API, acteur, shell et navigation Next simulés, sept
largeurs. **185 tests ciblés, types, lint et architecture réussis.** Aucun code
produit changé par cet audit. [Rapport et preuves](../../audits/AUDIT_CREATION_UTILISATEUR_2026-10-10.md).

La protection du brouillon, la conservation des valeurs après erreur, le focus
sur une erreur locale et l'ouverture du dialogue ADMIN fonctionnent dans ce banc.
Le nom vide est accepté par la validation métier. Les défauts portent sur les
dimensions des radios masquées, la sémantique du nom facultatif, les erreurs
serveur et le focus après transition. La remise et la reprise du secret demandent
également un cadrage explicite ; aucun envoi automatique ajouté.

USR-10 reste clos pour la réutilisation des primitives et le clavier contrôlés
précédemment. Sa vérification ne couvrait pas le débordement des radios, désormais
isolé en USR-N01. Les preuves de liste sur base réelle ne valident pas la création.

| Point | État, preuve et prochaine action | Déclencheur / responsable |
| --- | --- | --- |
| USR-N01 — P2, radios et débordement | **Ouvert** : le radio masqué hérite de la largeur de `Input` ; 363 px de débordement à 1 120 px, supprimés par une neutralisation des dimensions dans le DOM du banc. Adapter le contrôle puis rejouer les tailles | Correction du formulaire / à attribuer |
| USR-N02 — P2, nom facultatif | **Ouvert** : `required` contredit le label et la validation ; supprimer l'attribut, préserver le nom facultatif | Correction du formulaire / à attribuer |
| USR-N03 — P2, erreurs serveur | **Ouvert** : détails d'email ignorés, doublon et panne seulement en toast ; rattacher les erreurs aux champs et conserver une erreur générale locale | Correction de la validation et des retours / à attribuer |
| USR-N04 — P2, focus des transitions | **Ouvert** : focus sur `BODY` après succès et « Créer un autre » ; viser confirmation puis premier champ | Correction du parcours clavier / à attribuer |
| USR-N05 — P2, départ pendant le POST | **Ouvert** : « Quitter sans enregistrer » proposé alors que la demande est en cours ; distinguer brouillon et opération déjà lancée | Correction des états d'attente / à attribuer |
| USR-N06 — P2, réponse perdue après commit | **Risque à vérifier** : relance refusée par unicité, secret perdu pour le créateur ; définir reprise et nouvelle émission autorisée, sans stockage du secret en clair | Essai de coupure après écriture sur base isolée / à attribuer |
| USR-N07 — remise du mot de passe | **Suggestion ouverte** : repère de copie/remise ou confirmation ciblée avant effacement du succès ; le comportement actuel est observé, l'obligation n'est pas décidée | Prochain travail sur la remise des identifiants / à attribuer |

Validation encore nécessaire : création USER/ADMIN, défi d'identité, réservation
d'identifiant, audit atomique et première connexion dans Next/PostgreSQL isolés.
Lecteur d'écran, Safari et appareils physiques non vérifiés pendant cette passe.

## Fiche utilisateur (`/systeme/utilisateurs/[id]`) — 10 octobre 2026

- Onglet « Activité » retiré de la navigation (`USER_DETAIL_SECTIONS`) ; le
  code de l'historique est conservé dormant pour une restauration ultérieure.
  Les anciens liens `?section=history` retombent sur « Profil ».
- Hero passé de l'ancien `UsersAdminHero` à `PageIdentityHero` compact (dégradé
  de référence), avec l'avatar DiceBear du compte et l'identifiant en
  description. Le rôle est affiché à droite du hero, centré verticalement.
  `UsersAdminHero` a été supprimé.
- Une carte « Vue d'ensemble » (même gabarit que `/systeme/utilisateurs`)
  est placée dans le rail droit (`PageAsideLayout`) comme sur la liste, et
  regroupe : état, protection, mot de passe, date de création et dernière
  modification.
- Contrat de source `admin-user-detail-subcomponents-ux-contracts.test.ts`
  actualisé.
- Onglets harmonisés : Profil aplati (plus de cartes imbriquées, sections
  « Identité » / « Connexion et contact »), statuts de sécurité en pastilles
  partagées, chips de capacité des Autorisations en pastilles (`CapabilityChip`).
- L'onglet Profil est désormais modifiable directement (plus de bouton
  « Modifier » ni de vue en lecture) avec la barre d'enregistrement partagée
  `SectionActionBar` (récupérée de `/membres/repertoire/[id]`).

## Analyse de la liste après alignement — 10 octobre 2026

Voir le [rapport daté](../../audits/AUDIT_UTILISATEURS_2026-10-10.md) pour la
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

## Corrections après audit — 10 octobre 2026

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
[Mesures et captures](../../audits/AUDIT_UTILISATEURS_2026-10-10.md#validation-des-corrections).

Base jetable locale : 51 migrations appliquées, 61 comptes fictifs et sessions
de test insérées. Le formulaire de connexion et le défi MFA n'ont pas été joués ;
les mutations de profil/création ne sont pas couvertes par cette passe. Le petit
jeu de données ne mesure pas la charge de production. Les anciennes preuves
de septembre et de l'analyse initiale ci-dessus restent datées.

## Fond des avatars par accès — 10 octobre 2026

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

## Registre des points et déclencheurs

Les correctifs clos et les validations restantes sont distingués ci-dessous.
Les responsables opérationnels des points ouverts restent à attribuer.

| Point | Suite concrète | Déclencheur |
| --- | --- | --- |
| USR-01 — Parcours réels avec permissions/session/base | **Validé partiellement le 10 octobre** : liste et retours dans Next/PostgreSQL réels, sessions de test et droits vérifiés. Connexion interactive, défi MFA et mutations hors de cette passe | Avant conclusion fonctionnelle globale sur ces autres parcours |
| USR-02 — Volumes et coûts serveur | Mesurer requêtes, agrégations et pages éloignées sur données représentatives | Hausse de volume ou travail de performance |
| USR-03 — Coût du GET et de la recherche | État relu le 10 octobre : au maximum huit opérations hors auth avec recherche et droit de sécurité ; toutes les statistiques retournées alimentent la synthèse. Mesurer aussi la collecte de tous les identifiants de recherche avant pagination | Benchmark serveur ; aucun cache ajouté sans mesure |
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

Les preuves avant/après figurent dans le
[rapport du 10 octobre](../../audits/AUDIT_UTILISATEURS_2026-10-10.md).
La correction a utilisé sa propre base locale jetable et des sessions fictives,
sans utiliser la base applicative ni les identifiants E2E de l'exploitant.
