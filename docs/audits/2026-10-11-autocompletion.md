# Contrôle transverse — Autocomplétion — 11 octobre 2026

## Demande et périmètre

L'utilisateur réaffirme ne vouloir aucune proposition d'autocomplétion du
navigateur ou d'un gestionnaire comme Bitwarden. Référence propriétaire :
[design system](../design/README.md). Revue sur `9f1bb53` avec les
corrections locales de modales encore non commitées, puis ce correctif.

Inventaire de tous les TSX de `apps/web/src` : primitives, formulaires, connexion,
MFA, Mon compte, Utilisateurs, Répertoire, paramètres et recherche rapide. Le
formulaire du module d'actualités inactif hérite également de la règle ; cela ne
réactive pas son parcours. Les choix et résultats proposés par l'application
dans ses menus métier ne sont pas l'autocomplétion visée.

Q01, Q04, Q06, Q19, Q27 et Q30 examinés : besoin, saisie accessible, formulaires,
contrat partagé, tests et règle documentaire. Les autres sujets Q02–Q30 sont
hors impact ou non applicables : aucun changement de présentation, navigation,
validation métier, permission, session, API, base, secret, intégration, mutation,
historique, cache, notification ou déploiement.

## Constats et correction

| ID | Attendu / observé | Correction et état |
| --- | --- | --- |
| AUTO-01 | Règle globale sans suggestions ; huit composants d'authentification autorisaient le gestionnaire, avec `autocomplete="on"` sur le formulaire de connexion | Option `allowPasswordManager` retirée ; connexion, mots de passe, MFA et récupération utilisent la protection commune. Corrigé et vérifié dans le code et les tests |
| AUTO-02 | Aucun champ de soutien à l'autocomplétion ; cinq champs invisibles `username` servaient à associer les mots de passe au compte | Champs et props devenues inutiles retirés ; exception du test de frontières UI supprimée. Corrigé et vérifié |
| AUTO-03 | Protection homogène ; `Textarea` non protégé et `CommandInput` dépendant de son appelant | `Input`, `Textarea`, `CommandInput` imposent les mêmes attributs après les props ; formulaires explicitement désactivés ; indications `email`/`tel` contradictoires retirées. Corrigé et vérifié |
| AUTO-04 | Documentation cohérente ; design system et suivi Connexion conservaient des exceptions | Règle sans exception, questions de revue et suivis actualisés. Vérification documentaire ci-dessous |

Les noms accessibles, types de champ, clavier numérique MFA et fonctions de
saisie/collage restent disponibles. Aucun faux champ, nom aléatoire, verrou
`readOnly` au focus ou suppression de l'interface injectée par une extension.

## Vérifications

- `bun run --filter web test` : **1 055 réussis, 25 ignorés**. Les dix tests
  [du contrat d'autocomplétion](../../apps/web/src/__tests__/autofill-contracts.test.ts)
  contrôlent le HTML rendu des primitives malgré des props contradictoires,
  les deux types de code MFA, l'absence d'opt-in dans les TSX et les formulaires.
  Ils remplacent le précédent contrat qui autorisait les exceptions.
- Chromium isolé, composants réels, contexte et API fictifs : **48 cas réussis**,
  à 320, 390, 768 et 1 440 px. Attributs vérifiés à l'ouverture des modales de
  coordonnées, mot de passe, confirmation administrateur, réinitialisation MFA,
  adresse de contact et codes ; confinement/restauration du focus et absence de
  débordement également contrôlés. Les cas de lecture seule et de confirmation
  sans champ font partie des 48 cas, sans preuve supplémentaire d'autocomplétion.
  Reproduction : filtre `AUDIT_ONLY=layout-` du
  [banc des modales](modales-2026-10-11/banc/README.md) ;
  [observations de cette passe](autocompletion-2026-10-11/observations.json).
- TypeScript et lint réussis ; les dix tests ciblés ont aussi été rejoués après
  correction du lint. Build de production réussi avec configuration fictive et
  base inaccessible, sans mutation réelle.
- `bun run docs:check` et `git diff --check` réussis après mise à jour des
  références, suivis et index.

Le premier essai des nouveaux tests avait une assertion trop large confondant
l'attribut `disabled` avec une classe CSS ; assertion corrigée, suite rejouée.
Un lancement Chromium et un lancement ciblé Vitest étaient empêchés par le
sandbox Windows avant compilation ; les passes ci-dessus ont ensuite réussi
avec autorisation d'exécution.

## Limites et reprise

**Conforme côté code sur le périmètre contrôlé.** Aucune extension Bitwarden,
1Password ou LastPass réelle ni historique de saisie d'un navigateur personnel
n'a été exercé ; aucune authentification ou mutation sur base réelle rejouée.
Les anciens audits conservent leurs résultats datés et leur périmètre initial.

Le [code officiel actuel de Bitwarden](https://github.com/bitwarden/clients/blob/main/apps/browser/src/autofill/services/collect-autofill-content.service.ts)
conditionne le respect de `data-bwignore` à un réglage de l'extension. Ce constat
sur la branche principale consultée le 11 octobre ne détermine pas la version
installée chez l'utilisateur. Le site ne peut garantir à lui seul l'absence du
menu. La [documentation Bitwarden](https://bitwarden.com/help/auto-fill-browser/#inline-menu)
décrit le réglage des suggestions dans les champs sous Settings → Autofill.

AUTO-EXT — **à vérifier**, responsable à attribuer : si une proposition reste
visible, relever navigateur, version et réglages de l'extension puis reproduire
sur le champ concerné. Distinguer une protection HTML absente d'une extension
qui choisit de l'ignorer ; ne pas dégrader la saisie pour masquer le symptôme.

Un signalement ultérieur le même jour concerne encore la modale d'adresse de
contact de `/mon-compte`. Le [suivi Mon compte](../pages/mon-compte/README.md)
consigne l'adaptation ciblée, ses nouvelles preuves et COMPTE-AUTO-01 à vérifier
dans le navigateur de l'utilisateur. Les 48 cas ci-dessus restent ceux de la
première passe, sans extension réelle.

La capture utilisateur reçue ensuite confirme le menu Bitwarden sur le champ
« Mot de passe actuel ». Le suivi distingue désormais ce constat du contrôle
HTML et documente le blocage par domaine proposé par Bitwarden. Disparition du
menu après réglage non vérifiée ; aucune nouvelle correction du code ni nouveau
succès navigateur déduit de la capture.

Confirmation ultérieure le 11 octobre : l'utilisateur indique que le problème
est résolu après les indications Bitwarden. COMPTE-AUTO-01 est clos sur cette
confirmation dans le suivi Mon compte ; le réglage exact n'est pas précisé.
AUTO-EXT conserve sa limite générale : les tests sans extension ne garantissent
pas le comportement de toutes les configurations.
