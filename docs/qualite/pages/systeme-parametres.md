# Suivi de page — Paramètres système

## Identité et état

- Route : `/systeme/parametres`, module `features/settings`.
- Public : administrateurs autorisés à consulter et modifier la configuration globale.
- Dernière passe : 27 septembre 2026, après accord sur l'analyse initiale du code `b24dcdf`.
- État : présentation et corrections implémentées, contrôles ciblés réussis.
  Les limites d'exploitation et de validation complète figurent ci-dessous.
- Références : [revue générale](../REVUE_GENERALE.md),
  [design system](../../DESIGN_SYSTEM.md), [navigation](../../NAVIGATION.md),
  [permissions](../../PERMISSIONS.md), [exploitation](../../OPERATIONS.md).
- La [fiche historique](../../../features/pages/systeme/parametres.md) reste
  consultable ; ce suivi porte les décisions et résultats courants.

## Fonction et décisions courantes

Une page de configuration explique la valeur effective, sa portée, son défaut,
les conséquences d'une modification et sa prise d'effet. L'enregistrement est
indépendant par réglage, car leurs risques diffèrent.

| Réglage | Défaut logiciel | Bornes | Portée réelle |
| --- | --- | --- | --- |
| Lignes par défaut | 25 | 10–100 | Pagination de certaines API lorsque la requête ne fournit pas sa propre limite ; le répertoire conserve sa pagination |
| Notifications | 180 jours | 30–730 | Notifications lues, non lues et archivées ; une expiration individuelle peut entraîner une suppression antérieure |
| Journal d'activité | 1 095 jours | 365–3 650 | Journal et détails des changements associés, y compris historique des personnes |

Ces valeurs ne constituent pas une justification métier ou juridique universelle.
La portée est globale, sans déclinaison par équipe, saison ou entité juridique.
Une augmentation ne restaure pas les données purgées. Une réduction conserve la
confirmation explicite et la preuve récente de mot de passe côté serveur.

### Composition retenue

- Titre simple, description courte « Réglages globaux de Noctambule. » et Actualiser secondaire.
- Deux panneaux compacts : Interface générale et Conservation des données.
- Fond `surface-panel-raised`, bleu de la famille de la sidebar ; rayons locaux
  de 8 px, pas d'ombre sur les panneaux ni de hero décoratif.
- Explication à gauche, champ/unité/action à droite quand la largeur le permet ;
  empilement sur petit écran. Sidebar et géométrie globale inchangées.
- Trois boutons Enregistrer au repos ; Annuler et Rétablir le défaut seulement
  quand utiles. Hauteur des actions de réglage : 40 px sur grand écran, 44 px en mobile.
- État « Non enregistré » discret, sans fond coloré ; valeur appliquée affichée
  lorsqu'elle diffère. « Valeur par défaut » remplace « Recommandé ».
- Avertissement contextualisé pour une diminution ; rappel d'irréversibilité
  commun. Pas de rail statistique, de recherche ou d'onglets injustifiés.

### Intégrité et erreurs

- Un conflit ne remplace aucun brouillon. Seule la valeur/version appliquée du
  réglage concerné est relue. Choix explicite : utiliser la valeur actuelle ou
  conserver la saisie, puis enregistrer. Si la relecture échoue, seule une
  nouvelle lecture permet de débloquer cette sauvegarde.
- Les erreurs de sauvegarde restent dans le réglage et les saisies sont conservées.
  Les succès gardent leur toast ; aucun nouvel événement de notification.
- Une même comparaison numérique pilote le garde de navigation et la sauvegarde :
  `025` et `25` ne créent plus un faux changement ; une saisie invalide reste protégée.
- Entrée soumet le réglage. Le focus revient au champ après annulation,
  restauration du défaut ou résolution du conflit.
- La modification de conservation des notifications et sa purge partagent un
  verrou PostgreSQL transactionnel, même avant la première ligne de configuration.
  La durée est lue après acquisition, dans la transaction `ReadCommitted`.
- La commande reste atomique, avec un délai maximal de 60 secondes. La fonction
  SQL de purge du journal et son contrôle de durée sont conservés.
- Les requêtes de verrou exposées à Prisma convertissent le résultat `void` en
  `text` ; le test PostgreSQL a révélé l'incompatibilité de la forme précédente.
- Pas de migration, de changement de bornes, de nouvelle permission ou de table métier.

## Sélection des sujets

Profondeur fonctionnelle pour l'interface, sensible pour les effets de conservation.
« À examiner » indique la sélection ; les résultats et limites figurent plus bas.

| ID | Sujet | Classement | Motif |
| --- | --- | --- | --- |
| Q01 | Besoin et métier | À examiner | Trois réglages globaux et des conséquences différentes |
| Q02 | Parcours et contenu | À examiner | Compréhension de la portée, du défaut et de l'enregistrement |
| Q03 | Composition et couleurs | À examiner | Hero, cartes, densité, actions et badges |
| Q04 | Accessibilité et adaptation | À examiner | Champs, focus, clavier, dialogues et petit écran |
| Q05 | Listes et pagination | À examiner | Consommateurs indirects du nombre de lignes |
| Q06 | Formulaires et validations | À examiner | Brouillons, bornes, annulation et confirmation |
| Q07 | Retours immédiats | À examiner | Succès, erreur et conflit |
| Q08 | Notifications | À examiner | Conservation des notifications existantes, sans nouvel événement requis |
| Q09 | Permissions | À examiner | Lecture et écriture de réglages globaux |
| Q10 | Sécurité | À examiner | API, CSRF et preuve de mot de passe |
| Q11 | Confidentialité et conservation | À examiner | Suppression différée et portée réelle des durées |
| Q12 | Schéma Prisma | À examiner | Valeur JSON, version, auteur et relations supprimées en cascade |
| Q13 | Migrations | Hors impact | Correction sans modification de format ; SQL existant lu pour comprendre la purge |
| Q14 | API et concurrence | À examiner | Versions concurrentes et maintenance destructive |
| Q15 | Audit | À examiner | Modification tracée et historique lui-même soumis à conservation |
| Q16 | Suppression | À examiner | Réduction d'une durée et nettoyage ultérieur |
| Q17 | Performance | À examiner | Catalogue borné ; coût indirect de la pagination et des purges |
| Q18 | Cache | À examiner | Fraîcheur des réglages consommés ailleurs |
| Q19 | Architecture | À examiner | Catalogue partagé, écran, routes et maintenance |
| Q20 | Documents et fichiers | Non applicable | Aucun dépôt ou document produit par cette page ; sauvegarde traitée en Q29 |
| Q21 | Imports et exports | Non applicable | Aucun parcours d'import/export métier nécessaire ici |
| Q22 | Dates et localisation | À examiner | Jours, seuils de purge et date de dernière modification |
| Q23 | Automatisation | À examiner | Exécution de maintenance extérieure à la page |
| Q24 | Gouvernance de structure | Non applicable directement | Aucun mandat, transfert ni changement d'entité ; responsabilité des durées à qualifier en Q11 |
| Q25 | Vie esport | Non applicable directement | Aucun parcours sportif ; l'historique des personnes peut être affecté par Q15/Q16 |
| Q26 | Finances et contrats | Non applicable | Ces réglages ne constituent pas une politique de conservation des pièces financières ou contractuelles |
| Q27 | Tests | À examiner | Contrats, routes et parcours navigateur ciblés |
| Q28 | Exploitation | À examiner | Planification, erreurs et observation des purges |
| Q29 | Sauvegarde et restauration | À examiner | Persistance des réglages et limites de récupération après purge |
| Q30 | Configuration et documentation | À examiner | Catalogue fermé, portée documentée et suivi réutilisable |

## Résolution des constats initiaux

| ID | Constat initial | Traitement et état actuel |
| --- | --- | --- |
| PAR-01 | Conflit effaçant les autres brouillons | Corrigé et vérifié en navigateur : deux saisies conservées, résolution explicite, nouvelle version utilisée, échec de relecture sans perte |
| PAR-02 | Purge des notifications avec une durée devenue obsolète | Corrigé et vérifié avec trois scénarios PostgreSQL concurrents ; verrou partagé et lecture après attente |
| PAR-03 | Grandes cartes et hero disproportionnés | Corrigé et inspecté sur six largeurs ; en-tête de 72 px sur grand écran contre 162 px initialement |
| PAR-04 | Titres comprimés et cartes de plus de 700 px à 320 px | Corrigé et inspecté ; aucune icône imposée devant le titre, aucun débordement horizontal mesuré |
| PAR-05 | Surfaces trop sombres, arrondis et effets | Panneaux bleus, arrondis locaux de 8 px, dialogues de confirmation locaux sans ombre/zoom ; primitives générales inchangées |
| PAR-06 | “Recommandé” sans recommandation contextuelle | Libellés remplacés par “Valeur par défaut”, champs nommés et bornes explicites |
| PAR-07 | Valeur appliquée confondue avec la saisie | État non enregistré et valeur appliquée affichés ; actions secondaires contextuelles |
| PAR-08 | Portée trop générale de la pagination | Texte précisant les consommateurs et les paginations propres, sans changer les autres listes |
| PAR-09 | Alertes répétées, conséquences incomplètes | Texte de portée par réglage, détail des notifications expirées et de l'historique lié, alerte au moment d'une diminution |
| PAR-10 | Planification annoncée sans observation | Texte corrigé en “prochaines exécutions de maintenance” ; planificateur réel toujours à vérifier en exploitation |
| PAR-11 | Erreur uniquement dans un toast éphémère | Retour local persistant et brouillon conservé, vérifiés avec erreur 500 et conflit suivi d'une erreur de lecture |
| PAR-12 | Faux changement pour `025` | Corrigé ; régression unitaire et navigateur sur une valeur numériquement équivalente |
| PAR-13 | Clavier, tailles et chargement | Soumission Entrée, focus restauré, cibles harmonisées et squelette de deux groupes ; auteur de modification et lien historique restent à qualifier selon le besoin |

## Contrôles exécutés

- **53 tests réussis dans 9 fichiers**, dont trois tests PostgreSQL réels.
  Suites : `system-settings-page-ux-contracts`, `system-settings-routes`,
  `system-page-route`, `notification-retention`, `notification-retention.integration`,
  `unsaved-navigation-history`, `unsaved-history-events`,
  `person-audit-deletion-guards`, `platform-foundation`.
- Tests PostgreSQL : schéma neuf au nom aléatoire, tables minimales et données
  propres au test, schéma supprimé à la fin. Purge attendant une augmentation avec
  réglage existant, même course sans ligne initiale, modification attendant la
  fin d'une purge. Vérification de l'attente réelle dans `pg_locks`, des données
  conservées et de l'expiration individuelle. Aucune purge des données du site.
- Régression navigateur durable dans
  [system-settings.checks.ts](../../../apps/web/e2e/system-settings.checks.ts),
  appelée depuis le smoke administrateur. Exécutée ici sur le montage isolé ;
  le smoke complet avec authentification réelle n'a pas été rejoué.
- Montage Chromium : composant, styles, formulaires et dialogues réels ; shell,
  routeur, utilisateur et API simulés. Largeurs 1 920, 1 440, 1 024, 768, 390 et
  320 px. Aucun débordement horizontal mesuré ni erreur JavaScript.
- Parcours : chargement et squelette, accès refusé, données incomplètes, erreur
  initiale puis reprise, échec d'actualisation, bornes et champ vide, focus,
  couleurs forcées, navigation/actualisation annulées, saisie numérique équivalente,
  enregistrement par Entrée, requête lente, brouillons concurrents, conflit,
  relecture échouée puis réussie, erreurs persistantes et mot de passe simulé
  incorrect puis correct. Captures inspectées et fichiers temporaires supprimés.
- À 390 px, hauteur défilable du montage : environ 1 253 px contre 2 197 px lors
  de l'analyse ; à 320 px, environ 1 505 px contre 2 871 px. Ces mesures décrivent
  le montage, pas une certification de l'application complète déployée.
- TypeScript et lint ciblé réussis. `git diff --check` réussi.
- Le contrôle global d'architecture échoue toujours sur le fichier inchangé
  `components/ui/sidebar.tsx` : 925 lignes pour une limite de 900. Aucun
  dépassement signalé pour les fichiers de paramètres.
- Documentation Prisma consultée avec Context7 et confrontée à Prisma 6.19.3
  installé ; comportement du verrou vérifié sur PostgreSQL local.

## Points restant à qualifier

| Sujet | Limite | Déclencheur / prochaine étape |
| --- | --- | --- |
| Exploitation | Planificateur quotidien et alerte de maintenance non vérifiés sur le déploiement | Vérifier la configuration et un compte rendu de passage dans l'environnement exploité |
| Volumes | Pas de mesure de purge à fort volume ; transaction bornée à 60 s | Mesurer avant de changer index, lots ou architecture de traitement |
| Conservation | Défauts logiciels, sans qualification universelle des obligations et exceptions | Faire qualifier les durées pour les données réellement détenues et les entités concernées |
| Donnée stockée invalide | Repli existant vers le défaut ; avertissement serveur, sans diagnostic dédié dans la page | Qualifier un besoin d'observation avant d'ajouter une interface d'incident |
| Historique | Date affichée ; auteur et lien direct vers l'audit non ajoutés | Si nécessaire, réutiliser le journal et ses droits, sans nouvelle collection d'historique |
| Validation complète | Pas de lecteur d'écran, mobile physique, restauration, test de charge ni parcours complet avec session réelle | Contrôler selon le risque du prochain déploiement ; ne pas assimiler simulation API et test d'accès réel |

Les protections de permission, CSRF, preuve de mot de passe, version et audit
transactionnel ont été examinées dans le code et les tests ciblés. La sauvegarde
inclut `SystemSetting` ; aucune restauration n'a été exécutée ici. Le cache local
reste limité au nombre de lignes, jamais aux durées de conservation.

## Questions à reprendre lors de chaque évolution

- Est-ce un réglage global, une préférence personnelle ou une politique d'entité ?
  Qui décide, qui modifie et qui est affecté ?
- Quels écrans et traitements consomment la valeur, quand devient-elle effective,
  et quelles valeurs explicites prennent le dessus ?
- Le défaut est-il un choix logiciel ou une règle métier justifiée ? La page
  distingue-t-elle valeur appliquée, défaut et saisie non enregistrée ?
- Un conflit, une panne ou une perte de session préserve-t-il les autres saisies ?
- Une purge peut-elle utiliser une durée obsolète ? Quelles données et relations
  supprime-t-elle, y compris notifications non lues et historique des personnes ?
- Qui assume les durées et exceptions ? L'évolution association/société ne doit
  pas appliquer ces trois réglages à tous les contrats et documents par défaut.
- Comment constate-t-on l'exécution de la maintenance et ses échecs ? L'écran
  promet-il uniquement ce que le système peut effectivement connaître ?
- Comment restaurer configuration et données de manière cohérente ? Augmenter
  une durée ne constitue pas une restauration.
- Si le volume ou le nombre de processus augmente, faut-il revoir les lots,
  délais de verrouillage, index et cache ? Mesurer avant d'ajouter une architecture.
- Chaque nouveau réglage appartient-il à cette page ou à son module métier ?

## Rejouer la régression de concurrence

Depuis `apps/web`, fournir `RETENTION_TEST_DATABASE_URL` dans l'environnement,
puis exécuter `bunx vitest run src/__tests__/notification-retention.integration.test.ts`.
Sans cette variable, ces trois tests sont ignorés. Le compte doit pouvoir créer
et supprimer le schéma temporaire propre au test. Préférer une base de test.
La commande s'exécute directement, hors cache Turbo, et n'appelle jamais la
commande globale de maintenance.

## Historique utile

| Date | Travail | Résultat |
| --- | --- | --- |
| 27 septembre 2026 | Analyse complète initiale | Perte de brouillons reproduite, course de purge identifiée, proposition compacte |
| 27 septembre 2026 | Mise en œuvre approuvée | Présentation reprise, conflits préservant la saisie, concurrence PostgreSQL testée ; incompatibilité `void`/Prisma révélée puis corrigée |
