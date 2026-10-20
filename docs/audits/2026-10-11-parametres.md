# Paramètres système — revue du 10 au 11 octobre 2026

## Périmètre et état examiné

Demande utilisateur : poursuivre la revue sur `/systeme/parametres`, après la
fiche Utilisateurs. Objectif : une configuration compréhensible et cohérente avec
le Répertoire, qui préserve les saisies et les protections de conservation.

Branche `main`, base `7afc856e39b8d240f952edc976a241678ca00091`, avec modifications
locales préexistantes de l'onglet Autorisations conservées. Cette passe examine
`SystemSettingsPage`, `SystemSettingRow`, leurs helpers, les routes GET/PUT,
le catalogue, les écritures versionnées et les dépendances de maintenance.

Un seul réglage actif : `audit.retentionDays`, défaut 1 095 jours, bornes
365–3 650. Lecture et modification restent réservées aux administrateurs et au
compte protégé selon les permissions existantes. Aucune nouvelle permission,
durée, migration ou commande de purge n'est introduite.

## Sélection de la revue générale

| Sujets | Traitement |
| --- | --- |
| Q01–Q04, Q06–Q07 | Besoin, contenu, composition, clavier, mobile, saisie et retours examinés et corrigés |
| Q09–Q11, Q14–Q16 | Droits, session, concurrence, audit et portée de conservation examinés ; changements limités au parcours navigateur |
| Q19, Q22–Q23, Q27–Q30 | Responsabilités, unités/dates, maintenance, tests, reprise et documentation examinés ; aucune exécution de purge ou restauration |
| Q12–Q13, Q17–Q18 | Hors impact : schéma et migrations inchangés, catalogue borné à une ligne, aucune nouvelle requête volumique ni cache |
| Q24–Q25 | Hors impact métier : gouvernance et gestion des personnes inchangées ; leur historique est couvert par Q11/Q15/Q16 |
| Q05, Q08, Q20–Q21, Q26 | Non applicables : aucun besoin de liste filtrée, notification, document, import/export ou engagement financier |

## Constats et corrections

| ID | Nature / priorité | Scénario et correction | Preuve et état |
| --- | --- | --- | --- |
| SET-01 | Défaut P2 | Perdre les droits avec une confirmation ouverte masquait le panneau mais laissait les dialogues montés. Changer de compte avec les mêmes capacités ne relisait pas les réglages. Le contenu est maintenant monté uniquement pour le compte autorisé et réinitialisé au changement de compte/capacité. | Révocation dans la confirmation, rétablissement, compte protégé et déconnexion simulés : clos sur le périmètre navigateur |
| SET-02 | Défaut P2 | Les requêtes manuelles et sauvegardes pouvaient terminer après le départ du compte, avec toast tardif ; le verrou dépendait du rendu React. AbortController, contrôle après attente et verrou synchrone unifient lecture/écriture/relecture de conflit. | Changement de compte pendant une réponse retenue, double soumission synchrone, StrictMode : clos sur le périmètre simulé |
| SET-03 | Défaut P2 | Les fenêtres sans déclencheur Radix ne restituaient pas explicitement le focus au contrôle utile ; le retour fourni par le garde de navigation n'était pas raccordé. Retour explicite au champ, à Actualiser ou au lien d'origine, y compris après annulation du mot de passe. | Clavier et focus contrôlés aux quatre largeurs ; assertions conservées dans le scénario E2E existant : clos |
| SET-04 | Défaut P2 | Erreurs de sauvegarde et conflits annoncés localement mais non reliés au champ. `aria-describedby` les associe ; formulaire occupé et libellé d'enregistrement rendent l'attente explicite. | Inspection du rendu et attente simulée : clos ; lecteur d'écran réel non testé |
| SET-05 | Amélioration P2 | Composition documentaire encore héritée de septembre, panneau différent de la référence, défaut/bornes absents en lecture et portée trop implicite. Surfaces communes, panneau à 10 px, extrémités du champ à 6 px, bornes visibles et conséquences précisées. | Captures et CSS calculé, contrôle d'absence de débordement : livré et vérifié dans le montage décrit |

Ces défauts d'interface ne démontrent pas un contournement des autorisations
serveur. GET et PUT conservent leurs contrôles à chaque appel. La réduction exige
toujours la preuve récente de mot de passe ; la version protège la mise à jour,
et écriture et audit obligatoire restent dans la même transaction.

## Vérifications et preuves

- **Navigateur** : 32 combinaisons, huit parcours à 320, 390, 768 et 1 440 px.
  Vrais composants, primitives et CSS, React StrictMode, Chromium local ; shell,
  contexte utilisateur et réponses API simulés. Police Arial de substitution,
  sans prétendre avoir contrôlé la police Geist du site authentifié.
- Parcours : édition/annulation ; saisie et bornes ; boutons −/+ et flèches ;
  molette et zoom Ctrl ; conflit avec relecture indisponible puis résolution ;
  confirmation de réduction ; mot de passe annulé puis validé ; navigation avec
  brouillon ; refus/perte d'accès ; changement de compte pendant l'écriture ;
  chargement/actualisation en erreur puis reprise ; double soumission et attente.
- Aucune erreur JavaScript ni débordement horizontal sur ces parcours. Le focus
  clavier utilise l'anneau partagé. La régression de double soumission et les
  retours de focus sont conservés dans
  [system-settings.checks.ts](../../apps/web/e2e/system-settings.checks.ts), exécuté
  ici dans le montage isolé ; le smoke authentifié complet n'a pas été exécuté.
- **Suite web**, 11 octobre : `bun run --filter web test` — 86 fichiers réussis,
  2 ignorés ; **1 043 tests réussis, 25 ignorés**. Les tests de routes couvrent
  catalogue fermé, refus, bornes, non-modification, preuve de mot de passe,
  concurrence, versions et audit avec une base simulée.
- `bun run --filter web lint:fix`, `bun run typecheck` et
  `bun run check:architecture` dans `apps/web` : réussis.
- `bun run docs:check` : 180 fichiers, 1 002 liens locaux/index contrôlés ;
  `git diff --check` : réussi.

[Observations des parcours](parametres-2026-10-10/observations.json) ·
[Lecture desktop](parametres-2026-10-10/parametres-1440.png) ·
[Lecture mobile](parametres-2026-10-10/parametres-390.png) ·
[Édition desktop](parametres-2026-10-10/edition-1440.png) ·
[Édition mobile](parametres-2026-10-10/edition-390.png).

Le répertoire des captures porte la date de début de la passe. Les données et le
mot de passe du montage sont fictifs. Les requêtes interceptées n'écrivent aucun
paramètre réel ; aucune maintenance n'a été lancée.

## Limites et suite

Conclusion partielle : corrections vérifiées sur le parcours isolé et la suite
automatisée. Session réelle, contrôle d'origine/CSRF en intégration, transaction
PostgreSQL concurrente, purge, restauration, lecteur d'écran et Safari/iOS réel
non rejoués. Aucun build Next de production n'est revendiqué dans cette passe.

L'annulation HTTP côté navigateur ne garantit pas l'annulation d'une écriture
déjà exécutée côté serveur. Le compte suivant relit la configuration ; les
contrôles d'accès et de version restent la frontière de sécurité.

La séparation des conservations par finalité reste une dette déjà documentée,
à qualifier avant toute évolution de durée ou de purge. Le défaut logiciel n'est
pas une justification juridique universelle. Voir le
[suivi courant](../pages/systeme/parametres.md), propriétaire des décisions
et des prochaines vérifications ; responsable de la qualification : à attribuer.
