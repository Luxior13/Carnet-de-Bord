# Audit — liste Utilisateurs, 11 octobre 2026

## Périmètre et point de départ

Demande : appliquer à une autre page la revue approfondie du Répertoire,
y compris comportements, composants, logique, droits, schéma et performances.
Page choisie : `/systeme/utilisateurs`, seconde référence de gestion du site.
Le projet est **en développement** ; les simplifications utiles sont privilégiées,
avec conservation des données et des invariants existants.

Départ : branche `main`, commit `310e845`, arbre propre. Cette passe couvre la liste, son GET,
la recherche, la synthèse globale, la pagination et les départs/retours de fiche.
Elle ne réaudite pas toutes les mutations de création, de fiche ou de Mon compte.
Propriétaire : [suivi Utilisateurs](../qualite/pages/systeme-utilisateurs.md).
Les résultats du [10 octobre](AUDIT_UTILISATEURS_2026-10-10.md) restent datés.

Environnement : Windows, Next 15.5.23, React 19.1.8, Prisma 6.19.3,
PostgreSQL 17 local isolé. Les identités, coordonnées et secrets d'essai sont
fictifs ; aucun essai ne vise la base applicative configurée. Les fichiers privés
d'authentification restent dans le répertoire temporaire du banc.

## Sélection de la revue générale

| Sujets | Traitement |
| --- | --- |
| Q01–Q05 | Besoin, navigation, composition, accessibilité et contrat de liste examinés |
| Q06–Q07 | Saisie des critères, réinitialisation, attente, erreur et reprise ; aucune nouvelle mutation métier ni toast |
| Q09–Q12 | Droits serveur et champs, identité protégée, confidentialité, modèle et contraintes User |
| Q14 | Lecture concurrente, requêtes annulées, réponses tardives, cohérence des lignes et du total |
| Q17–Q19 | Mesures SQL, coût des recherches/agrégations, séparation des responsabilités |
| Q22, Q27 | Dates affichées et validations pertinentes |
| Q30 | Documentation et index mis à jour ; aucune nouvelle dépendance produit |
| Q08, Q20–Q21, Q23–Q26 | Non applicables : aucune notification, pièce, import/export, intégration, entité juridique, relation esport ou finance dans cette liste de comptes |
| Q13, Q15–Q16, Q28–Q29 | Hors impact : pas de migration ni de changement de mutation, d'audit métier, de suppression, d'exploitation ou de sauvegarde ; les invariants persistants utiles à la lecture sont toutefois contrôlés |

Les fiches applicables et les décisions du design system ont été lues. Le tableau,
les cartes mobiles, la recherche, les sélecteurs, les chips, les compteurs, les
liens de compte, l'action de création, les états et la pagination sont inclus.

## Constats et corrections

Les défauts ci-dessous sont **clos après vérification** dans le périmètre
indiqué. Les scénarios et les preuves sont reliés dans les sections suivantes.

| ID | Défaut et impact | Correction |
| --- | --- | --- |
| USR-18 — P2 | Recherche large : collecte de tous les identifiants avant pagination ; 33 000 résultats déclenchent P2035, même pour une page de 25 | Recherche, ordre, total et page restent dans PostgreSQL ; service de lecture dédié, synthèse regroupée |
| USR-19 — P2 | Pendant la pagination, numéro, total et lignes ne décrivent plus la même réponse ; le retour d'une fiche peut viser la page demandée alors que sa ligne appartient encore à la précédente | Page affichée et `returnTo` attachés à la réponse, conservation limitée au même jeu de critères ; reprise lente, échec et succès revérifiés |
| USR-20 — P2 | Pagination absente de l'historique ; filtre choisi pendant la temporisation de recherche susceptible d'utiliser l'ancienne saisie | Historique de pagination et mise à jour cohérente des critères |
| USR-21 — P2 | Une intention de focus ou un ancien instantané de navigation peut survivre à un changement de contexte | Restauration annulable, normalisation des URL et consommation de l'instantané exact |
| USR-22 — P2 | Retrait d'un filtre et reprise d'erreur font perdre le focus | Retour au champ ou aux résultats selon l'action |
| USR-23 — P2 | Nombre absent du nom accessible des compteurs ; identité protégée expliquée seulement au survol ; focus mobile différent du jeton commun | Libellés complets, mention lisible et focus commun |
| USR-24 — P2, défense locale | La carte mobile ne conditionne pas explicitement l'email à `canViewContact`, contrairement au tableau ; le serveur masque déjà le champ | Même condition explicite sur les deux présentations, régression avec donnée simulée excessive |
| USR-25 — P2 | Les alias publics du compte racine ne respectent pas la recherche multi-mots : « racine compte » ou « Compte   racine » ne trouvent rien | Chaque mot doit correspondre à un même alias public ; ordre et espaces libres, identité privée toujours exclue ; régression SQL réelle |

## Modèle de données

`User` reste le compte technique : identifiant de connexion unique, email de
contact facultatif, état actif, rôle, marqueur de compte protégé, horodatages et
état de sécurité. Il n'est pas fusionné avec `Person`. L'accès Superadmin reste
la catégorie du singleton `isProtected`, sans nouvel enum ni nouvelle permission.

La liste sélectionne des champs bornés, sans hash de mot de passe, secret MFA,
session ni graphe de relations. Les projections serveur protègent l'identité du
compte racine pour les tiers et neutralisent contact/sécurité selon les droits.
Les réservations d'identifiants et les tombstones conservent leurs responsabilités.

Les **19 contrôles SQL** sur les 52 migrations appliquées dans la base jetable
réussissent : singleton et cycle de vie racine, profil racine modifiable,
coordonnées facultatives et normalisées, vérification d'email conditionnelle,
unicité/format des identifiants, unicité et référence des réservations,
anonymisation et immutabilité des tombstones, quatre index trigrammes.
Chaque transaction de fixture est annulée. La réservation d'un ancien identifiant
lors d'un changement reste aussi une règle du service de mutation ; ce banc ne
prétend pas que la seule clé étrangère implémente tout ce parcours.

[Banc SQL](utilisateurs-2026-10-11/banc-schema/run.cjs) ·
[Résultats SQL](utilisateurs-2026-10-11/banc-schema/observations.json).
Aucune migration ni modification de `schema.prisma` n'est justifiée par ces essais.

## Mesures serveur et architecture

Le GET garde authentification, autorisations, validation des paramètres et
projection finale. [Le service de liste](../../apps/web/src/features/users/server/users-list.service.ts)
porte les deux lectures SQL. Le POST de création reste inchangé. Les tests HTTP
de liste sont séparés du grand fichier de protection des mutations ; les règles
SQL sont exercées sur une vraie base, avec un schéma de fixtures réduit.

Le [banc serveur](utilisateurs-2026-10-11/banc-serveur/README.md) compare les résultats
avant/après et mesure 33 scénarios sur 25, 1 000 et 10 000 comptes, avec deux
chauffes puis vingt échantillons, une connexion locale et aucune charge parallèle.
À 10 000 comptes, le tri nom passe de **14,42 à 8,28 ms**, la recherche large
de **91,69 à 17,37 ms** en médiane. Deux requêtes par lecture, contre sept ou huit
dans le profil mesuré auparavant. Plus haute médiane après correction : 33,34 ms
pour une recherche de contact ; plus grand p95 : 37,02 ms.

Le total filtré et la page partagent l'instantané de la même instruction SQL.
La synthèse globale vient d'une instruction indépendante ; aucun instantané
transactionnel commun des deux résultats n'est promis. Les index trigrammes
existants ne prennent pas en charge l'expression `lower(translate(...))` : les
plans montrent encore un parcours de table pour la recherche normalisée. Les
mesures présentes ne justifient pas une migration d'index ou un cache. Revoir
les plans en cas de croissance significative ou de latence mesurée excessive.

## Vérifications exécutées

| Preuve | Résultat et portée |
| --- | --- |
| Suite web complète avec `USERS_LIST_TEST_DATABASE_URL` isolée | **1 145 tests réussis, 18 ignorés** ; les 18 tests PostgreSQL Personnes n'ont pas été relancés dans cette passe Utilisateurs |
| Tests serveur ciblés | 157 réussis : 26 API avec authentification simulée, 23 PostgreSQL réels et 108 protections utilisateur ; inclus dans la suite web |
| [Banc client](utilisateurs-2026-10-11/banc-client/README.md) | 42 scénarios Chromium avec routeur/session/API simulés, puis reproduction et reprise ciblée du `returnTo` pendant pagination lente, erreur et réussite |
| [Banc d'intégration](utilisateurs-2026-10-11/banc-integration/README.md) | **10 parcours réels réussis** sur Next de production, mot de passe, MFA, session et PostgreSQL ; 66 comptes de données, un compte protégé et un lecteur fictifs |
| Responsive dans Next réel | 320, 390, 768, 1 120, 1 440 et 1 920 px ; aucun débordement global/principal ; quatre combinaisons contact/sécurité à trois largeurs supplémentaires ; identité d'au moins 260 px quand le tableau est visible |
| Prisma et SQL complet | `prisma validate` réussi avec Prisma 6.19.3 ; 19 contrôles d'invariants sur les 52 migrations isolées, détaillés plus haut |
| Livraison | Build final, typecheck, lint, budget d'architecture et budget de performance réussis ; page Utilisateurs à 266 973 octets gzip selon le script de budget |
| Documentation et patch | `docs:check` et `git diff --check` réussis ; index et suivi courant mis à jour |

Les dix parcours réels contrôlent connexion/MFA, absence de secrets et en-têtes
privés, recherche SQL, synthèse, pagination/historique, fiche puis retour et
rechargement avec focus, responsive, lecteur limité, quatre projections de champs,
révocation en session et API anonyme. Les observations contiennent aussi les
mesures de largeur ; ces sous-mesures ne sont pas comptées comme des parcours
supplémentaires. Captures relues : [mobile](utilisateurs-2026-10-11/banc-integration/users-390.png)
et [desktop](utilisateurs-2026-10-11/banc-integration/users-1920.png).

Une première tentative du banc réel utilisait encore le nom du champ Répertoire ;
le sélecteur du banc a été corrigé puis les dix parcours rejoués intégralement
avec de nouvelles connexions. Ce montage défectueux ne constituait pas un défaut
de l'application. L'enrôlement TOTP initial et les preuves TOTP suivantes ont
réellement traversé les écrans et API de l'application.

## Verdict et limites

**Conforme sur le périmètre vérifié de la liste actuelle.** USR-18 à USR-25 sont
clos ; USR-01 à USR-03 sont complétés pour les parcours et volumes de cette liste.
Aucun défaut confirmé restant ouvert dans ce périmètre. Le style de référence,
les composants communs et la séparation comptes/personnes sont conservés.

Cette conclusion ne certifie pas toutes les mutations des fiches et de création,
ni les extensions de navigateur, Safari/iOS, un lecteur d'écran réel, le zoom
natif ou des appareils physiques. Les performances sont locales, avec données
synthétiques, sans trafic concurrent ni réseau distant. La pagination reste
bornée à 1 000 pages et ne fige pas les données entre deux lectures concurrentes.
Les questions organisationnelles et les futurs besoins de volume restent dans
le suivi, avec déclencheurs explicites ; elles ne bloquent pas le développement.

Les processus Next/PostgreSQL appartenant à ce banc ont été arrêtés. Le cluster,
les fixtures, fichiers privés de configuration et secrets TOTP temporaires ont
été supprimés après vérification du chemin ; seules les preuves fictives utiles
restent dans ce dossier d'audit.
