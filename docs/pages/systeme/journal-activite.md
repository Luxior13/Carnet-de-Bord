# Journal d’activité

[Index des pages](../../pages/README.md) · [Espace Système](README.md) · [Design](../../design/README.md) · [Guide général](../../REFERENCE_GENERALE.md)

> **Reconstruite et livrée le 30 octobre 2026** (`live` dans le registre).
> Retirée du 9 au 30 octobre 2026 ; l’ancien `GET /api/users/[id]/audit` reste
> supprimé. Les sections datées de septembre décrivent l’ancienne version.

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/systeme/journal-activite`, API `GET /api/audit` |
| Espace | Système, section Administration |
| Gabarit | [A. Liste de gestion](../../design/gabarits.md#a-liste-de-gestion), en lecture seule |
| État d’harmonisation | Aligné à la livraison (banc client 12/12) |
| Contrôle d’accès | `audit:view` : administrateurs par la règle du rôle, utilisateur sur octroi (critique : double authentification exigée du destinataire) |
| Code | `features/audit` (types, page, liste, hook, lien « Historique »), `features/audit/server` (service, projection, libellés), `app/api/audit/route.ts`, `app/systeme/journal-activite/page.tsx` |

> Page retirée le 9 octobre 2026 et replanifiée sur `/systeme/feuille-de-route`.
> Ce suivi est conservé comme historique ; l’audit serveur et l’historique des
> personnes persistent. L’onglet Activité utilisateur a depuis été retiré ;
> l’existence d’une API historique ne signifie pas qu’une vue est disponible.

## Reconstruction — cadrage du 30 octobre 2026

**État : validé (« ok go » du 30 octobre 2026) et livré le même jour** ; les
écarts de livraison sont dans la section suivante. Les sections datées de
septembre restent l’historique de l’ancienne version ; en cas d’écart, ce
cadrage et sa livraison priment.

### Besoin

Le serveur trace chaque action depuis le début, mais rien ne permet de la
relire. Le propriétaire a retiré le 27 octobre 2026 les icônes de provenance
des champs « en attendant les logs » : le journal est l’endroit où retrouver
qui a fait quoi, quand, sur quel objet, avec quel résultat. Usage : enquête
ponctuelle d’un administrateur (« qui a changé ce rôle ? », « ces échecs de
connexion viennent-ils du même endroit ? »), pas une consultation quotidienne.
Réussite : retrouver un fait en moins d’une minute à partir d’une personne,
d’un compte ou d’une période, sans exposer plus que le droit du lecteur.

### Décisions retenues (propriétaire, « ok go » du 30 octobre 2026)

| Sujet | Décision | Motif |
| --- | --- | --- |
| Lecteurs | Permission `audit:view` ; les administrateurs l’ont par la règle « un ADMIN possède toutes les autorisations administratives » ; un utilisateur seulement si elle lui est accordée | Même mécanisme que les autres pages ; portée par équipe plus tard, avec les droits par périmètre |
| Sécurité | **Un seul journal**, filtre « Sécurité » ; l’ancienne séparation Activité / Connexions est abandonnée | Une enquête suit une seule ligne de temps (connexion, puis droits modifiés) |
| Export | **Pas dans la première version** ; `audit:export` reste planifiée | Données personnelles hors de l’outil ; à ajouter sur besoin réel (demande RGPD, contrôle) |
| Conservation | **Un an** (« mets 1 an pour la conservation », 30 octobre 2026) ; défaut logiciel et valeur de secours SQL à 365 jours | Repère CNIL de six mois à un an pour la journalisation |
| Adresses IP | Visibles par le superadmin seulement, dans le détail ; « Adresse masquée » pour les autres ; navigateur lisible pour tous (« Windows · Chrome ») | Donnée personnelle utile à l’enquête seulement |
| Modification | Lecture seule stricte ; seule la purge de conservation des Paramètres supprime | Un journal modifiable ne prouve rien |
| Suivi des accès | Ouvrir la page laisse une trace (un événement par affichage, pas par filtre) | Celui qui surveille est surveillé ; prévu par la feuille de route |

### Proposition de page

Gabarit [A. Liste de gestion](../../design/gabarits.md#a-liste-de-gestion),
aligné sur Répertoire et Utilisateurs (recherche, filtres rapides, pagination
commune), en lecture seule et sans bouton d’ajout.

```text
Système › Journal d’activité
┌──────────────────────────────────────────────────────────────┐
│ Journal d’activité                                           │
│ Qui a fait quoi, quand et sur quel dossier.                  │
├──────────────────────────────────────────────────────────────┤
│ [🔍 Auteur ou compte concerné        ]  [Période : 7 jours ▾] │
│ Type  [Tous] [Sécurité] [Comptes et droits] [Personnes]      │
│       [Paramètres]                                           │
│ Afficher [Tout] [Importants] [Échecs]                        │
│ 128 événements                                               │
├──────────────────────────────────────────────────────────────┤
│ ● Autorisations modifiées              Camille Exemple   14:32│
│   Compte : alex.exemple · 3 accordées, 1 retirée          ›  │
│ ● Connexion échouée                    —                 14:05│
│   Identifiant : alex.exemple · mot de passe incorrect     ›  │
│ ● Fiche modifiée                       Camille Exemple   hier │
│   Personne : MaxLaFontaine · Coordonnées (2 champs)       ›  │
├──────────────────────────────────────────────────────────────┤
│ 1–50 sur 128                                       [‹] [›]   │
└──────────────────────────────────────────────────────────────┘
```

- **Ligne** : pastille de gravité (neutre, avertissement, critique, échec
  distingués par texte et couleur), libellé français du fait, objet concerné,
  auteur, date courte ; dépliable au clavier et au toucher.
- **Détail déplié** : date exacte avec fuseau ; auteur et compte concerné
  (noms figés au moment du fait, nom actuel d’une fiche personne s’il a
  changé) ; changements Avant → Après champ par champ, contact précis
  identifié ; navigateur ; IP selon le droit ; liens « Filtrer sur cet
  auteur / ce compte / cette fiche » et « Ouvrir la fiche ».
- **Filtres** : période (24 h, 7 jours par défaut, 30 jours, 1 an,
  personnalisée bornée à la conservation) ; type, regroupant les flux
  existants (`AUTHENTICATION` + `SECURITY` → Sécurité ; `IDENTITY` comptes +
  `AUTHORIZATION` → Comptes et droits ; `IDENTITY` personnes → Personnes ;
  `SYSTEM` → Paramètres) ; « Importants » = avertissement ou critique ;
  « Échecs » = résultat en échec ; recherche par nom ou identifiant (trois
  caractères minimum). Filtres dans l’URL, comme les autres listes.
- **Pagination** par curseur (stable quand de nouveaux faits arrivent), 50 par
  page, avec les flèches communes ; pas de « Charger plus » infini.
- **Entrées contextuelles** : sur la fiche utilisateur et la fiche personne,
  un lien « Historique » vers le journal filtré sur ce compte ou cette fiche,
  visible seulement avec `audit:view`. Il remplace la provenance retirée.
- **Téléphone** : lignes en cartes, détail déplié en place, filtres en rangées
  glissantes (règles mobiles communes) ; page ajoutée au contrôle mobile E2E.
- **États** : chargement, aucun événement (avec rappel de la période),
  aucun résultat pour ces filtres (avec « Effacer les filtres »), erreur avec
  reprise, accès refusé.

### Données et droits

| Donnée | Superadmin | Lecteur `audit:view` | Remarque |
| --- | --- | --- | --- |
| Fait, date, auteur, compte, résultat, gravité | Oui | Oui | Noms figés dans l’événement |
| Événements concernant le compte protégé | Oui | **Non** | Règle existante conservée |
| Changements de champs en clair | Oui | Oui | Identité de la personne |
| Changements chiffrés (coordonnées) | Oui | Seulement s’il a aussi `persons:view_contact` | Le journal ne donne pas plus que le module propriétaire |
| Navigateur | Oui | Oui | Forme courte commune aux sessions |
| Adresse IP | Oui | « Adresse masquée » | Jamais en colonne |
| Métadonnées techniques | Liste autorisée | Liste autorisée | Clés de secrets toujours exclues |

Projection et masquage côté serveur, jamais dans le navigateur.

### Hors première version

Export CSV/JSON ; portée par équipe ou entité ; alertes et tableaux
d’anomalies ; durées de conservation séparées par finalité (la
[fiche Paramètres](parametres.md#portée-du-journal--constat-et-séparation-à-préparer)
garde ce chantier). **Conservation tranchée le 30 octobre 2026 : un an**
(défaut logiciel passé de 1 095 à 365 jours, repère CNIL de six mois à un an),
la période personnalisée du journal est donc bornée à un an.

### Construction prévue

- Module `features/audit` : `server/` (lecture, curseur, projection et
  masquage, trace de consultation), `schemas/` (Zod des filtres),
  `components/`, libellés français de chaque action dans un catalogue testé
  contre l’énumération Prisma (toute nouvelle action sans libellé fait
  échouer les tests).
- Route `GET /api/audit` : `requireAuth` → `requirePermission(AUDIT.VIEW)` →
  filtres validés → service ; page serveur `/systeme/journal-activite`.
- Registre : fonctionnalité `system-activity` passée `live`, `audit:view`
  devient effective. Schéma : une valeur `AUDIT_VIEW` ajoutée à `AuditAction`
  (migration), classée Sécurité, gravité normale. Les index existants couvrent
  date, flux, résultat, gravité, entité et recherche par trigrammes.
- Vérifications : tests Vitest du service (filtres, curseur, masquage IP,
  compte protégé, valeurs chiffrées, catalogue complet), suite PostgreSQL du
  dépôt, banc client (largeurs, états, clavier), E2E sur base jetable avec
  consultation réelle et contrôles mobile et CSP, mesure de lecture sur
  10 000 événements générés.

### Retouche du 31 octobre 2026 : hiérarchie de la ligne dépliée

Retour du propriétaire : « la hiérarchie de couleur n’est pas bonne ». Le bloc
ouvert prenait `surface-row-hover`, plus clair que la barre de filtres ; il
passe en `surface-row-alternate` avec un filet à gauche
([règle](../../design/fondations.md#hiérarchie-de-couleurs)). Capture relue à
1 440 px (banc, scénario `detail-et-filtre-auteur`). Question ouverte
[JA-Q1](../../design/preferences.md#questions-tranchées) tranchée le même jour
(« ok go ») : la ligne fermée nomme les champs modifiés, chacun une fois
(`summarizeJournalChanges` : « Prénom, Nom, Email », puis « Prénom, Nom et 9
autres » ; rien pour un paramètre, déjà nommé dans la colonne voisine) ; le
détail commence par le tableau des changements, puis les faits ; au-delà de
six changements, « Afficher les N autres changements » / « Afficher moins »
(un seul changement de plus est affiché directement). Un changement de fiche
porte son champ seul (`field`) en plus du libellé « Rubrique · Champ ». Banc
14/14, captures relues à 1 440 et 390 px.

### Règle pour toutes les pages (31 octobre 2026)

Décision du propriétaire : toute page ou API qui modifie une donnée doit être
lisible dans ce journal dès sa livraison. Liste de contrôle et relevé de
couverture dans [Q15 — Audit et historique](../../references/audit-historique.md).
Premier effet, le même jour : les refus de la limitation de débit apparaissent
en « Tentatives bloquées » (type Sécurité, mention « Échec », retenues par
les filtres « Importants » et « Échecs »), une fois par blocage, avec l’étape, la preuve refusée et la durée.

### Livraison du 30 octobre 2026

Livrée telle que cadrée, avec ces écarts, tous vérifiés :

| Sujet | Livré | Motif |
| --- | --- | --- |
| Pagination | Pages numérotées de 50 lues à un **instantané** (`asOf`) fixé par la première page et repris par les suivantes ; « Actualiser » et tout filtre en prennent un nouveau ; 200 pages au plus | Même stabilité qu’un curseur, avec la pagination commune et le total annoncé |
| Trace de consultation | `AUDIT_VIEW` écrit **par le serveur** avant toute réponse, au plus une fois par lecteur et par quart d’heure ; si la trace échoue, rien n’est lu | Une trace demandée par le navigateur pourrait être omise ; filtrer ne doit pas inonder la ligne de temps |
| Période | 24 h, 7 jours (défaut), 30 jours, 1 an ; **pas de dates personnalisées** | « 1 an » couvre toute la conservation ; à ajouter sur besoin |
| Filtres rapides | Sans compteur ; le total de la vue s’affiche dessous | Un compteur par filtre demanderait une requête chacun |
| Recherche | Noms et identifiants figés de l’auteur et du compte concerné, sans repli des accents ; trois lettres ou chiffres minimum ; `%` ignoré | Index trigrammes existants |
| Auteur absent | « Aucun compte reconnu » pour une tentative de connexion, « Système » sinon, décidé par le serveur | Ne pas le déduire du libellé |
| Lignes | Composant `Button` (règle des primitives) ; mention d’importance (« Échec », « Important », « À surveiller ») jamais tronquée, le libellé l’est | Captures à 768 px |
| Requêtes de conteneur | Sans nom (`@container (min-width: 44rem)`) | Un module CSS peut renommer un nom de conteneur (constaté avec esbuild) |
| Fiches | Lien « Historique » dans l’en-tête de la fiche utilisateur et de la fiche personne : journal sur 1 an filtré sur ce compte ou cette fiche ; absent pour le compte protégé vu par un autre | Remplace la provenance retirée le 27 octobre |

**Modèle de lecture, confirmé par le propriétaire le 31 octobre 2026** (« ok go ») :
`audit:view` montre **tous les événements**, de tous les types, avec les noms
de l’auteur et du compte concerné ; les autres droits du lecteur ne règlent que
les **valeurs** et les **liens** du détail. Un journal limité à ce que le lecteur
peut déjà consulter laisserait des actions hors de sa surveillance ; la
permission est critique (double authentification) et chaque lecture est tracée.

**Droits, vérifiés par les tests** : le compte protégé et ses événements sont
exclus pour tout autre lecteur ; lien « Ouvrir le compte » seulement avec
`users:view` (corrigé le 31 octobre 2026 : il menait à une page refusée), comme
« Ouvrir la fiche » avec `persons:view` ; l’IP n’est servie qu’au superadmin ;
coordonnées et réseaux d’une fiche en clair seulement avec
`persons:view_contact`, identité et rattachement avec `persons:view` (sinon
« Valeur masquée », nom « Fiche du répertoire ») ; email de contact d’un compte
seulement avec `users:view_contact` ; les métadonnées brutes ne quittent
jamais le serveur (liste fermée de champs et de faits).

**Vérifications** : 11 tests Vitest (`audit-journal.test.ts` : URL, libellé
de chaque action Prisma, masquages, filtres, instantané, trace) ; suite
PostgreSQL `audit-journal-postgres.test.ts` (vraie route : refus, trace
unique, compte protégé, IP, filtres, recherche insensible à la casse) ; banc
client [journal-activite-2026-10-30](../../audits/journal-activite-2026-10-30/banc-client/README.md)
12/12 à 1 440, 768, 390 et 320 px, captures relues ; E2E : parcours réel
(`e2e/activity-journal.checks.ts`) et contrôle mobile, **réussi le 31 octobre 2026**
(base jetable locale, build de production : trace « Journal consulté », compte
créé listé, IP visible pour le superadmin, filtre Sécurité, lien « Historique »
de la fiche utilisateur ; contrôle mobile de la page et aucun refus CSP).

### Sélection des 36 points

À examiner : Q01–Q07, Q09–Q12 (une valeur d’énumération), Q13 (migration
additive), Q14 (curseur et instantané), Q15, Q17, Q19, Q22, Q27, Q30, Q33–Q36.
Non applicable : Q08 (aucun destinataire), Q20 et Q21 (pas d’export ni de
fichier dans cette version), Q24 et Q26 (ni gouvernance ni finances), Q23
(aucun traitement différé ajouté). Hors impact : Q16 (rien n’est supprimé ;
purge existante inchangée), Q18 (aucun problème mesuré), Q25 (fiches lues
comme objets d’audit), Q28 et Q29 (déploiement et sauvegarde inchangés ; la
nouvelle valeur d’énumération est couverte par les sauvegardes existantes).

## Identité et état

- Route : `/systeme/journal-activite`, module `features/audit`.
- Public : personnes autorisées à consulter le journal global détaillé.
- Revue puis correction autorisée le 27 septembre 2026 : interface, filtres et
  présentation du journal. API, permissions, schéma et conservation inchangés.
- État initial examiné : commit `bbf8c58` ; composant client de 1 864 lignes
  et route de 1 041 lignes au moment de la revue.
- État à la revue de septembre : corrections fonctionnelles et visuelles vérifiées avec API simulée.
  Les contrôles sur session/base réelles et les volumes de production restent ouverts.
- Références : [référence générale](../../REFERENCE_GENERALE.md),
  [système de design](../../design/README.md), [permissions](../../domaines/permissions.md),
  [exploitation](../../exploitation/operations.md),
  [conservation et portée du journal](parametres.md#portée-du-journal--constat-et-séparation-à-préparer).
- La [fiche historique](../../propositions/intentions/pages/systeme/journal-activite.md)
  contient des fonctions et routes prévues ; elle ne décrit pas l’état livré.

## Fonction et décisions de cadrage

Retrouver un fait, comprendre son auteur, l’objet concerné, sa date et son résultat,
puis examiner les changements ou extraire les événements autorisés. C’est une page
d’investigation en lecture, alimentée par les modules propriétaires des actions.
Une liste chronologique avec détails dépliables convient à cet usage ; elle doit
rester dense, explicite et stable pendant la consultation.

Conserver les choix déjà donnés pour le site : sidebar fixe à gauche, centrage
du contenu dans les limites disponibles, titre sobre et description courte,
surfaces bleu ardoise, contours discrets, couleurs utiles aux états et badges sobres.
Le fil d’Ariane rend ici le bouton « Accueil du pôle » redondant. Pas de rail
statistique, notification ou graphique supplémentaire sans besoin identifié.

Le choix de chaque composant est réexaminé ci-dessous : un journal ne doit pas
reproduire automatiquement la liste Utilisateurs ou le formulaire Paramètres.

## Sélection des sujets

Profondeur fonctionnelle pour les parcours ; lecture sensible pour droits,
détails personnels et exports. L’analyse n’autorise aucune nouvelle purge.

| ID | Classement | Motif |
| --- | --- | --- |
| Q01 | À examiner | Compréhension d’un événement et investigation administrative |
| Q02 | À examiner | Hero, libellés, navigation, URL et filtres contextuels |
| Q03 | À examiner | Choix des composants, densité, fonds, couleurs et états |
| Q04 | À examiner | Clavier, focus, cibles et largeurs intermédiaires |
| Q05 | À examiner | Recherche, filtres, curseur et accumulation des résultats |
| Q06 | À examiner | Dates personnalisées et application des critères |
| Q07 | À examiner | Chargement, vide, erreur persistante, copie et export |
| Q08 | Non applicable | Aucun destinataire à notifier après une simple consultation |
| Q09 | À examiner | Droit global, export distinct et compte protégé |
| Q10 | À examiner | Validation, curseur, secrets et contenu du fichier exporté |
| Q11 | À examiner | Anciennes valeurs, coordonnées, IP et conservation existante |
| Q12 | À examiner | AuditLog, AuditFieldChange, snapshots, sélection et index |
| Q13 | Hors impact | Analyse sans changement de schéma ni format persisté |
| Q14 | À examiner | Requêtes successives, instantané et contrat des filtres |
| Q15 | À examiner | Fidélité des événements, valeurs avant/après et actions anciennes |
| Q16 | Hors impact | Aucune suppression exécutée ou proposée ; conservation suivie dans Paramètres |
| Q17 | À examiner | Lots, rendu cumulé, détails chargés et export volumineux |
| Q18 | À examiner | Complexité constatée ; aucun cache nouveau justifié |
| Q19 | À examiner | Page et route volumineuses, catalogue de présentation incomplet |
| Q20 | À examiner | CSV/JSON téléchargés, sans stockage documentaire ajouté |
| Q21 | À examiner | Périmètre, limite, formats et protection des exports |
| Q22 | À examiner | Dates locales, fuseau affiché, intervalle et instantané |
| Q23 | Hors impact | Maintenance existante inchangée ; aucun traitement différé ajouté |
| Q24 | Non applicable | Pas de décision juridique ou de transfert d’entité dans cette page |
| Q25 | Hors impact | Fiches personnes lues comme objets d’audit, sans modifier leur parcours métier |
| Q26 | Non applicable | Aucun flux financier ou contrat géré par cette page |
| Q27 | À examiner | Tests existants, navigateur et limites de la simulation |
| Q28 | Hors impact | Déploiement et planificateur non modifiés ni validés par cette revue |
| Q29 | Hors impact | Aucune donnée persistante changée ; restauration non rejouée |
| Q30 | À examiner | Suivi durable et cohérence avec les références actuelles |

## Constats et traitement

P1 : parcours incorrect ou contenu difficilement exploitable. P2 : compréhension,
cohérence ou maintenabilité à améliorer. Les niveaux ne signifient pas une faille
de sécurité démontrée.

| ID | Priorité / état actuel | Constat initial et preuve | Traitement réalisé ou restant |
| --- | --- | --- | --- |
| JA-01 | P1 — corrigé et vérifié | À 768 px avec sidebar de 264 px, le résumé du premier événement ne dispose que de 2 px dans la grille ; la carte passe de 72 à 272 px et ses textes se chevauchent. `JournalCard` utilise `md:grid-cols-[minmax(0,1fr)_14rem_10rem_2rem]`, déclenché par la fenêtre plutôt que la largeur utile. | Grilles déclenchées par la largeur du conteneur. À 768 px : résumé de 344 px et ligne de 116 px ; à 1 920 px : ligne de 68 px. Aucun chevauchement reproduit. |
| JA-02 | P1 — corrigé et vérifié | À la même largeur, les filtres avancés ont 408 px disponibles pour 511 px de contenu. La grille mélange des seuils de conteneur avec `md:col-span-2`, `xl:col-span-4` et une rangée de dates `sm:flex-row`. Des contrôles sortent du panneau. | Grilles des filtres et des dates basées sur le conteneur ; boutons Filtres/Actualiser côte à côte sur petit écran. Contrôles et détails sans débordement de 320 à 1 920 px. |
| JA-03 | P1 — corrigé et vérifié | Activité propose « Connexion réussie ». L’interface envoie `logType=activity&action=LOGIN_SUCCESS`, explicitement refusé par l’API. Le test serveur existant rejoué confirme le refus ; le navigateur confirme la sélection et la requête produite. | Catalogues Activité/Connexions séparés, parité de classification vérifiée avec le serveur pour toutes les actions persistées. Liens entrants et critères normalisés avant écriture et requête. |
| JA-04 | P1 — corrigé et vérifié | Depuis un lien `entityType=PERSON&entityId=…`, cliquer Connexions conserve l’entité et éventuellement le champ. L’API interdit ces critères avec ce journal. Le navigateur produit la combinaison invalide et affiche une erreur avec la réponse simulée. | Bascule vers Connexions : retrait de l’entité, du champ, de l’enregistrement, de la catégorie, du pôle et de la page ; auteur, compte concerné, recherche et période conservés. Parcours navigateur vérifié. |
| JA-05 | P1 — corrigé et vérifié | `PERSON_UPDATE` apparaît comme « a réalisé une action » ; `nickname` reste un nom technique dans les changements. Les actions PERSON_CREATE/UPDATE/DELETE sont absentes du sélecteur ; PERSON et PARTNER sont absents des catégories malgré leur présence dans le modèle. | Catalogue complet des actions et catégories persistées, y compris les partenaires historiques. Libellés et valeurs des champs de personne dans le module propriétaire ; archive historique des comptes préservée. |
| JA-06 | P2 — corrigé et vérifié | Le label « Acteur, cible ou événement » promet une recherche d’événement ; `buildSearchFilter` recherche uniquement les noms et identifiants de connexion figés des acteurs/cibles. La description, l’action et le nom de la fiche personne ne sont pas recherchés. | Label « Auteur ou compte concerné » et aide « nom ou identifiant de compte », avec minimum de trois lettres/chiffres. Recherche serveur non élargie. |
| JA-07 | P2 — corrigé et vérifié | Le bouton Actualiser perd le focus après activation au clavier à cause de sa désactivation native pendant la lecture. | Actualiser conserve le focus avec aria-disabled et une garde pendant la lecture. Charger plus et retrait de filtre ont également un focus de reprise contrôlé. |
| JA-08 | P2 — corrigé et vérifié | Une période de trois ans est soumise alors que l’API limite les plages personnalisées à 366 jours. Le détail d’erreur du serveur n’est pas affiché ; seule l’erreur générale apparaît. Les dates manquantes/inversées utilisent un toast. | Choix personnalisé préparé sans requête implicite ; dates appliquées explicitement, bornes/fuseau visibles, erreur locale reliée aux deux champs et focus sur le champ à corriger. Plage invalide bloquée avant la requête. |
| JA-09 | P2 — corrigé et vérifié | Hero en grande carte arrondie avec icône et accent, bouton Accueil du pôle et description centrée sur les comptes. Mesuré à 128 px sur grand écran et 257 px à 320 px. | Titre simple et description courte ; suppression de la carte décorative et du retour vers le pôle. |
| JA-10 | P2 — corrigé et vérifié | Chaque événement répète auteur/cible dans la phrase puis dans les filtres. Cartes séparées, fonds translucides sombres et dates longues alourdissent le balayage. | Panneau bleu ardoise commun, séparateurs, lignes de 68 px sur grand écran. Fait/objet/auteur/date sans répétition ; liens de filtrage déplacés dans les détails. |
| JA-11 | P2 — corrigé et vérifié | Retrait d’un filtre mesuré à 14 × 18 px. Les boutons d’export et de copie restent petits ; les liens d’identité ne disent pas explicitement qu’ils filtrent. Le chevron d’ouverture disparaît en mobile, bien que le titre reste actionnable. | Critères supprimables sur toute leur surface, commandes de 40 px sur bureau / 44 px sur petit écran, chevron visible à chaque largeur, copie et accès aux détails techniques agrandis. |
| JA-12 | P2 — corrigé et vérifié | Le badge « Détails sensibles visibles » reste constant : l’API fixe désormais cette visibilité à true pour `audit:view`. Les deux boutons CSV/JSON et « Filtres par défaut » occupent une rangée permanente. | Badge constant et mention des filtres par défaut retirés. Export regroupé dans un menu CSV/JSON ; la rangée des critères apparaît seulement quand elle est utile. |
| JA-13 | P2 — corrigé et vérifié | « Exporter la vue » exporte tous les résultats des filtres, avec un nouvel instantané à la demande, pas les seuls événements affichés. La limite de 50 000 n’est annoncée qu’après troncature. L’export reste disponible pendant une recherche/actualisation. | Portée et plafond annoncés avant export. Format et requête capturés au clic et réutilisés après confirmation d’identité ; scénario vérifié avec modification des critères entre la demande et la confirmation. Nouvelle demande bloquée pendant attente, erreur de lecture ou critères non appliqués. |
| JA-14 | P2 — corrigé et vérifié | La transformation des changements de personne abandonne `sectionKey`, `recordId`, `id` et le type d’opération pour ne garder que champ/avant/après. Deux contacts modifiés peuvent donc devenir ambigus ; les clés React fondées sur les valeurs peuvent aussi coïncider. | Changements de personne conservés avec id, section, recordId et opération ; rendu Avant/Après complet, identifiant d’enregistrement visible, clés stables. Deux coordonnées du même champ distinguées dans le parcours navigateur. |
| JA-15 | P2 — mesure locale ; suivi ouvert | Huit lots de 25 laissent 200 événements montés ; le client conserve tous les lots sans borne. Chaque réponse inclut déjà les détails, même fermés. L’export est diffusé par lots côté serveur mais entièrement assemblé en blob côté navigateur. | 200 événements montés et sept ajouts de 25 exécutés dans Chromium avec API locale simulée (environ 0,7 s pour tout le scénario automatisé). Ce résultat ne mesure ni PostgreSQL, ni la mémoire des gros exports, ni les appareils modestes. Pas de virtualisation/cache/détails différés ajoutés sans mesure représentative. |
| JA-16 | P2 — client corrigé ; route à suivre | Un seul fichier client contient filtres, URL, requêtes, export, lignes et détails ; la route concentre validation, lecture, curseurs, projection et export. Des tolérances de taille existent déjà dans le contrôle d’architecture. | Client séparé en orchestration, filtres/URL, barre d’outils et ligne/détails ; libellés de personne dans leur module. Exception de taille du client retirée. La route serveur inchangée garde sa dette de découpage, à reprendre lors de sa prochaine évolution fonctionnelle. |

### Choix de chaque composant

| Élément | Décision actuelle | Points à reprendre à chaque évolution |
| --- | --- | --- |
| En-tête | Titre « Journal d’activité » et description courte, sans carte décorative | Une seule ligne sur grand écran, retour lisible sur petit écran, un seul h1 |
| Activité / Connexions | Conserver le choix segmenté, états nettement perceptibles | Nom du groupe, clavier, critères remis à zéro et liens directs |
| Recherche | Saisie libre adaptée à une investigation, avec aide distincte du placeholder | Portée réelle, trois lettres/chiffres, saisie de deux caractères, effacement et réponses tardives |
| Période | Sélecteur de périodes usuelles ; deux dates uniquement lorsque nécessaire | Libellés Début/Fin visibles, fuseau, bornes, dates non appliquées et erreur locale |
| Filtres avancés | Action, domaine/page, catégorie ou résultat seulement si utiles | Cohérence entre critères ; catalogue exhaustif sans options interdites ; ne pas ajouter tous les filtres serveur par automatisme |
| Critères actifs | Résumé compact supprimable | Cibles, nom lisible quand aucun résultat, contexte de fiche/record, focus après retrait |
| Actualiser | Action secondaire proche des résultats | Occupé, répétitions bloquées, focus conservé et résultats antérieurs clairement identifiés en cas d’échec |
| Exporter | Une commande secondaire donnant accès aux formats autorisés | Filtres figés, réauthentification, borne, progression/erreur, interruption et taille réelle |
| Événement | Ligne chronologique dense avec ouverture des détails | Auteur/objet sans répétition, libellé du fait, état, date, noms longs et largeur utile |
| Date | Date courte utile à la comparaison, détail exact disponible | Événements très proches, secondes/fuseau dans le détail, date relative vieillissante |
| Couleurs et badges | Surface neutre ; échec, avertissement et criticité distingués par texte et couleur | Contraste réel au repos/survol/focus, pas de grands fonds colorés par type d’action |
| Avant / Après | Valeurs complètes, avec contexte et type du champ | Booléens, dates, unités, valeurs supprimées, données confidentielles et modifications multiples |
| Détails techniques | Repli secondaire conservé | Noms français, monospace réservé aux valeurs techniques, copie et longues valeurs |
| Charger plus | Curseur serveur conservé ; présentation à borner selon les volumes | Focus du premier nouvel élément, erreur/reprise, résultats remplacés et nombre de lignes montées |

## Bases à conserver

- Contrôle serveur de `audit:view`, puis `audit:export` et preuve récente pour
  exporter. Le droit global donne volontairement accès au journal détaillé ; le
  droit contextuel `audit:view_field_history` (provenance d’un champ) a été
  retiré le 27 octobre 2026, en attendant ce journal. Aucun nouveau
  droit n’est justifié par la seule correction visuelle.
- Exclusion des événements du compte protégé pour les autres lecteurs ; projection
  des métadonnées par liste autorisée, avec exclusion des clés de secrets.
- Requêtes validées strictement, recherche bornée et caractères SQL jokers échappés.
  Pagination de 25 par défaut, plafond de 100, tri `createdAt/id`, curseur signé
  lié aux filtres et instantané temporel conservé entre lots.
- Annulation des requêtes précédentes, filtres persistés dans l’URL, attente de
  350 ms pour la recherche, résultats conservés pendant une actualisation.
- États vide/erreur avec reprise ; ouverture des détails au clavier et focus
  déplacé vers le premier nouvel événement lors du chargement d’un lot.
- Exports CSV/JSON avec permissions identiques à la lecture, plafond de 50 000,
  lots serveur de 500, protection des cellules CSV contre les formules et audit
  des phases demandée/terminée. Ces éléments ont des tests serveur simulés.
- Index composites et trigrammes présents dans le schéma ; résolution des noms
  de personnes groupée en une requête par lot. Leur présence ne mesure pas leur efficacité.
- Noms de comptes figés dans l’événement ; nom d’une fiche personne résolu dans
  l’état courant, avec identifiant conservé si elle n’existe plus. Préserver cette
  distinction entre état actuel et fait historique dans les textes.

La conservation est commune aux événements et à leurs changements associés.
La séparation future des finalités est déjà documentée dans le suivi Paramètres ;
cette revue ne la transforme pas en changement de schéma ni en nouvelle durée.
Le journal n’est pas une sauvegarde ni le propriétaire des engagements métier.

## Contrôles exécutés et limites

- **Build de production réussi** le 27 septembre 2026 avec `bun run build` :
  génération Prisma, compilation Next.js, lint, types et 22 pages statiques.
  Un premier échec Windows `EPERM` lors du remplacement du moteur Prisma a disparu
  à la relance, sans modification du code ni arrêt de processus.
- **175 tests ciblés réussis dans cinq fichiers** : `system-activity-journal-ux-contracts`,
  `audit-visibility`, `user-audit-redaction`, `system-page-route`,
  `users-access-hardening`. Le total inclut les protections des comptes ; il ne
  représente pas 175 parcours propres au journal. Les contrats client sont désormais
  testés par leurs fonctions, sans recherches de chaînes dans le fichier de page.
- **TypeScript et ESLint ciblé réussis**, y compris le parcours navigateur permanent.
  Le contrôle global d’architecture reste en échec sur `components/ui/sidebar.tsx`
  (925 lignes pour une limite de 900), préexistant et hors périmètre. Le client
  du journal respecte désormais la limite standard, sans exception.
- **Chromium : 1 920, 1 440, 1 024, 768, 390 et 320 px**, vrais composants et styles
  du dépôt, avec shell/session/routeur et API simulés. Le vrai dialogue de
  confirmation d’identité est rendu, sa réponse API est simulée. La police de
  l’aperçu est Arial ; le téléchargement de la police de production n’est pas validé.
- Le parcours réutilisable system-activity-journal.checks.ts (retiré)
  couvre les critères contextuels, la séparation des actions, les détails de deux
  coordonnées, la suppression de filtres, les dates sans soumission implicite,
  erreurs locales, focus Actualiser/Charger plus, conservation des lignes après
  erreur, reprise, vide, chargement initial, 200 lignes et export après confirmation
  avec critères modifiés entre-temps. Il est intégré à `admin-smoke.spec.ts` ;
  la suite complète avec connexion/base réelles n’a pas été exécutée ici.
- Captures inspectées sur bureau, largeur intermédiaire et mobile, avec détails
  ouverts ; absence de débordement interne des filtres et des changements vérifiée.
  Ouverture au clavier et focus visible de ligne contrôlés. Le refus de copie du
  navigateur donne un retour d’erreur ; le succès et la valeur copiée sont vérifiés
  avec un presse-papiers simulé, sans modifier celui du poste.
  Refus d’accès côté client vérifié avec une session simulée sans droit.
- Mesures de contraste sur les textes rendus au repos, au survol, au focus et dans
  les détails : minimum observé **6,93:1** sur les données de démonstration.
  Bordure du champ de recherche sur son fond : **4,73:1** ; contour de focus de
  ligne sur fond actif : **6,08:1**. Ces mesures ne certifient pas tous les états
  de tous les composants partagés ou d’autres thèmes.
- Aucune donnée réelle consultée ou modifiée, aucun export réel créé. Le fichier
  CSV de test contient uniquement des événements fictifs. Aucune erreur JavaScript
  non interceptée lors des parcours vérifiés.
- Captures, fichiers téléchargés et montage temporaires supprimés après vérification.

## Points ouverts et déclencheurs

| Sujet | Prochaine vérification / déclencheur |
| --- | --- |
| Session et base réelles | Exécuter le smoke test sur base E2E isolée avant validation complète de livraison ; vérifier noms historiques, droits effectifs et retours de liens de fiches. |
| Volumes et exploitation (JA-15) | Mesurer SQL, mémoire/rendu sur plusieurs centaines puis milliers de faits et export proche de 50 000, avec matériel représentatif. Définir ensuite si navigation bornée ou détails à la demande sont nécessaires. Les 200 lignes simulées ne fixent aucun seuil de production. |
| Route volumineuse (JA-16) | Séparer validation, sélection/curseur et export lors d’un prochain changement serveur, en conservant les contrats de confidentialité et les tests de flux. |
| Accessibilité et moteurs | Lecteur d’écran, zoom natif, Safari/Firefox, appareil tactile réel et police de production restent à contrôler. |
| Contrôle d’architecture global | Réduire le fichier sidebar lors du travail sur ce composant ; ne pas relever sa limite pour masquer l’échec. |
| Conservation et reprise | Aucun exercice de purge, restauration ou révocation de droit pendant un export n’a été rejoué ; suivi d’exploitation existant conservé. |

## Questions à reprendre à chaque évolution

- Un nouveau fait a-t-il un libellé compréhensible, une catégorie, une portée,
  une gravité et des filtres compatibles, y compris après le retrait du module ?
- La page distingue-t-elle acteur, compte cible et objet métier sans les confondre ?
- Les valeurs affichées correspondent-elles au fait historique ou à l’état actuel ?
- Peut-on identifier précisément le contact ou l’enregistrement modifié ?
- Les filtres proposés produisent-ils une requête acceptée, même depuis un lien
  contextuel ou après passage entre Activité et Connexions ?
- La liste correspond-elle aux critères visibles quand une nouvelle lecture échoue ?
- Que signifient « exporter », « période » et « actualisé » pour la personne qui lit ?
- La largeur utile, les noms longs et plusieurs centaines de faits restent-ils lisibles ?
- Les nouvelles données justifient-elles toujours les mêmes lecteurs et la même conservation ?

## Historique utile

| Date | Travail | Résultat |
| --- | --- | --- |
| 27 septembre 2026 | Analyse de la page et de ses composants | 163 tests ciblés ; défauts de filtres, libellés, adaptation et focus documentés |
| 27 septembre 2026 | Correction autorisée après analyse | Interface et filtres repris, export figé, changements contextualisés, client découpé ; 175 tests ciblés et parcours Chromium réussis avec dépendances simulées |
