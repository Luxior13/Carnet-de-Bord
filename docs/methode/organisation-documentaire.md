# Organisation documentaire et continuité du travail

[Guide général](../REFERENCE_GENERALE.md) · [Index de la documentation](../README.md)

Le projet a un point d’entrée unique : [REFERENCE_GENERALE.md](../REFERENCE_GENERALE.md).
Il sert à créer, modifier, corriger, optimiser, refactoriser, retirer, auditer
ou documenter. Ce référentiel aide à décider ce qui est utile, correct,
maintenable et vérifiable pour une structure esport ; il ne promet pas une
« perfection » permanente : besoins, données, versions et règles évoluent.

## Parcours de lecture

1. Lire les [consignes du dépôt](../../AGENTS.md) et cadrer le changement avec
   le guide général.
2. Lire la [fiche de la page ou du module](../pages/README.md) et, pour une
   interface, le [système de design](../design/README.md) et les
   [préférences du propriétaire](../design/preferences.md). Les choix déjà
   donnés ne se redemandent pas.
3. Parcourir les 36 points du guide ; ouvrir seulement les fichiers détaillés
   des points concernés. Une question de sélection se pose systématiquement ;
   la lecture détaillée est conditionnelle (sans événement à communiquer
   durablement, Q08 est non applicable et la fiche Notifications n’est pas lue).
   Pour une conception ou reprise approfondie d’interface, utiliser la
   [grille de questions de revue](questions-revue-page.md).
4. Réaliser et vérifier le changement, puis actualiser les documents
   propriétaires dans le même travail (section 6 du guide).

## Où écrire chaque information

| Information | Document propriétaire | Entretien |
| --- | --- | --- |
| Instructions de collaboration | [AGENTS.md](../../AGENTS.md), complété par [CLAUDE.md](../../CLAUDE.md) | Quand la manière de travailler change |
| Parcours, points à examiner, critères de fin | [Guide général](../REFERENCE_GENERALE.md) | Quand un point manque ou devient redondant |
| Règle transversale d’un point du guide | Sa fiche dans [references](../REFERENCE_GENERALE.md#2-points-à-examiner) | Avec la règle commune ; lien depuis le guide obligatoire |
| Contrat d’une fonctionnalité, politique des retours | [Architecture d’une fonctionnalité](../references/architecture-fonctionnalite.md), [politique des retours](../references/feedback.md) | Dans le même changement que la règle |
| Apparence, tokens, composants, comportements, gabarits | [Système de design](../design/README.md) et ses fichiers | Une seule décision par sujet, dans le fichier propriétaire |
| Retour visuel ou d’ergonomie du propriétaire | [Journal des préférences](../design/preferences.md), puis fichier de design propriétaire | Le jour même ; voir la [boucle des préférences](../design/README.md#boucle-des-préférences) |
| Écart entre une page et le design | [Harmonisation](../design/harmonisation.md) | À chaque reprise de page ou de composant partagé |
| Règle métier détaillée : permissions, rôles, navigation, structure | [Domaine concerné](../domaines/README.md) | Dans son document ; jamais recopiée dans chaque page |
| État courant, composition, décisions et points ouverts d’une page ou d’une section | [Fiche de page](../pages/README.md) | À chaque évolution substantielle de la page |
| Inventaire du code (architecture, routes, API, données, tests) et constats | [Cartographie du système](../systeme/README.md) | Quand l’élément est ajouté ou retiré |
| Déploiement, sauvegarde, restauration, secrets | [Exploitation](../exploitation/README.md) | Quand une procédure change ; jamais comme preuve d’exécution |
| Méthode de contrôle approfondi | [Méthode d’audit](audit.md) et [tests et contrôles](../systeme/tests.md) | Contrôles proportionnés, résultats et limites |
| Preuves et constats datés d’une campagne | [Audits](../audits/README.md) et leurs dossiers de preuves | Conserver portée et date ; relier la fiche de page |
| Périmètre produit, besoin futur ou proposition non décidée | [Propositions](../propositions/README.md), avec statut ; [feuille de route](../propositions/feuille-de-route.md) | Nommer le déclencheur et la décision à prendre |
| Fiche transversale à créer quand un module existera | [Sujets futurs](../propositions/sujets-futurs.md) | Avec la création de la fiche correspondante |
| Trames | [Suivi de page](modeles/suivi-page.md), [création ou évolution](modeles/creation-evolution.md), [rapport d’audit](modeles/rapport-audit.md), [décision](modeles/decision.md) | Quand la trame doit évoluer |

Ne pas créer une seconde copie des permissions, du design ou des procédures
d’exploitation : les fiches expliquent quoi examiner et renvoient à ces
références. Un déplacement de document doit améliorer la recherche
d’information et réparer tous ses liens et consommateurs.

## Choisir la bonne source

Les instructions explicites de la tâche définissent le périmètre et les
décisions autorisées. [AGENTS.md](../../AGENTS.md) et ce référentiel organisent
le travail. Les documents propriétaires portent les règles partagées ; la fiche
d’une page porte ses adaptations locales justifiées. Le code et les tests
décrivent l’implémentation.

En cas de contradiction, vérifier statut, périmètre et décision d’origine. La
date la plus récente ne suffit pas à transformer une intention en fonction
livrée. Corriger le document propriétaire avec le changement plutôt qu’ajouter
une règle contraire dans un document secondaire.

| Sujet | Source exécutable ou principale |
| --- | --- |
| Fonctionnalités actives | [Registre](../../apps/web/src/shared/constants/feature-registry.constants.ts) : statut `live`/`planned`, permissions et routes |
| Permissions | [permissions.constants.ts](../../apps/web/src/shared/constants/permissions.constants.ts), décrites dans le [domaine Permissions](../domaines/permissions.md) |
| Routes et alias | [routes.constants.ts](../../apps/web/src/shared/constants/routes.constants.ts), inventoriés dans les [routes](../systeme/routes.md) |
| Tokens et styles | [globals.css](../../apps/web/src/app/globals.css), décrits dans les [fondations](../design/fondations.md) |
| Modèle implémenté | [schema.prisma](../../packages/database/prisma/schema.prisma), compléter par les migrations et contraintes SQL |
| Base de données | [Guide Prisma](../../packages/database/prisma/README.md) : procédures, particularités SQL, sauvegardes |
| Commandes disponibles | [package.json](../../package.json), [web](../../apps/web/package.json), [base](../../packages/database/package.json) |

## Fiches de page

**Chaque page existante a une fiche** dans `docs/pages/`, et chaque section
importante d’une page à sections a la sienne. Les fiches créées le
19 octobre 2026 sans revue propre portent la mention « Suivi à compléter ».

| Périmètre | Organisation |
| --- | --- |
| Page simple | Un fichier dans le dossier de son espace (`pages/`, `pages/systeme/`…) |
| Module de plusieurs pages ou page à sections | Un dossier, un `README.md` commun et un fichier par page ou section importante |
| Composant ou cadre transverse suivi (navigation, modales, états techniques, composants partagés) | Un fichier dans `pages/transverse/` |
| Route de redirection | Pas de fiche ; mention dans l’index de son espace |

```text
docs/pages/
├── README.md                  index général
├── accueil.md, connexion.md   pages simples hors espace
├── mon-compte/                README + profil, securite
├── membres/                   README + repertoire/ (README, liste, creation,
│                              fiche-identite, fiche-coordonnees)
├── systeme/                   README + utilisateurs/ (README, liste, creation,
│                              fiche-profil, fiche-autorisations, fiche-securite),
│                              parametres, feuille-de-route, journal-activite (retirée)
└── transverse/                README + navigation-generale, etats-techniques,
                               composants-partages, modales
```

Le `README.md` d’un module porte la vue d’ensemble, les routes et sections, les
règles communes, les points ouverts communs et les revues qui concernent tout
le module. Chaque fiche décrit son identité, son rôle, sa composition, ses
décisions, ses points ouverts et ses revues datées, et renvoie au README commun.
Une famille de route dynamique (`[id]`) a une fiche par section pour tous les
objets du type, jamais une fiche par objet en base.

Une nouvelle page reçoit sa fiche au moment de sa création, à partir du
[modèle](modeles/suivi-page.md). Une page retirée garde sa fiche, marquée
« retirée » avec la date et le remplaçant. Le contrôle documentaire refuse une
page de l’application sans fiche.

Une fiche présente d’abord l’état courant, les décisions retenues et les points
ouverts. Les revues datées restent en bas de fiche avec leur portée ; les audits
portent les preuves longues et Git les anciennes versions. Éviter l’empilement
de comptes rendus qui se contredisent : une décision remplacée est signalée
comme telle.

## Conserver les décisions sans les transformer

- Une instruction explicite de l’utilisateur définit le périmètre autorisé.
  Une règle commune rejoint sa référence ; une adaptation locale rejoint la fiche.
  Tout point de décision, règle ou connaissance durable évoqué en conversation
  est consigné au fil de l’eau dans le document propriétaire, sans attendre
  d’autorisation.
- Une préférence visuelle du propriétaire s’applique par défaut à toutes les
  pages du même gabarit ; une portée ambiguë devient une question ouverte du
  journal, sans bloquer le travail.
- Une proposition reste une proposition jusqu’à décision. Sa présence dans un
  document ne vaut ni approbation ni livraison.
- Le code et les tests décrivent l’implémentation. Une divergence avec une règle
  est examinée, corrigée ou signalée ; choisir automatiquement le texte le plus
  récent ou le code existant ne la résout pas.
- Les décisions d’un autre projet ne remplacent pas nos contrats. Le site
  Noctambule a fourni des références de rendu (champs adoucis) et de méthode ;
  ses règles métier, ses autorisations et son contexte de production ne
  s’appliquent pas ici.

## Décisions structurantes

Pour un choix transverse coûteux à inverser (modèle d’identité, stratégie
d’accès, architecture d’exécution, migration majeure, mécanisme durable),
rédiger la décision avec le [modèle](modeles/decision.md) et l’intégrer au
document propriétaire de la règle (domaine, fiche transversale ou design) sous
un identifiant stable `DEC-xxx`. Lier la décision depuis les pages affectées.
Le statut « proposée » n’autorise pas à traiter le choix comme déjà livré.
Aucune décision n’est créée automatiquement par ce référentiel.

## État des défauts et des vérifications

La fiche de page porte l’état actif d’un point ; le rapport daté porte sa
preuve initiale et ses compléments. Conserver le même identifiant pour éviter
des listes divergentes. Un défaut partagé a une fiche propriétaire ; les autres
y renvoient. Une clôture précise sa preuve et son périmètre.

Familles d’identifiants : défauts de page (`USR-xx`, `USR-Nxx`, `USR-Dxx`,
`REP-xx`, `COMPTE-xx`, `AUTH-xx`, `NAV-xx`, `PAR-xx`, `ETAT-xx`, `FDR-xx`,
`ACC-xx`…), composants (`UI-Cxx`, `MOD-xx`), autorisations (`AUT-Sxx`), écarts
de design `HARMO-xx`, constats système `SYS-xx`, questions de préférence
`PREF-Qx`, constats documentaires `DOC-xx`.

États utiles : **ouvert**, **en cours**, **corrigé à vérifier**, **clos après
vérification**, **différé avec motif**, **accepté par décision identifiée**.
Accepter un P0/P1 ne rend pas le périmètre global prêt : appliquer les règles
de la [méthode d’audit](audit.md).

Séparer code examiné, données simulées, base isolée et parcours réel. Créer une
fiche ne rejoue pas les anciens tests. Rouvrir les contrôles concernés par un
défaut, une évolution du code, des droits, des données ou de l’environnement ;
ne pas instituer d’audit complet répétitif sans motif.

## Cycle de vie

Avant : préciser le besoin, les impacts, les points applicables et la preuve
attendue. Pendant : réviser la sélection si le périmètre change. À la
livraison : consigner le résultat réel, les limites et les points ouverts.
Après : rouvrir la revue lors d’un incident, changement de rôle, volume,
réglementation, fournisseur, version majeure ou évolution association/société.

Les revues récurrentes ont un responsable et une échéance adaptés au risque.
Éviter une fréquence universelle et des cases cochées automatiquement.

## Ce qui doit rester léger

Une correction de libellé peut se terminer par une vérification ciblée et une
note dans le changement. Une refonte avec permissions, données et notifications
mérite une fiche plus complète. Une fiche dit ce qu’il faut décider ; elle
n’impose ni nouvel outil ni pièce jointe.

Les captures et résultats bruts servent à la revue puis sont supprimables, sauf
lorsqu’un script ou un rapport les cite comme preuve. Leur conservation n’est
pas une condition générale de validation. Garder les décisions, le périmètre
testé et les limites ; respecter la demande de nettoyage.

Un libellé, une couleur ou une action « professionnelle » ne prouve pas la
qualité : il faut que les personnes puissent effectuer leur travail
correctement, retrouver les décisions et corriger les erreurs.

## Références externes

Consultation de cadrage : 26 septembre 2026. Vérifier version et portée avant
d’appliquer une exigence à un nouveau module.

- [W3C — WCAG 2.2, référence pratique](https://www.w3.org/WAI/WCAG22/quickref/) :
  référence des critères d’accessibilité, à sélectionner selon les composants.
- [OWASP — Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) :
  refus par défaut et contrôle des accès sur chaque requête et ressource.
- [OWASP — Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) :
  événements utiles et protection des journaux, sans journaliser les secrets.
- [OWASP — File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) :
  contrôles d’entrée, de stockage et d’accès aux fichiers.
- [CNIL — Durées de conservation](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees) :
  justification par finalité et distinction entre conservation active et archivage.

Pour Prisma, Next.js et les autres outils : partir des versions installées,
résoudre la bibliothèque dans Context7, puis consulter le sujet précis. Une
documentation récente peut décrire une autre version majeure ; ses commandes ne
remplacent pas automatiquement les scripts du dépôt.

Pour une règle juridique, fiscale, contractuelle ou de compétition : consigner
source officielle ou règlement, date, juridiction, entité ou compétition
concernée et personne qui a qualifié son application. Aucun délai universel ni
régime de société n’est déduit du seul projet d’évolution de la structure.

## Index et contrôle

Chaque dossier a un index relié à l’[index de la documentation](../README.md).
Lancer `bun run docs:check` après un changement documentaire et
`bun run docs:check:test` lorsque le contrôleur évolue. Le
[périmètre exact](../README.md#contrôle-du-référentiel) est documenté ; un lien
valide ne prouve ni la justesse du texte ni une fonction livrée.

## Historique

- 26 septembre 2026 : création du référentiel de qualité (`docs/qualite/`),
  revue générale en 30 questions, fiches par sujet, suivis de pages.
- 10 octobre 2026 : [première organisation documentaire](../audits/2026-10-10-organisation-documentaire.md).
- 19 octobre 2026 : organisation complète sur le modèle du site Noctambule —
  dossiers par nature, référence générale en 36 points, une fiche par page et
  par section, système de design, cartographie du système, contrôleur étendu
  ([rapport](../audits/2026-10-19-organisation-complete.md)).
