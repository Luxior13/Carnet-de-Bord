# Paramètres système

[Index des pages](../../pages/README.md) · [Espace Système](README.md) · [Design](../../design/README.md) · [Guide général](../../REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/systeme/parametres` |
| Espace | Système |
| Gabarit visé | [D. Page de réglages](../../design/gabarits.md#d-page-de-réglages) |
| État d’harmonisation | Aligné ; refonte du 14 octobre 2026 — voir [Harmonisation](../../design/harmonisation.md#état-par-page) |
| Point d’entrée | [page.tsx](../../../apps/web/src/app/systeme/[[...slug]]/page.tsx) → [SystemSettingsPage](../../../apps/web/src/features/settings/SystemSettingsPage.tsx) |
| Contrôle d’accès | `settings:view` et `settings:update`, liés au rôle ADMIN ; preuve récente pour réduire la conservation ou réparer une valeur |
| Chargement / erreur dédiés | squelette dérivé du catalogue / commune à l’application |

## Focus après actualisation — 25 octobre 2026

Défaut trouvé par l’E2E lors de la [vérification avant nouvelle fonctionnalité](../../audits/2026-10-25-verification-avant-fonctionnalite.md)
(CLO-09) : une actualisation réussie déplaçait le focus de « Actualiser »,
toujours présent, vers le premier titre de carte. Désormais le focus ne passe
dans le contenu que s’il a été perdu, c’est-à-dire quand « Réessayer »
disparaît avec l’état d’erreur. Preuves : E2E réussi ; scénario
`refresh-keeps-trigger-focus` ajouté au banc client, en échec sur l’ancien code
et réussi sur le correctif (34/34).

## Reprise générale — 23 octobre 2026

Dernière page de la reprise générale (« ok go »), relue contre les règles
validées depuis le 20 octobre sur les listes et les fiches : pas de titre de
section répété, pas de cadre imbriqué, une information une seule fois, couleurs
d’alerte réservées aux alertes, barre d’enregistrement au message juste.

- **Résultat** : conforme, **aucune modification**. La carte « Conservation du
  journal » est un groupe de réglages (gabarit D), pas un titre de section ; la
  barre n’apparaît qu’avec un brouillon et son message « Modifications non
  enregistrées » y est exact.
- **Preuves** : banc client du 11 octobre rejoué sans modification,
  [33 scénarios sur 33](../../audits/parametres-complet-2026-10-11/banc-client/preuves/interface-2026-10-23.json) ;
  captures relues : [repos bureau](../../audits/parametres-complet-2026-10-11/banc-client/preuves/interface-repos-1440-2026-10-23.png),
  [repos mobile](../../audits/parametres-complet-2026-10-11/banc-client/preuves/interface-repos-390-2026-10-23.png),
  [modification bureau](../../audits/parametres-complet-2026-10-11/banc-client/preuves/interface-edition-1440-2026-10-23.png)
  et [modification à 320 px](../../audits/parametres-complet-2026-10-11/banc-client/preuves/interface-edition-320-2026-10-23.png).
- **Non vérifié** : session et serveur réels.

## Autorisations actuelles — 15 octobre 2026

L'[audit transverse du site actuel](../../audits/2026-10-15-autorisations-site.md)
confirme par lecture du code et tests simulés que `settings:view` et
`settings:update` restent liés au rôle ADMIN, sans surcharge individuelle.
Leur présentation fixe dans l'éditeur est utile pour expliquer ce rôle.
La preuve récente de mot de passe concerne une réduction de conservation ou
la réparation d'une valeur invalide. La référence Permissions est réconciliée
avec cet état et avec l'existence de la page. Aucune règle ni interface modifiée,
aucune nouvelle purge ou vérification PostgreSQL exécutée.

## Refonte de l'interface — 14 octobre 2026

L'utilisateur a autorisé la proposition issue de l'analyse ci-dessous (« go »).
Le bandeau est compact ; une carte « Conservation du journal » regroupe portée,
champ et aide unique. La saisie directe reste disponible. La barre partagée,
hors de la carte et sur toute la largeur, apparaît pour un brouillon, une
réparation, une attente, une erreur ou un conflit. Rétablir le défaut reste
accessible depuis une valeur personnalisée, même sans brouillon.

Le focus revient au champ après annulation et après enregistrement ou
vérification lorsque l'attente l'a laissé sur BODY. Un focus déplacé volontairement
et une modale ouverte sont respectés. Les réglages serveur, bornes, confirmation
de réduction, preuve de mot de passe et gestion de concurrence sont inchangés.

PAR-UI-01 à PAR-UI-05 sont **clos après vérification dans le périmètre client** :
composition revue, répétitions retirées, actions contextuelles, perte de focus
corrigée, suivi et scénarios réconciliés avec la saisie directe. Aucune correction
des composants partagés ni modification des changements locaux du sélecteur.

Preuves du 14 octobre, séparées des anciennes exécutions :

- [33 scénarios Chromium](../../audits/parametres-complet-2026-10-11/banc-client/preuves/interface-2026-10-14.json)
  réussis : passe de 30, trois compléments et deux reprises ciblées. Rendu et
  clavier de 320 à 1 920 px, sauvegarde lente/double soumission, annulation,
  défaut depuis une valeur personnalisée, conflit, réponse perdue, réduction,
  preuve, réparation et changement d'acteur. Annuler sans nouveau brouillon
  reste désactivé si une écriture incertaine exige encore une vérification.
- Captures inspectées : [repos bureau](../../audits/parametres-complet-2026-10-11/banc-client/preuves/interface-repos-1440-2026-10-14.png),
  [repos mobile](../../audits/parametres-complet-2026-10-11/banc-client/preuves/interface-repos-390-2026-10-14.png),
  [modification bureau](../../audits/parametres-complet-2026-10-11/banc-client/preuves/interface-edition-1440-2026-10-14.png)
  et [modification à 320 px](../../audits/parametres-complet-2026-10-11/banc-client/preuves/interface-edition-320-2026-10-14.png).
- 14 tests de contrôleur/contrats réussis ; TypeScript, lint ciblé et budget
  d'architecture réussis. Le contrôle documentaire est exécuté après mise à jour.
- Documentation React officielle consultée via Context7 : manipulation des refs
  après commit dans un effet, compatible avec React 19.1.8 installé. Aucun
  nouvel API ou changement de dépendance.

Limites : le banc utilise les composants/styles réels avec API, session,
navigation et shell simulés, et Arial en remplacement de Geist. Le helper E2E
est mis à jour mais le parcours Next authentifié n'est pas rejoué ; pas de
nouveau contrôle serveur/base, Safari/iOS, lecteur d'écran ou charge. Les
preuves antérieures conservent leur date. La sélection Q01–Q30 de l'analyse
reste applicable ; la refonte est fonctionnelle côté interface, sans migration.

## Analyse ciblée de l'interface — 14 octobre 2026

Demande utilisateur : expliquer les problèmes de `/systeme/parametres`, dont
l'interface ne convient pas, avec `/membres/repertoire/[id]` comme exemple.
Cette passe analyse et propose ; elle ne réalise pas de refonte.

État examiné : branche `main`, commit `09f256c`, avec les six modifications
locales préexistantes dans les paramètres, leur test de contrôleur et le
sélecteur partagé. Aucun de ces fichiers n'est modifié par cette analyse.
Le code actuel affiche directement le champ aux administrateurs
(`editing = canUpdate`). Les descriptions d'un bouton Modifier et d'une édition
qui se referme, conservées plus bas, ne décrivent donc plus ce rendu local.
L'origine de cette évolution n'est pas déduite du seul diff.

Périmètre : Q01–Q04, Q06–Q07 et Q27, pour composition, textes, saisie, actions,
retours et clavier ; Q30 pour la cohérence documentaire. Q05, Q08, Q20–Q21,
Q24 et Q26 non applicables à cette revue d'un réglage numérique isolé.
Q09–Q19, Q22–Q23, Q25 et Q28–Q29 hors périmètre de validation : droits,
persistance, maintenance, historique des personnes et exploitation conservent
leurs preuves datées ; les clics simulés ne les requalifient pas.

### Constats initiaux — clos par la refonte ci-dessus

Les observations ci-dessous décrivent l'état avant correction. Tous les points
étaient P2 ; les choix esthétiques proposés restent distincts des défauts
reproduits. Les preuves de clôture et leurs limites sont indiquées plus haut.

| ID | Nature et observation | Preuve / attendu | Suite proposée |
| --- | --- | --- | --- |
| PAR-UI-01 | Composition à améliorer : une large explication et un bloc de saisie/actions limité à 256 px ; la barre d'actions reste visible au repos et grandit lorsque Rétablir le défaut apparaît | Chromium 1 440/1 920 px et `SystemSettingRow` ; la fiche membre affiche ses actions seulement après modification ou conflit, en dehors de la carte | Reprendre la hiérarchie de formulaire de la fiche et rendre les actions contextuelles ; ne pas ajouter de navigation pour un seul groupe |
| PAR-UI-02 | Redondance confirmée : bornes et défaut affichés à gauche puis sous le champ ; état non enregistré répété dans le titre et la barre | Deux paragraphes distincts dans `SystemSettingRow`, visibles à 390 et 1 440 px ; le champ arrive après l'ensemble de l'explication en mobile | Regrouper aide et bornes auprès du champ, raccourcir l'explication tout en conservant portée et prise d'effet |
| PAR-UI-03 | Action sans effet au repos : Annuler est actif alors qu'aucun brouillon n'est modifié ; il ne ferme plus d'éditeur | `cancelDisabled={false}` et annulation simulée : retour à 1 095 sans PUT, bouton toujours actif ; la saisie directe est aussi utilisée par la fiche membre et n'est pas en soi un défaut | Afficher les actions quand il existe un changement ou une reprise nécessaire ; conserver l'accès à la réparation/conflit |
| PAR-UI-04 | Défaut clavier : le focus est perdu après un enregistrement réussi par Entrée | Saisir 1 200 depuis 1 095, Entrée, attendre la réponse et deux trames de rendu : champ réactivé mais `document.activeElement` reste BODY ; reproduction distincte confirmée | Restaurer le focus sur une cible utile après réactivation ; contrôler aussi erreurs et réponses lentes lors de la correction |
| PAR-UI-05 | Dette documentaire et de banc : le suivi et les scénarios historiques attendent encore Modifier et la fermeture de l'édition | Lecture du suivi et du banc client du 11 octobre face au code local courant ; les anciens 30/30 ne sont pas rejoués ni présentés comme résultat courant | Après choix de composition, réconcilier décisions, tests de parcours et rendu ; ne pas rétablir l'ancien modèle uniquement pour satisfaire un test |

Sources examinées :
[page](../../../apps/web/src/features/settings/SystemSettingsPage.tsx),
[réglage](../../../apps/web/src/features/settings/SystemSettingRow.tsx),
[contrôleur](../../../apps/web/src/features/settings/useSystemSettings.ts),
[textes](../../../apps/web/src/features/settings/system-settings-page.helpers.ts),
[barre partagée](../../../apps/web/src/components/layout/SectionActionBar.tsx),
[fiche membre](../../../apps/web/src/features/persons/components/PersonIdentitySection.tsx)
et [cadre de fiche](../../../apps/web/src/components/layout/EntityDetailLayout.tsx).

### Vérifications et limites de cette passe

Montages temporaires dérivés des bancs existants, sans modifier leurs preuves :
composants et styles courants, Chromium, API/session/navigation et shell
simulés, police de repli Arial, aucune base ni authentification réelle.

- Sept scénarios ciblés exécutés : rendu à 390, 1 024, 1 440 et 1 920 px,
  annulation puis enregistrement, valeur hors borne et annulation d'une
  réduction. Aucun débordement horizontal dans ces quatre montages ; un seul
  PUT simulé après Entrée, aucun après annulation, valeur 364 refusée,
  confirmation de réduction conservée. La réussite de ces assertions ne
  signifie pas que l'ensemble de la page est validé : le focus perdu est
  relevé séparément dans PAR-UI-04.
- Reproduction supplémentaire de PAR-UI-04 après deux trames de rendu :
  retour au BODY confirmé, défaut ouvert.
- Deux comparaisons de la fiche membre à 390 et 1 440 px : champs directement
  disponibles, barre absente au repos puis visible après modification.
  Captures bureau des deux pages et capture mobile des paramètres inspectées.
- Pas de nouveau contrôle serveur, de concurrence, de lecteur d'écran, de
  zoom natif, de Safari/iOS ni de performance. Les anciennes preuves SQL/HTTP
  gardent leur date et leur portée.

Direction proposée lors de l'analyse, autorisée ensuite : bandeau compact comme
la fiche, carte centrée sur la conservation du journal, champ accompagné d'une
seule aide et actions visibles au moment utile. Les boutons −/+ par jour peuvent
être réexaminés pour une durée de plusieurs années, sans supprimer la saisie
exacte ni changer l'unité stockée. Préserver les confirmations, les bornes,
la distinction entre valeur appliquée et brouillon et les reprises existantes.

## État courant — clôture du socle du 13 octobre 2026

La [revue finale du socle](../../audits/2026-10-12-cloture-socle.md) est
terminée au périmètre livré, pour poursuivre le développement métier. Ses
preuves et limites ne constituent pas une qualification de déploiement.

Le réglage a été modifié via le vrai serveur : CSRF, conflit de version et audit
atomique sont contrôlés. La restauration signée a reproduit les 19 tables du
contrat, dont une ligne SystemSetting. PAR-S-07 est réconcilié dans cette portée
; exploitation, volumes de purge et qualification des durées restent ouverts.

Les décisions et preuves datées ci-dessous restent conservées. Une nouvelle
revue répond à un changement, un défaut constaté ou une règle nouvelle.

## Revue complète du 11 octobre — validations du 12 octobre 2026

La nouvelle passe conserve un seul réglage, ses bornes et son défaut. Elle
corrige la reprise après réponse perdue, les refus d'accès, les attentes et le
focus. La valeur stockée invalide est désormais signalée comme bloquant le
nettoyage du journal ; le défaut proposé peut être réparé explicitement, avec
preuve récente et audit. Le contrôleur local `useSystemSettings` possède les
requêtes, versions et brouillons ; les composants gardent leur présentation.
Aucun moteur générique, réglage ou seuil d'architecture supplémentaire.

Preuves de cette passe, distinctes des contrôles historiques ci-dessous :

- [Banc client](../../audits/parametres-complet-2026-10-11/banc-client/README.md) :
  **30/30 parcours Chromium** avec composants/styles réels et API/session
  simulées, de 320 à 1 920 px. Lecture, édition, clavier, focus, conflits,
  réponse perdue, refus, changements de portée et réparation contrôlés.
- [Banc serveur](../../audits/parametres-complet-2026-10-11/banc-serveur/README.md) :
  **44 contrôles réussis**, dont **16 scénarios PostgreSQL**, 21 tests de routes
  et 7 contrats. Versions, preuve de réparation, audit/rollback, frontières de
  purge, cascade des détails et attentes de verrous testés sur base isolée.
  Les sources de session et les en-têtes restent simulés dans ce banc.
- Contrôleur client : **8 tests** de verrou, refus, reprise, réparation,
  timeouts et réponse après démontage ; 6 contrats de page. Types, lint,
  construction et budgets validés ; suite globale : **1 235 tests réussis,
  84 ignorés**.
- [Intégration Next/PostgreSQL](../../audits/parametres-complet-2026-10-11/banc-integration/resultats.json) :
  **11/11 parcours réussis**, avec connexion/MFA, cookies, CSRF, conflit entre
  deux onglets, preuve refusée puis valide, réponse perdue après écriture,
  réparation et retrait du rôle administrateur. La vraie commande Bun de
  maintenance passe après correction de son appel SQL `bigint/integer` :
  ancien audit purgé, audit récent et session active préservés sur base isolée.

Le [rapport complet](../../audits/2026-10-11-parametres-complet.md) porte
les résultats finaux d'intégration et les limites. La revue a commencé le
11 octobre ; ces exécutions ont lieu le 12 octobre, heure de Paris. Les anciennes
preuves datées restent inchangées.

## Actions du réglage — historique du 11 octobre 2026

L'édition locale utilise `SectionActionBar` en placement inline. Annuler reste
disponible même avant toute modification pour fermer l'éditeur. L'action de
retour au défaut reste contextuelle ; le bouton Enregistrer garde un nom
accessible indiquant le réglage. Validation, conflit et confirmation restent
propriétés du réglage, sans ajouter une seconde gestion dans la barre.

[Catalogue](../../design/composants.md) et
[preuves simulées de cette passe](../../audits/2026-10-11-composants.md).

## Identité et état

- Route : `/systeme/parametres`, module `features/settings`.
- Public : administrateurs autorisés à consulter et modifier la configuration globale.
- Catalogue courant : seul `audit.retentionDays` reste actif.
- Dernière revue complète commencée le 11 octobre, validations exécutées le
  12 octobre 2026 : contrôles client, serveur et onze parcours d'intégration
  réussis dans les environnements isolés décrits ci-dessus. La
  [passe précédente](../../audits/2026-10-11-parametres.md) et les essais
  de septembre restent des preuves historiques distinctes.
- Références : [référence générale](../../REFERENCE_GENERALE.md),
  [système de design](../../design/README.md), [navigation](../../domaines/navigation.md),
  [permissions](../../domaines/permissions.md), [exploitation](../../exploitation/operations.md).
- La [fiche historique](../../propositions/intentions/pages/systeme/parametres.md) reste
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

### Composition retenue — actualisée le 14 octobre 2026

- Bandeau partagé `PageIdentityHero` compact, description courte « Réglages globaux de
  Noctambule. » et Actualiser secondaire, suivant le Répertoire.
- Une carte « Conservation du journal » avec les primitives Card de la fiche
  membre ; portée courte dans l'en-tête, conséquences et date réelle en pied.
- Corps `surface-panel`, en-tête `surface-panel-header`, bordures communes,
  panneau et confirmations à 10 px. Boutons partagés à 8 px ; extrémités du
  contrôle numérique à 6 px, centre jointif à 0 px avec le focus commun de l'Input.
  Pas d'ombre sur les panneaux ni de nouvelle palette locale.
- Champ directement modifiable sous l'en-tête, contrôle limité à 20 rem et à
  la largeur disponible, actions d'enregistrement hors de la carte. Sidebar
  et géométrie globale inchangées.
- Au repos : champ de durée disponible aux administrateurs autorisés ; aucune
  barre d'enregistrement sans modification, réparation ou reprise nécessaire.
  En cas de valeur stockée invalide, « Durée proposée » remplace « Durée
  de conservation » et un avertissement explique le blocage du nettoyage. Un résultat
  d'écriture encore incertain est présenté comme « Dernière valeur connue ».
- Bornes et défaut sont aussi visibles au repos. Le texte précise que la durée
  concerne l'historique des personnes et les détails associés ; l'enregistrement
  ne déclenche pas de suppression immédiate.
- Annuler abandonne le brouillon et rend le focus au champ ; la barre disparaît
  lorsqu'aucune reprise n'est nécessaire. Sans brouillon ni conflit relu à
  abandonner, Annuler est désactivé. Un succès confirmé masque la barre ;
  erreur, conflit ou réparation la conservent. Les brouillons restent indépendants.
- Hauteur des actions de réglage : 40 px sur grand écran, 44 px en mobile.
- Annuler précède immédiatement Enregistrer dans une barre de pleine largeur,
  alignée à droite sur bureau et empilée sur mobile. Rétablir le défaut reste
  près du contrôle, y compris pour une valeur personnalisée sans brouillon.
- Le libellé visible « Durée de conservation » précède le champ ; son nom
  accessible précise le réglage. Bornes et défaut, en jours, ne sont affichés
  qu'une fois sous le contrôle, en lecture comme en saisie.
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
  Le comportement reste local au réglage de durée, sans modifier la primitive Input.
- État « Modifications non enregistrées » dans la barre uniquement ; valeur
  appliquée affichée lorsqu'elle diffère. Le défaut logiciel est nommé « Défaut ».
  Aucun « Jamais modifié » au repos : seule une modification réelle affiche sa date.
- Avertissement contextualisé pour une diminution ; rappel d'irréversibilité
  commun. Pas de rail statistique, de recherche ou d'onglets injustifiés.

### Intégrité et erreurs

- Les états, brouillons et confirmations appartiennent au compte autorisé courant.
  Un changement de compte ou de capacité d'édition les réinitialise ; la perte
  d'accès démonte le contenu et ses dialogues. Les lectures et écritures en cours
  sont interrompues côté navigateur et leurs réponses tardives ignorées. Cela
  n'annule pas une mutation que le serveur aurait déjà exécutée.
  Un refus 401/403, y compris sans corps JSON, retire les valeurs, brouillons et
  confirmations déjà affichés. Le focus rejoint la région d'accès refusé.
- Un verrou synchrone empêche deux opérations concurrentes du même écran, y compris
  deux soumissions avant le prochain rendu. La lecture d'un conflit fait partie
  de l'opération de sauvegarde, sans remplacer les brouillons.
- Un conflit ne remplace aucun brouillon. Seule la valeur/version appliquée du
  réglage concerné est relue. Choix explicite : utiliser la valeur actuelle ou
  conserver la saisie, puis enregistrer. Si la relecture échoue, seule une
  nouvelle lecture permet de débloquer cette sauvegarde.
- Une réponse perdue, invalide ou en erreur serveur ne permet pas de rejouer
  directement l'écriture. « Vérifier la valeur actuelle » relit la version,
  puis demande de conserver la saisie ou d'utiliser la valeur relue. Aucun PUT
  automatique : toute nouvelle écriture est explicitement déclenchée.
- Les lectures du client sont limitées à 15 secondes et le PUT à 30 secondes.
  Une expiration libère l'interface ; pour une écriture, elle conserve l'état
  incertain et l'exigence de vérification. Ces délais n'annulent pas le serveur.
- Annuler réinitialise le brouillon. Une vérification encore indisponible reste
  visible et exigée ; cette annulation ne transforme pas une ancienne valeur
  en résultat confirmé.
- Les erreurs de sauvegarde restent dans le réglage et les saisies sont conservées.
  Les succès gardent leur toast ; aucun nouvel événement de notification.
- Erreur et conflit sont reliés au champ par `aria-describedby`. Le formulaire
  annonce l'attente ; Enregistrement et Vérification/Actualisation sont distincts.
- Une même comparaison numérique pilote le garde de navigation et la sauvegarde :
  `025` et `25` ne créent plus un faux changement ; une saisie invalide reste protégée.
- Entrée soumet le réglage modifié. Le focus revient au champ après annulation,
  succès, restauration du défaut ou résolution du conflit, sans voler un focus
  déplacé volontairement. Une actualisation réussie réinitialise les brouillons ;
  le bouton Actualiser garde le focus
  pendant la lecture, reste annoncé occupé et ignore les activations répétées.
- Après fermeture d'une confirmation de réduction ou de mot de passe, le focus
  revient au champ disponible. La confirmation
  d'actualisation revient à Actualiser ; Rester rend le focus au lien de départ.
  Le passage vers une nouvelle confirmation conserve son focus, sans le rendre
  au champ derrière la modale. Une preuve refusée est refocalisée après
  réactivation du champ. Réessayer après erreur initiale garde une destination
  de focus lorsque son bouton disparaît.
- La purge du journal contrôle sa durée sous verrou dans sa procédure SQL ;
  l’enregistrement ne lance pas la purge. Les règles d’exploitation sont dans
  [Exploitation](../../exploitation/operations.md). Le verrou de purge des notifications
  décrit dans les essais de septembre appartient au module retiré.
- La commande reste atomique, avec un délai maximal de 60 secondes. La fonction
  SQL de purge du journal et son contrôle de durée sont conservés.
- Le problème historique de résultat SQL `void` et sa correction concernent la
  passe de septembre ; ils ne constituent pas un essai de la purge actuelle.
- Pas de migration, de changement de bornes, de nouvelle permission ou de table métier.

### Valeur stockée invalide et réparation

Le contrat GET/PUT comprend `isStoredValueInvalid`. Si une ligne contient une
valeur invalide, le GET conserve sa version mais renvoie le défaut logiciel
comme **proposition** ; la purge SQL reste bloquée. Le contenu JSON invalide
brut n'est ni exposé au navigateur ni recopié dans l'audit.

La page propose alors une réparation enregistrable même si la saisie reste
`1095`. Elle exige une confirmation explicite et une preuve récente de mot de
passe, quelle que soit la comparaison avec ce nombre proposé. La réparation
réussie écrit une valeur valide, augmente la version et produit l'audit dans la
même transaction. L'état antérieur de cet audit est borné à l'indicateur
d'invalidité, `value: null` et la version ; le marqueur retourné devient `false`.
La maintenance suivante peut reprendre la purge. La réparation n'exécute pas
elle-même le nettoyage et ne change pas la politique de conservation.

### Portée du journal : constat et séparation à préparer

Examen du code le 27 septembre 2026, sans changement de durée ni exécution de purge.
Le défaut logiciel reste **1 095 jours** ; ce maintien ne valide pas sa pertinence
pour chaque finalité. L’ancien défaut de **180 jours** des notifications ne
s’applique plus au site : le module et son réglage ont été retirés le 9 octobre.

| Ensemble constaté | Données et usages actuels | Point à trancher avant de séparer les durées |
| --- | --- | --- |
| Connexions et sécurité | Connexions réussies/échouées, verrouillages, sessions, mot de passe, MFA, preuves d'action sensible ; acteur, IP et navigateur selon événement | Finalité de sécurité, durée utile à l'analyse et métadonnées minimales |
| Administration | Comptes, autorisations, paramètres et exports ; anciens envois de notifications et publications dans les traces historiques | Séparer la preuve de l'action administrative du contenu métier qu'elle concerne |
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
[classification des événements](../../../apps/web/src/shared/server/audit-event.ts),
[schéma et relations](../../../packages/database/prisma/schema.prisma),
[procédures de purge](../../../packages/database/prisma/migrations/20260721120000_person_identity_foundation/migration.sql),
[écriture de l'historique personne](../../../apps/web/src/features/persons/server/person-audit.ts),
[lecture de cet historique](../../../apps/web/src/features/persons/server/person-history.service.ts).

## Vérification du 11 octobre 2026

La passe courante et sa sélection Q01–Q30 sont dans le rapport lié en tête.
32 scénarios Chromium isolé réussis, 1 043 tests web réussis et 25 ignorés ;
types, lint et budget d'architecture réussis. `bun run docs:check` valide
180 fichiers et 1 002 liens locaux/index ; `git diff --check` ne relève pas
d'erreur d'espacement. Les cinq constats SET-01 à SET-05 du rapport sont clos
sur leur périmètre vérifié. Session réelle, purge, restauration et qualification
des finalités restent les limites explicites de la revue.

## Sélection des sujets — historique du 27 septembre

Cette sélection, la résolution des constats et les contrôles qui suivent décrivent
la passe du 27 septembre. Leurs mentions de deux durées et de notifications restent
des preuves historiques ; elles ne décrivent pas le catalogue actuel à une durée.

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

Les points ci-dessous distinguent les limites encore ouvertes des contrôles
réconciliés. Leur déclencheur définit la reprise, sans date de livraison
inventée ; les seuls résultats historiques ne valent pas nouveau contrôle.

| Sujet | Limite | Déclencheur / prochaine étape |
| --- | --- | --- |
| PAR-S-01 — Exploitation | Planificateur quotidien et alerte de maintenance non vérifiés sur le déploiement | Vérifier la configuration et un compte rendu de passage dans l'environnement exploité |
| PAR-S-02 — Volumes | Pas de mesure de purge à fort volume ; transaction bornée à 60 s | Mesurer avant de changer index, lots ou architecture de traitement |
| PAR-S-03 — Conservation | Défauts logiciels, sans qualification universelle des obligations et exceptions | Faire qualifier les durées pour les données réellement détenues et les entités concernées |
| PAR-S-04 — Portée du journal | Une seule durée purge aussi les détails de l'historique personne ; catégories insuffisantes pour séparer les finalités | Suivre le classement et les étapes documentés ci-dessus avant d'ajouter plusieurs durées ou de réduire le défaut global |
| PAR-S-05 — Donnée stockée invalide | **Clos au périmètre testé le 12 octobre** : blocage explicite, durée proposée, réparation protégée même à valeur identique et audit transactionnel | Reproductions avant correction puis contrôles SQL et navigateur réussis ; maintien du diagnostic dans cette page, sans écran d'incident supplémentaire |
| PAR-S-06 — Historique | Date affichée ; auteur et lien direct vers l'audit non ajoutés | Si nécessaire, réutiliser le journal et ses droits, sans nouvelle collection d'historique |
| PAR-S-07 — Validation complète | **Réconcilié le 13 octobre au périmètre du socle** : preuves client/SQL/HTTP, mutation réelle avec CSRF/conflit/audit et restauration signée des 19 tables, dont SystemSetting. Lecteur d'écran, mobile physique, charge et recette d'exploitation restent non qualifiés | Reprendre selon le changement et l'environnement cible ; l'égalité des lignes restaurées n'est ni une remise en trafic validée, ni une mesure RPO/RTO, ni une qualification des durées |

Les permissions, preuves, versions et audits sont contrôlés par les tests de
routes et les transactions réelles du banc serveur. Le CSRF, les cookies et le
parcours authentifié ont aussi été vérifiés dans l'intégration distincte avec
Next en production et PostgreSQL isolé. La passe commencée le 11 octobre et
exécutée le 12 n'avait pas restauré de sauvegarde. Le complément de clôture du
13 octobre restaure réellement SystemSetting dans une cible vide isolée et
compare ses lignes à la source, avec les autres tables du contrat. Les réglages
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
  supprime-t-elle, y compris les détails de l’historique des personnes ?
- Qui assume les durées et exceptions ? L'évolution association/société ne doit
  pas appliquer la durée du journal à tous les contrats et documents par défaut.
- Comment constate-t-on l'exécution de la maintenance et ses échecs ? L'écran
  promet-il uniquement ce que le système peut effectivement connaître ?
- Comment restaurer configuration et données de manière cohérente ? Augmenter
  une durée ne constitue pas une restauration.
- Si le volume ou le nombre de processus augmente, faut-il revoir les lots,
  délais de verrouillage, index et cache ? Mesurer avant d'ajouter une architecture.
- Chaque nouveau réglage appartient-il à cette page ou à son module métier ?

## Contrôles à reprendre sur le périmètre courant

Sélectionner les scénarios des [tests de routes](../../../apps/web/src/__tests__/system-settings-routes.test.ts)
et des [contrats de page](../../../apps/web/src/__tests__/system-settings-page-ux-contracts.test.ts),
avec le [guide des contrôles](../../systeme/tests.md). Pour une évolution de purge, prévoir
un essai sur base isolée et vérifier l’état final. La passe complète du
12 octobre a exécuté la purge SQL et la commande de maintenance ; ses fixtures
et résultats ne remplacent pas une mesure des volumes de l'environnement cible.

Le chemin historique `src/__tests__/notification-retention.integration.test.ts`
a été supprimé avec le module. Son ancien protocole et ses résultats de septembre
ne sont plus une instruction exécutable ni une preuve de la purge du journal.

## Historique utile

| Date | Travail | Résultat |
| --- | --- | --- |
| 27 septembre 2026 | Analyse complète initiale | Perte de brouillons reproduite, course de purge identifiée, proposition compacte |
| 27 septembre 2026 | Mise en œuvre approuvée | Présentation reprise, conflits préservant la saisie, concurrence PostgreSQL testée ; incompatibilité `void`/Prisma révélée puis corrigée |
| 27 septembre 2026 | Retrait du nombre de lignes global | Base commune de 25 dans le code ; deux réglages de conservation, ancienne clé ignorée et cache retiré |
| 27 septembre 2026 | Édition à la demande et portée du journal | Durées en lecture, action Modifier, focus et brouillons préservés ; distinction sécurité/historique documentée, durées et purge inchangées |

## Modales — revue transverse du 11 octobre 2026

Les trois confirmations (réduction, actualisation et navigation) héritent du
nouveau socle des modales. Fermeture à Échap, confinement et restitution du focus
vérifiés à 320 et 1 440 px avec les composants réels et API simulées ; les
restitutions spécifiques aux champs restent prioritaires.

[Décisions et questions communes](../transverse/modales.md) ·
[Preuves et limites de l’audit](../../audits/2026-10-11-modales.md).
Cette passe ne clôt pas les contrôles d’intégration encore ouverts de la page.

## Autocomplétion — correction du 11 octobre 2026

Le formulaire de réglage désactive explicitement l’autocomplétion ; les champs héritent du socle commun. Valeurs, validation, confirmation et portée serveur inchangées.

[Règle propriétaire](../../design/README.md) ·
[Contrôles et limites des extensions](../../audits/2026-10-11-autocompletion.md).
La présence des attributs d’exclusion ne garantit pas le comportement d’une
extension installée chez l’utilisateur.
