# Répertoire — audit complet de la liste du 11 octobre 2026

## Périmètre et état examiné

Demande : terminer `/membres/repertoire` sur ses comportements, ses composants,
sa logique, sa cohérence, son style et ses performances. La liste reste la
référence visuelle choisie par l’utilisateur, complétée par Utilisateurs.

État de départ : commit `f967c3c`, puis corrections locales de cette passe.
La proposition déjà présente dans le suivi Navigation générale est indépendante.
Routes examinées : liste, GET `/api/personnes`, préchargement serveur et parcours
depuis la liste vers création/fiche puis retour. Les modifications des coordonnées,
la suppression et tous les dialogues de la fiche ne font pas l’objet d’un nouvel
audit complet ici ; leurs preuves antérieures restent datées.

Windows, Node 24.14.0, Next 15.5.23, React 19.1.8, Prisma 6.19.3,
PostgreSQL 17.10 en Europe/Paris, Chromium. Trois preuves distinctes :

- [Banc client](repertoire-2026-10-11/banc-client/README.md) : composants et CSS
  réels, contextes/routeur/API simulés pour contrôler pannes et réponses tardives.
- [Banc serveur](repertoire-2026-10-11/banc-serveur/README.md) : vrai service et
  requêtes PostgreSQL, schémas de test uniques, données fictives.
- [Intégration](repertoire-2026-10-11/banc-integration/README.md) : build Next de
  production, 51 migrations appliquées sur une base locale jetable séparée,
  connexion par mot de passe et MFA, sessions, API et stockage réels. Aucune
  donnée du projet courant n’est utilisée ni modifiée.

## Sélection Q01–Q30

| Sujets | Classement et raison |
| --- | --- |
| Q01–Q05 | Examinés : fonction de la liste, navigation, composants, clavier/mobile, recherche, filtres, tri, synthèse et pagination |
| Q06–Q07 | Examinés : commandes de recherche et reprise, retours d’erreur ; création exercée comme parcours sortant de la liste |
| Q08 | Non applicable : aucune notification différée nécessaire à cette lecture |
| Q09–Q11 | Examinés : accès serveur, révocation, séparation des comptes, exposition de coordonnées et preuves fictives |
| Q12–Q15 | Examinés : champs/index sollicités, compatibilité des curseurs, intégrité des lectures, auteur et trace de création ; aucun changement de schéma ou mutation métier |
| Q16 | Hors impact : aucune suppression ni règle d’archivage modifiée ; le refus de lecture relève de Q09 |
| Q17–Q19 | Examinés : mesures de volume, coût SQL, requêtes inutiles, mémoire bornée et responsabilités des composants |
| Q20–Q21 | Non applicables : pas de document, pièce, import ou export dans la liste |
| Q22 | Examiné : dates, départage, UTC et ordre des curseurs sur PostgreSQL Europe/Paris |
| Q23–Q24 | Non applicables : pas d’intégration externe, automatisation ni décision juridique sur cette page |
| Q25 | Examiné : séparation personne/compte et sens limité des deux statuts actuels ; évolution du rattachement différée au cadrage |
| Q26 | Non applicable : aucun montant ou contrat dans ce périmètre |
| Q27 | Examiné : régressions, navigateur simulé, intégration réelle et mesures distinguées |
| Q28–Q29 | Hors impact : déploiement, secrets et sauvegardes du projet inchangés ; environnement de preuve isolé et supprimable |
| Q30 | Examiné : suivi, documentation et reproductibilité ; aucune nouvelle dépendance |

## Éléments et scénarios

| Élément | Contrôle et résultat attendu |
| --- | --- |
| Cadre, titre et action principale | Hero partagé, marges, surfaces et hiérarchie conservés ; création seulement avec droit ; cadre Next vérifié sur mobile et desktop |
| Recherche | 100 caractères, temporisation, Entrée, effacement, espaces/accents/mots multiples, contact avec explication ; la saisie récente gagne contre les réponses anciennes |
| Filtres et tri | Statut, absence de coordonnées, trois tris ; réinitialisation cohérente, URL canonique, retour du focus ; sélecteurs communs au clavier |
| Synthèse | Chiffres globaux explicitement nommés « Tout le répertoire », liens filtrants avec nombre annoncé, suppression après refus d’accès |
| Identité, avatar et statut | Lien de ligne, texte long contenu, fallback d’identité, badge compréhensible ; cartes mobiles reprenant les informations utiles |
| Coordonnées | Nombre et types annoncés, absence explicite ; aucune valeur complète de coordonnée dans la réponse de liste |
| Dernière modification | Date correcte, auteur de la bonne entité, départage déterministe, auteur absent accepté, infobulle accessible |
| Pagination | Total avant curseur, pas de doublon sur trois pages, précédent connu, première page si historique absent/invalide ; anciennes lignes identifiées pendant attente |
| Navigation | URL profonde, retour de fiche, rechargement, restauration du focus et des curseurs ; stockage facultatif, limité au compte et au temps de validité |
| Vide, attente et erreurs | Squelette, aucun résultat, erreur initiale, échec d’actualisation, retry répété, curseur invalide ; aucune perte silencieuse du point de focus |
| Droits et confidentialité | Anonyme, lecture seule, compte protégé, révocation ; SSR interdit sans droit, purge visuelle après 401/403, ancien SSR non repris après changement de compte/droit |
| Création depuis la liste | Saisie, POST réel, fiche ouverte, présence en base et audit, retour à la liste et recherche actualisée |
| Performance | Quatre requêtes SQL par appel, 25/1k/10k fiches ; mémoire des curseurs plafonnée et absence de requête déclenchée par un simple changement de Map |

Les observations de chaque banc précisent les scénarios effectivement exécutés,
leurs données et leur portée. L’arbre d’accessibilité Chromium n’équivaut pas à
une séance complète avec un lecteur d’écran humain.

## Défauts traités

Identifiants propriétaires : [suivi Répertoire](../qualite/pages/membres-repertoire.md).
Les correctifs sont réalisés par cette passe ; aucune nouvelle responsabilité
d’exploitation n’est attribuée à une personne absente de la conversation.

| Point | Défaut et impact | Correction et preuve |
| --- | --- | --- |
| REP-12 — Fraîcheur du préchargement | P1 : revenir aux critères initiaux pouvait réafficher un ancien snapshot SSR | Snapshot lié au compte/critères et consommé une fois ; données associées à leur requête ; retour après modification testé |
| REP-13 — Données après retrait d’accès | P1 : les anciennes lignes et les compteurs restaient visibles après 401/403 | Purge des données et de la synthèse, remontage au changement de compte/révision des droits ; refus serveur et scénario de révocation |
| REP-14 — Curseur et recherche de contact | P2 : normalisation sans accents/casse acceptait un curseur appartenant à un autre ensemble | Signature liée au texte trimé ; reproductions puis succès SQL pour URL `/Case`/`/case` et identifiant `élan`/`elan` |
| REP-15 — Courses et reprise de navigation | P2 : URL retardée pouvant écraser une saisie, restauration rejouée, focus de pagination conservé après changement de filtre | Synchronisation distinguant saisie locale et navigation externe ; restauration consommée après exécution, annulée au changement de filtre ; réponses obsolètes ignorées |
| REP-16 — Requêtes et mémoire évitables | P2 : Map de curseurs dans les dépendances de chargement, croissance en mémoire, critères URL partiellement nettoyés | Dépendance au curseur actif, plafond de 64 entrées, canonicalisation commune ; test de 500 pages, cas limites et courses navigateur |
| REP-17 — Focus des actions disparues | P2 : réinitialisation/retrait de filtre/retry abandonnaient le focus sur le document | Retour au champ ou aux résultats ; nouvel échec remet le focus sur Réessayer ; vérification clavier/navigateur |
| REP-18 — Annonce des compteurs | P2 : types de coordonnées ignorés sur des spans génériques, nombre absent du nom des liens de synthèse | Texte masqué explicite, pluriels et nombre inclus dans le nom accessible ; arbre Chromium contrôlé |

Les anciens curseurs de certaines recherches accentuées ou en majuscules peuvent
être invalides après REP-14. « Première page » conserve les critères et constitue
la reprise prévue ; aucun format de donnée stockée n’est modifié.

## Performance observée

38 scénarios locaux ; première mesure, deux chauffes puis vingt mesures par
scénario. À 10 000 personnes et 100 000 audits : médianes complètes du service de
8,38 à 21,87 ms, p95 maximal de 22,47 ms. Les plans utilisent les index de tri,
coordonnées et dernier auteur ; certains filtres et les totaux parcourent encore
les ensembles nécessaires. Aucun cache ni index supplémentaire ajouté sans besoin
mesuré. Le [protocole serveur](repertoire-2026-10-11/banc-serveur/README.md) conserve
les détails et les plans.

Ces chiffres ne sont pas des temps de chargement navigateur ni une mesure de
production. Pas de charge simultanée ni de benchmark à 100 000 personnes.
Les trois comptes globaux restent lus séparément : une écriture concurrente peut
produire une différence momentanée entre synthèse et liste.

## Validation finale et verdict

| Contrôle du 11 octobre | Résultat |
| --- | --- |
| Suite web avec `PERSONS_LIST_TEST_DATABASE_URL` isolée | **1 126 tests réussis, 10 ignorés** ; 92 fichiers réussis, un ignoré. Les 18 tests PostgreSQL du Répertoire sont inclus ; les dix ignorés concernent l’intégration SQL Utilisateurs non configurée pour cette passe |
| `typecheck` et `lint` web | Réussis sur la version finale |
| Build Next de production | Réussi après les derniers correctifs ; bundle utilisé pour les neuf parcours réels |
| Budgets architecture et performance | Réussis ; Répertoire à 271 741 octets gzip selon le script du dépôt, chunk de route à 11,7 kB dans le rapport Next |
| Banc client | **41 scénarios réussis**, cinq largeurs de 320 à 1 920 px, clavier, erreurs, courses et couleurs forcées |
| Intégration réelle | **Neuf scénarios réussis**, six largeurs, sessions et MFA réelles, base jetable et données fictives ; captures mobile/desktop relues |
| Mesures serveur | **38 scénarios** à 25, 1 000 et 10 000 personnes, plans SQL conservés ; protocole et limites ci-dessus |
| Documentation | `docs:check` réussi (200 fichiers et 1 256 liens/index lors de la passe), six tests du vérificateur réussis ; index et suivi mis à jour |
| Espaces/patch | `git diff --check` réussi |

Verdict : **conforme sur le périmètre vérifié** de la liste et de ses parcours
déclarés. Aucun défaut confirmé ne reste ouvert sur la liste actuelle. REP-01
et REP-03 sont clos dans la portée authentifiée et mesurée ; REP-12 à REP-18
sont corrigés et vérifiés. REP-02 demeure une évolution métier différée, pas
un obstacle au fonctionnement actuel. La palette et la composition ne nécessitent
pas de refonte supplémentaire sur les écrans observés.

Un build intermédiaire a échoué sur le formatage d’un fichier de test en cours
d’édition ; le build final passe. Les premiers contrôles documentaires pendant
la rédaction signalaient le rapport non indexé et un README manquant ; les deux
sont maintenant présents. Les erreurs de protocole des bancs sont décrites dans
leurs README et ne sont pas comptées comme défauts produit ou comme réussites.

Limites à conserver : Chromium sur ordinateur, sans Safari/Firefox ou téléphone
physique, sans Bitwarden installé, sans certification WCAG complète ; charge
locale sans concurrence ; fiche et modales couvertes uniquement par les parcours
déclarés. Réexaminer au changement des permissions, du modèle, des requêtes,
des composants partagés, ou quand le volume réel dépasse le jeu mesuré.

## Complément — schéma et refactorisation pendant le développement

À la suite de la passe ci-dessus, l’utilisateur rappelle que le projet est en
développement et demande une vérification explicite du schéma et des besoins de
refactorisation. Ce contexte est désormais inscrit dans AGENTS et l’architecture :
simplifications utiles maintenant, sans compatibilité fictive, en conservant
l’intégrité et les données locales existantes. Le périmètre complémentaire inclut
les invariants de Person et de ses trois collections, ainsi que leurs mutations.
Q06, Q09–Q16, Q19, Q27 et Q30 sont réexaminés ; les observations visuelles et les
mesures de volume de la première passe ne sont pas présentées comme rejouées.

### Schéma et SQL

Prisma 6.19.3 : `validate` et `format --check` réussissent après mise en forme du
schéma. Les commentaires précisent les propriétaires et les règles SQL ; aucune
colonne ou relation Prisma n’est ajoutée ou supprimée. Person reste indépendante
de User, la naissance est une date civile, les coordonnées sont possédées par la
fiche, leurs unicités sont limitées à la personne/réseau. Le statut binaire actuel
ne remplace pas les futures relations datées, à cadrer lors de leur implémentation.

Les 51 migrations antérieures sont appliquées sur une nouvelle base PostgreSQL
17 jetable `repertoire_schema_test`. Le contrôle est cette fois effectué sur le
schéma complet, contrairement au banc de performance minimal. Les contraintes,
unicités partielles, clés étrangères et cascades sont exercées dans le
[banc de schéma](repertoire-2026-10-11/banc-schema/README.md).

`migrate diff` ne revient **pas vide** avec cette version : il propose de recréer
six index B-tree en `varchar_pattern_ops`. Le catalogue PostgreSQL confirme
pourtant leurs noms, colonnes et classes ; `db pull --print` perd ces classes
lors de l’introspection. Aucune autre différence représentable n’est signalée.
Les [preuves CLI](repertoire-2026-10-11/banc-schema/prisma-checks.json) distinguent
validation du schéma et limite de l’outil ; ce SQL de diff n’est pas exécuté.
Les objets SQL hors représentation Prisma 6 restent gérés par les migrations,
conformément à la [documentation officielle v6](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/unsupported-database-features).
Context7 renvoyait notamment des fonctionnalités de versions ultérieures ;
la source v6 et l’aide CLI installée ont donc servi pour cette vérification.

### Défauts et séparation des responsabilités

| Point | Constat | Correction |
| --- | --- | --- |
| REP-19 — Version lue des coordonnées | P2 : avec une version future fabriquée et une écriture intercalée, un ajout pouvait valider la version finale mais calculer le plafond sur une ancienne collection ; reproduction à 11 emails pour un plafond de 10 | Les six ajouts/suppressions comparent d’abord la version lue à celle demandée, puis conservent la comparaison atomique lors de l’écriture ; tests des trois collections |
| REP-20 — Propriétaire du profil social | P2 : SQL pouvait déplacer un profil social vers une autre personne, alors qu’emails/téléphones le refusent ; aucun transfert proposé par les API actuelles | Migration additive `20261011180000_person_coordinate_ownership`, réutilisant la fonction de contrôle existante ; les trois protections entrent aussi dans le contrôle de disponibilité du module |

Refactorisation : la lecture SQL, ses curseurs, son mapper et ses compteurs sont
regroupés dans `server/person-list.service.ts` (237 lignes). Le service principal
passe de 791 à 563 lignes et conserve création, détail et modification. La façade
`person.service.ts` garde le même contrat pour les routes/pages. Le corps de la
liste est conservé à l’identique, vérifié par empreinte ; ses 18 scénarios SQL
réels passent après extraction. Tests et banc exécutables pointent vers le nouveau
propriétaire. Pas de nouvelle couche générique ni de découpage artificiel du client.

Clôture du complément : **1 135 tests web réussis, 10 ignorés** (SQL Utilisateurs),
dont les 18 régressions SQL de liste ; **21 tests du package database réussis** ;
**29 contrôles SQL sur le schéma complet réussis**, avec le vrai contrôle de
disponibilité reconnu prêt. Types web/database, lint web, build Next, budgets
architecture/performance et `git diff --check` réussissent. Documentation :
201 fichiers et 1 268 liens/index validés avant la dernière mise à jour du suivi.
Les essais de version utilisent une écriture intercalée simulée ; le banc SQL
vérifie le verrouillage optimiste, mais ne constitue pas une charge concurrente
à plusieurs écrivains PostgreSQL.

La migration a ensuite été appliquée à la base de développement configurée via
le wrapper du dépôt : contrôle préalable de 51 migrations terminées, aucune
migration inachevée et cette seule migration en attente ; après application,
52 migrations, trois triggers actifs et vrai catalogue reconnu prêt. Aucune
réécriture des données métier. [Preuve sans coordonnées de connexion](repertoire-2026-10-11/banc-schema/development-migration.json).
REP-19 et REP-20 sont clos après vérification. Le contexte développement permet
d’avancer sur cette base assainie ; aucun autre remaniement structurel important
n’est justifié par les contrôles de ce périmètre.

Cette section étend la portée de la revue aux règles des coordonnées ; elle ne
réécrit pas les preuves historiques du navigateur ni ne vaut audit de tous les
modèles de l’application. Les traces du schéma et de la base restent dans le
[guide Prisma](../../packages/database/prisma/README.md).
