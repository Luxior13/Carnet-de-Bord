# Suivi de page — Paramètres système

## Identité et état

- Route : `/systeme/parametres`, module `features/settings`.
- Public : administrateurs autorisés à consulter et modifier la configuration globale.
- Dernière passe : 27 septembre 2026, édition à la demande des durées et examen
  de la portée du journal, après retrait du réglage global de pagination.
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
| Journal d'activité | 1 095 jours | 365–3 650 | Journal et détails des changements associés, y compris historique des personnes |

Le réglage de conservation des notifications a été retiré le 9 octobre 2026 avec
le module : le catalogue ne contient plus que le journal d'activité. Une ancienne
ligne `notifications.retentionDays` en base est ignorée et un PUT sur cette clé
retourne 404.

Ces valeurs ne constituent pas une justification métier ou juridique universelle.
La portée est globale, sans déclinaison par équipe, saison ou entité juridique.
Une augmentation ne restaure pas les données purgées. Une réduction conserve la
confirmation explicite et la preuve récente de mot de passe côté serveur.

Le nombre de lignes est désormais un défaut logiciel commun de **25**, porté par
`PAGINATION.DEFAULT_LIMIT`. Les utilisateurs, journaux et répertoire
utilisent cette base ; leurs limites explicites et plafonds restent inchangés.
Une exception doit être justifiée par la page. Un sélecteur local ou une préférence
personnelle ne s'ajoute que si utile, sans réglage administrateur global.

`ui.defaultPageSize` est retiré du catalogue et n'est plus lu : une ancienne ligne
en base est ignorée et un PUT sur cette clé retourne 404. Elle n'est pas supprimée
physiquement, et les événements d'audit historiques sont préservés. Aucune migration
SQL n'est nécessaire. Une ancienne page de paramètres ouverte doit être rechargée
après déploiement. Le cache local dédié à cette clé est supprimé ; les durées
restent relues en base avant utilisation.

### Composition retenue

- Titre simple, description courte « Réglages globaux de Noctambule. » et Actualiser secondaire.
- Un panneau compact : Conservation des données, avec ses deux réglages.
- Fond `surface-panel-raised`, bleu de la famille de la sidebar ; rayons locaux
  de 8 px, pas d'ombre sur les panneaux ni de hero décoratif.
- Explication à gauche, champ/unité/action à droite quand la largeur le permet ;
  empilement sur petit écran. Sidebar et géométrie globale inchangées.
- Au repos : durée appliquée lisible et bouton Modifier par réglage pour les
  administrateurs autorisés. Aucun champ ou bouton Enregistrer permanent.
- Modifier ouvre la saisie et place le focus dans le champ. Annuler reste disponible
  même sans changement ; il abandonne ce seul brouillon et referme son édition.
  Un succès confirmé referme le réglage ; erreur, conflit et confirmation annulée
  le gardent ouvert. Les autres brouillons restent indépendants.
- Hauteur des actions de réglage : 40 px sur grand écran, 44 px en mobile.
- En édition, Annuler précède immédiatement Enregistrer dans un même groupe
  aligné à droite, sous le champ et son aide. Le groupe reste sur une seule ligne
  en mobile ; Rétablir le défaut peut passer sur une ligne séparée.
- Bloc de valeur limité à 16 rem, empilé sous l'explication sur petit écran.
  En édition, le libellé visible « Durée de conservation » précède le champ ;
  son nom accessible précise le réglage. Bornes et défaut indiquent les jours.
- Champ de durée composé « − valeur + », avec unité à droite et flèches natives
  masquées localement. Pas d'un jour ; saisie directe conservée pour les écarts
  importants. Boutons de 40 px sur grand écran et 44 px sur petit écran,
  noms accessibles contextualisés, flèches haut/bas du clavier conservées.
  Chaque ajustement garde le focus dans le champ et ne soumet pas le formulaire.
- L'ajustement est désactivé à la borne correspondante, pendant l'attente et
  sur une saisie vide, fractionnaire ou hors plage. La saisie invalide reste
  corrigeable et n'est pas remplacée silencieusement par une valeur par défaut.
  Une réduction garde l'avertissement et la confirmation d'enregistrement existants.
- La molette est neutralisée au-dessus du champ actif pour éviter de modifier
  une durée par accident, sans retirer le focus. Le défilement doit alors se faire
  hors de cette cible ; le geste de zoom avec Ctrl/Cmd n'est pas intercepté.
  Le comportement reste local à ces deux réglages, sans modifier la primitive Input.
- État « Non enregistré » discret, sans fond coloré ; valeur appliquée affichée
  lorsqu'elle diffère. « Valeur par défaut » remplace « Recommandé ».
  Aucun « Jamais modifié » au repos : seule une modification réelle affiche sa date.
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
- Entrée soumet le réglage. Le focus revient à Modifier après annulation ou succès,
  et au champ après restauration du défaut ou résolution du conflit. Une
  actualisation réussie referme les éditions ; le bouton Actualiser garde le focus
  pendant la lecture, reste annoncé occupé et ignore les activations répétées.
- La modification de conservation des notifications et sa purge partagent un
  verrou PostgreSQL transactionnel, même avant la première ligne de configuration.
  La durée est lue après acquisition, dans la transaction `ReadCommitted`.
- La commande reste atomique, avec un délai maximal de 60 secondes. La fonction
  SQL de purge du journal et son contrôle de durée sont conservés.
- Les requêtes de verrou exposées à Prisma convertissent le résultat `void` en
  `text` ; le test PostgreSQL a révélé l'incompatibilité de la forme précédente.
- Pas de migration, de changement de bornes, de nouvelle permission ou de table métier.

### Portée du journal : constat et séparation à préparer

Examen du code le 27 septembre 2026, sans changement de durée ni exécution de purge.
Le défaut logiciel reste **1 095 jours** ; ce maintien ne valide pas sa pertinence
pour chaque finalité. Les notifications restent à **180 jours** par défaut.
Archiver une notification ne prolonge pas sa conservation.

| Ensemble constaté | Données et usages actuels | Point à trancher avant de séparer les durées |
| --- | --- | --- |
| Connexions et sécurité | Connexions réussies/échouées, verrouillages, sessions, mot de passe, MFA, preuves d'action sensible ; acteur, IP et navigateur selon événement | Finalité de sécurité, durée utile à l'analyse et métadonnées minimales |
| Administration | Comptes, autorisations, paramètres, exports, envois de notifications et publications internes | Séparer la preuve de l'action administrative du contenu métier qu'elle concerne |
| Historique des personnes | `PERSON_*` et anciennes/nouvelles valeurs dans `AuditFieldChange`, dont certaines chiffrées ; lecture depuis la fiche personne | Justifier les champs nécessaires et leur horizon d'utilisation ; cet historique ne constitue pas à lui seul un parcours sportif daté |
| Événements historiques | Anciennes actions `PARTNER_*` et traitements retirés toujours lisibles | Préserver leur interprétation ; définir le sort de chaque type ancien avant une classification rétroactive |

Constats structurants :

- La fonction SQL `purge_expired_audit_logs` filtre uniquement la date de création
  avec la durée globale. Elle ne distingue ni action, ni catégorie, ni finalité.
- `AuditFieldChange` dépend de `AuditLog` avec suppression en cascade. L'historique
  affiché par `getPersonFieldHistory` disparaît donc avec l'événement parent ; le
  chiffrement ne modifie pas cette règle. La suppression d'une personne dispose
  en plus de sa procédure de purge des valeurs, distincte de la maintenance.
- `ACTIVITY` couvre aussi la sécurité ; `IDENTITY` contient comptes et personnes ;
  `SYSTEM` mélange configuration, publications et anciens partenaires. Ces champs
  existants ne suffisent pas à déduire une politique de conservation métier.
- Une trace de modification métier reste une trace applicative. La renommer
  « historique métier » ne justifie ni une conservation illimitée ni trois ans
  par défaut. Les engagements datés, pièces et faits métier à conserver ont leur
  propre finalité et ne doivent pas dépendre uniquement d'un journal technique.

La [CNIL recommande généralement six mois à un an pour la journalisation](https://www.cnil.fr/fr/securite-tracer-les-operations),
y compris les traces applicatives, avec des exceptions à justifier. Source consultée
le 27 septembre 2026. Ce repère ne fixe pas la durée des dossiers et documents métier.

Séparation future, **non implémentée dans cette passe** :

1. Définir par finalité les événements/champs nécessaires, leurs lecteurs,
   le début du délai, la durée et les éventuelles exceptions, avec le responsable
   de la structure. Qualifier séparément traces et faits métier durables.
2. Établir un classement exhaustif des actions actuelles et historiques ; ne pas
   traiter automatiquement une action inconnue comme supprimable. Prévoir ce
   classement pour chaque nouvel événement.
3. Faire évoluer la purge, les liens parent/détails, les contrôles de schéma et
   les réglages de manière cohérente. Prévoir migration compatible, sauvegarde
   et simulation des volumes concernés avant toute nouvelle suppression.
4. Tester frontières de dates, concurrence, détails chiffrés, anciennes actions,
   droits et restauration sur une base isolée. Afficher plusieurs durées seulement
   lorsque leurs périmètres sont réellement distincts dans le traitement.

Références d'implémentation examinées :
[classification des événements](../../../../apps/web/src/shared/server/audit-event.ts),
[schéma et relations](../../../../packages/database/prisma/schema.prisma),
[procédures de purge](../../../../packages/database/prisma/migrations/20260721120000_person_identity_foundation/migration.sql),
[écriture de l'historique personne](../../../../apps/web/src/features/persons/server/person-audit.ts),
[lecture de cet historique](../../../../apps/web/src/features/persons/server/person-history.service.ts).

## Sélection des sujets

Profondeur fonctionnelle pour l'interface, sensible pour les effets de conservation.
« À examiner » indique la sélection ; les résultats et limites figurent plus bas.

| ID | Sujet | Classement | Motif |
| --- | --- | --- | --- |
| Q01 | Besoin et métier | À examiner | Deux réglages globaux de conservation ; pagination sortie de la configuration administrateur |
| Q02 | Parcours et contenu | À examiner | Compréhension de la portée, du défaut et de l'enregistrement |
| Q03 | Composition et couleurs | À examiner | Hero, cartes, densité, actions et badges |
| Q04 | Accessibilité et adaptation | À examiner | Champs, focus, clavier, dialogues et petit écran |
| Q05 | Listes et pagination | À examiner | Défaut partagé de 25, limites explicites et plafonds préservés |
| Q06 | Formulaires et validations | À examiner | Brouillons, bornes, annulation et confirmation |
| Q07 | Retours immédiats | À examiner | Succès, erreur et conflit |
| Q08 | Notifications | À examiner | Conservation des notifications existantes, sans nouvel événement requis |
| Q09 | Permissions | À examiner | Lecture et écriture de réglages globaux |
| Q10 | Sécurité | À examiner | API, CSRF et preuve de mot de passe |
| Q11 | Confidentialité et conservation | À examiner | Suppression différée et portée réelle des durées |
| Q12 | Schéma Prisma | À examiner | Valeur JSON, version, auteur et relations supprimées en cascade |
| Q13 | Migrations | À examiner | Clé retirée sans changement de schéma ; ancienne valeur ignorée, compatibilité de déploiement documentée |
| Q14 | API et concurrence | À examiner | Versions concurrentes et maintenance destructive |
| Q15 | Audit | À examiner | Modification tracée et historique lui-même soumis à conservation |
| Q16 | Suppression | À examiner | Retrait du réglage de pagination ; réduction d'une durée et nettoyage ultérieur |
| Q17 | Performance | À examiner | Catalogue borné ; coût indirect de la pagination et des purges |
| Q18 | Cache | À examiner | Cache du nombre de lignes supprimé ; conservation toujours lue sans cache |
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

Pour le seul retrait de pagination : Q01–Q06, Q09–Q10, Q12–Q14, Q16–Q19 et
Q27–Q30 examinés (parcours, consommateurs, compatibilité et documentation).
Q07–Q08, Q11, Q15 et Q22–Q23 hors impact : retours, événements, durées,
historique et maintenance inchangés ; les régressions ciblées protègent leur usage.
Q20–Q21 et Q24–Q26 non applicables : aucun fichier métier, échange en masse,
engagement juridique, parcours sportif ou financier concerné.

Pour l'édition à la demande et l'examen du journal : Q01–Q04, Q06–Q07,
Q09–Q12, Q14–Q16, Q19, Q22, Q27 et Q30 examinés (parcours, focus, droits,
portée des durées et liens d'historique). Q05, Q08, Q13, Q17–Q18, Q23 et
Q28–Q29 hors impact : pagination, événements de notification, schéma, coût des
requêtes, cache, maintenance et sauvegardes non modifiés. Q20–Q21 et Q24–Q26
non applicables : aucun nouveau document, échange, engagement ou parcours métier.

Retouches de placement et de lisibilité du bloc d'édition : Q01–Q04, Q06, Q22,
Q27 et Q30 examinés (regroupement, libellé, unités, ordre visuel/clavier,
adaptation et suivi). Q05, Q07–Q19, Q23 et Q28–Q29 hors impact : seuls la
composition et les textes changent, sans effet sur les durées ou leur validation. Q20–Q21 et
Q24–Q26 non applicables : mêmes absences de fonctions métier que ci-dessus.

Champ avec boutons −/+ : profondeur fonctionnelle ; Q01–Q04, Q06–Q07, Q19,
Q22, Q27 et Q30 examinés (adéquation du contrôle, unité/pas, validation locale,
focus, défilement, états et documentation). Q05, Q08–Q18, Q23 et Q28–Q29 hors
impact : seules l'édition du brouillon et sa présentation changent, sans nouveau
contrat serveur, changement de bornes, de permission, de durée stockée ou de purge.
Q20–Q21 et Q24–Q26 non applicables : aucun document, échange ou parcours métier ajouté.

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
| PAR-08 | Portée trop générale de la pagination | Réglage global retiré après décision utilisateur ; défaut partagé de 25 dans le code, exceptions locales à justifier |
| PAR-09 | Alertes répétées, conséquences incomplètes | Texte de portée par réglage, détail des notifications expirées et de l'historique lié, alerte au moment d'une diminution |
| PAR-10 | Planification annoncée sans observation | Texte corrigé en “prochaines exécutions de maintenance” ; planificateur réel toujours à vérifier en exploitation |
| PAR-11 | Erreur uniquement dans un toast éphémère | Retour local persistant et brouillon conservé, vérifiés avec erreur 500 et conflit suivi d'une erreur de lecture |
| PAR-12 | Faux changement pour `025` | Corrigé ; régression unitaire et navigateur sur une valeur numériquement équivalente |
| PAR-13 | Clavier, tailles et chargement | Soumission Entrée, focus restauré, cibles harmonisées et squelette dérivé du catalogue (un groupe, deux réglages) ; auteur de modification et lien historique restent à qualifier selon le besoin |

## Contrôles exécutés

### Champ de durée avec boutons −/+

- Régression navigateur conservée dans `e2e/system-settings.checks.ts` : clic,
  activation clavier, retour du focus, flèches haut/bas, bornes des deux durées,
  saisies vides/fractionnaires/hors plage, retour à une valeur valide et molette.
  La modification reste un brouillon ; les boutons ne soumettent pas le formulaire.
- Cette régression du champ a été exécutée dans Chromium sur le composant et les
  styles réels avec état local simulé, pour les deux durées à 1 440, 1 024, 768,
  390 et 320 px. Clics répétés, tabulation, espace, attente, cibles, focus visible
  et absence de débordement contrôlés ; aucune erreur JavaScript.
- Une variation involontaire à la molette a été reproduite dans le premier rendu,
  puis corrigée et revérifiée avec la molette du navigateur. Le geste Ctrl+molette
  reste non intercepté. Rendus ordinateur/mobile et couleurs forcées inspectés,
  texte agrandi à 200 % contrôlé à 768 px. Ce dernier contrôle ne remplace pas
  un zoom natif ou un appareil physique.
- Les 6 tests existants de contrats/validation des paramètres passent. TypeScript,
  lint ciblé et contrôle de diff réussis. Le parcours complet avec API/authentification
  n'a pas été rejoué pour ce champ ; aucune configuration persistante modifiée.
  Captures et montage temporaires supprimés après inspection.
- Références consultées pour conserver la sémantique numérique et les interactions :
  [champ numérique HTML (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/number),
  [interaction spinbutton (W3C)](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/),
  [événement wheel (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event).

### Placement des actions et lisibilité de l'édition

- Groupe Annuler / Enregistrer contrôlé dans Chromium à 1 440, 768, 390 et
  320 px, avec saisie inchangée, modifiée et en cours d'enregistrement : boutons
  côte à côte sous le champ, sans débordement. Annulation au clavier et retour
  du focus vérifiés sur le composant réel monté avec état local simulé.
- Captures inspectées sur ordinateur et mobile, TypeScript et lint ciblé réussis,
  `git diff --check` réussi. Aucun nouveau test permanent pour cette retouche
  de disposition ; les fichiers temporaires sont supprimés après contrôle.
- Après ajout du libellé visible et compactage : 24 cas Chromium sur les deux
  réglages, aux mêmes quatre largeurs, avec saisie inchangée, modifiée ou bloquée
  pendant l'enregistrement. Bornes et défaut avec unités, absence de débordement,
  groupe d'actions et focus vérifiés ; aucune erreur JavaScript. La date reste
  affichée pour une version modifiée ; « Jamais modifié » est retiré.
  Contrôle sur composant et styles réels avec état local simulé, sans appel API
  ni modification d'une durée persistante.

### Édition à la demande et examen de la conservation

- **54 tests réussis dans 8 fichiers** : paramètres, routes et catalogue,
  protections de navigation, historique des personnes et contrats de purge.
  L'examen des procédures SQL est une lecture de code, pas une purge exécutée.
- Régression Chromium durable adaptée : lecture initiale sans champ, ouverture
  au clavier, focus du champ, annulation sans changement ni PUT, sauvegarde fermant
  uniquement le réglage concerné, autre brouillon conservé, erreur, conflit/version,
  relecture échouée puis réussie, saisie numériquement identique, confirmation de
  réduction annulée sans mutation et retour du focus. Réduction confirmée avec
  réponse serveur retardée : champ/actions bloqués, édition refermée seulement
  après succès. Rejouée à 1 440 et 390 px.
- Deux modes inspectés à 1 440 et 320 px ; absence de débordement horizontal
  contrôlée à 1 440, 1 024, 768, 390 et 320 px. Aucun incident JavaScript.
  Profil `USER` refusé avec les règles de permission réelles du client.
- Montage avec composant/styles réels et shell, utilisateur, routeur et API simulés.
  Aucun compte réel ni durée persistante modifiés ; pas de migration, purge,
  restauration ou parcours complet avec authentification réelle exécutés.
- TypeScript, lint ciblé, formatage du scénario et `git diff --check` réussis.
  Captures et montage temporaires supprimés après inspection.

### Retrait du réglage de pagination

- **261 tests réussis dans 14 fichiers** : paramètres, catalogue, pagination,
  notifications, permissions, répertoire et conservation. TypeScript, lint ciblé,
  formatage du scénario navigateur et `git diff --check` réussis.
- Le GET expose uniquement les deux durées, même si une ancienne clé de pagination
  est stockée ; le PUT de la clé retirée est refusé avant lecture ou mutation.
- Les tests de listes vérifient le défaut de 25, les limites explicites, les plafonds
  et l'absence de lecture du réglage retiré. Les lectures successives des deux
  durées utilisent la valeur courante en base.
- Régression Chromium exécutée sur le composant réel avec shell, session et API
  simulés : deux champs, absence de la section Interface générale, sauvegarde par
  Entrée, conservation des deux brouillons, conflit/version, erreur de lecture et
  reprise, erreur persistante, focus et saisie numérique équivalente.
- Rendu inspecté à 1 440 et 320 px ; contrôles de débordement à 1 440, 390 et
  320 px réussis, aucune erreur JavaScript. Le parcours avec authentification réelle
  et les tests PostgreSQL de maintenance n'ont pas été rejoués pour ce retrait.
- Captures et montage temporaires supprimés après inspection. La régression
  navigateur durable reste dans `e2e/system-settings.checks.ts`.

### Passe précédente : refonte et concurrence de conservation

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
  [system-settings.checks.ts](../../../../apps/web/e2e/system-settings.checks.ts),
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
| Portée du journal | Une seule durée purge aussi les détails de l'historique personne ; catégories insuffisantes pour séparer les finalités | Suivre le classement et les étapes documentés ci-dessus avant d'ajouter plusieurs durées ou de réduire le défaut global |
| Donnée stockée invalide | Repli existant vers le défaut ; avertissement serveur, sans diagnostic dédié dans la page | Qualifier un besoin d'observation avant d'ajouter une interface d'incident |
| Historique | Date affichée ; auteur et lien direct vers l'audit non ajoutés | Si nécessaire, réutiliser le journal et ses droits, sans nouvelle collection d'historique |
| Validation complète | Pas de lecteur d'écran, mobile physique, restauration, test de charge ni parcours complet avec session réelle | Contrôler selon le risque du prochain déploiement ; ne pas assimiler simulation API et test d'accès réel |

Les protections de permission, CSRF, preuve de mot de passe, version et audit
transactionnel ont été examinées dans le code et les tests ciblés. La sauvegarde
inclut `SystemSetting` ; aucune restauration n'a été exécutée ici. Les réglages
de conservation n'utilisent aucun cache local.

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
  pas appliquer ces deux durées à tous les contrats et documents par défaut.
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
| 27 septembre 2026 | Retrait du nombre de lignes global | Base commune de 25 dans le code ; deux réglages de conservation, ancienne clé ignorée et cache retiré |
| 27 septembre 2026 | Édition à la demande et portée du journal | Durées en lecture, action Modifier, focus et brouillons préservés ; distinction sécurité/historique documentée, durées et purge inchangées |
