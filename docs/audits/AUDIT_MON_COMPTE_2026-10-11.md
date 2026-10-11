# Mon compte — revue du 11 octobre 2026

## Périmètre

Poursuite de la revue page par page : `/mon-compte`, Profil, Sécurité et dialogues
de contact, mot de passe, MFA et sessions. Les composants partagés de sécurité
affectent aussi la connexion et les changements obligatoires. Départ propre au
commit `ab3387c`. Les décisions applicables restent dans le
[suivi courant](../qualite/pages/mon-compte.md).

Projet en développement. Contrôles sur PostgreSQL 17 jetable, port local 54596,
bases `account_service_test` et `account_audit_test`, 52 migrations existantes.
La base habituelle et les comptes réels ne sont pas utilisés. Node 24.14.0,
Bun 1.4.2, Next 15.5.23, React 19.1.8, Prisma 6.19.3.

## Sélection de la revue générale

| Sujets | Classement et justification |
| --- | --- |
| Q01–Q04 | À examiner : besoin personnel, navigation, composants existants, responsive et focus |
| Q05 | À examiner pour les appareils connectés ; aucune recherche ni pagination requise par le volume observé |
| Q06–Q07 | À examiner : brouillons, formulaires, confirmations, conflits, attentes et retours d'erreur |
| Q08 | Non applicable : aucune notification différée justifiée par ces corrections |
| Q09–Q12 | À examiner : droits personnels, sessions, secrets, données de contact et invariants du schéma |
| Q13 | Hors impact produit : aucune migration nouvelle ; migrations existantes appliquées aux bases d'essai |
| Q14–Q16 | À examiner : versions, réponses perdues, concurrence, audit transactionnel, retrait du contact et révocation |
| Q17–Q19 | À examiner : réponses tardives, nettoyage des sessions, chargement des sections et responsabilités partagées |
| Q20–Q21 | À examiner uniquement pour la remise des codes de secours ; pas d'upload ni d'import métier |
| Q22 | À examiner : versions datées, échéances des sessions et preuves TOTP |
| Q23–Q26 | Non applicable : aucun traitement différé, prestataire, structure juridique, esport ni engagement financier |
| Q27 | À examiner : séparer tests isolés, SQL réel, navigateur simulé et parcours authentifié |
| Q28–Q29 | Hors impact : déploiement, clés et sauvegardes inchangés ; nettoyage des environnements d'essai |
| Q30 | À examiner : contrat contact, variable dédiée aux tests et documentation ; aucune dépendance ajoutée |

## Constats et corrections

| Point | Défaut observé | Correction et état de preuve |
| --- | --- | --- |
| COMPTE-02 — P2, contact périmé | Deux formulaires ouverts sur la même version écrasaient successivement l'adresse | `expectedUpdatedAt` requis et vérifié avant le cas sans changement ; conflit 409, relecture explicite, brouillon conservé. Reproduit puis corrigé en PostgreSQL |
| COMPTE-03 — P2, brouillons | Un refresh de contact réinitialisait le dialogue ; celui du profil conservait aussi les champs non modifiés et pouvait écraser une valeur distante | Clos : snapshot d'ouverture pour le contact et fusion champ par champ du profil ; tests ciblés, banc simulé et conflit réel entre deux onglets réussis |
| COMPTE-04 — P1, contexte ancien | Réponse de session après logout ou mutation, snapshot d'un autre acteur et refresh pendant logout pouvaient restaurer une ancienne identité ou empêcher la redirection | Gardes d'opération, version et identité ; priorité de la déconnexion. Six régressions reproduites avant correction ; 21 tests de contexte réussis après correction |
| COMPTE-05 — P2, sessions obsolètes | Le GET personnel exposait les anciennes versions de sécurité ; une révocation concurrente produisait une erreur 500 | Filtre et nettoyage SQL liés à la version du compte ; absence concurrente traitée sans faux audit. Tests PostgreSQL et course déterministe réussis |
| COMPTE-06 — P2, état des dialogues | Confirmation globale refermée pendant DELETE ; données de sécurité conservées après refus de lecture ; ouvreur MFA recréé et focus perdu | Clos au périmètre testé : attente verrouillée, purge sur 401/403, focus de repli après retrait d'une ligne et retour au nouvel ouvreur MFA ; banc client réussi, révocation individuelle réelle vérifiée |
| COMPTE-07 — P2, réponse perdue | Un message d'échec pouvait inviter à rejouer une mutation de sécurité pourtant validée | Clos au périmètre testé : incertitude et reprise explicite ; contact relu après vrai commit sans rejeu, mot de passe/MFA vérifiés en simulation avec commande de rechargement. Le champ de confirmation inutile dans l'état incertain est retiré |
| COMPTE-08 — P2, copie tardive | Un résultat de presse-papiers pouvait survivre à la fermeture des codes MFA | Clos : résultat invalidé au démontage ou changement de codes ; scénario simulé de copie retardée réussi |
| COMPTE-09 — P1, version absente de la session | La projection SQL de session omettait `updatedAt` : profil impossible à enregistrer à l'arrivée, relecture incapable de résoudre le manque de version | Clos : défaut reproduit dans Next/PostgreSQL ; champ ajouté à la projection et deux régressions API/SSR reproduites avant puis réussies après. Sauvegarde et relecture réelles réussies. Les anciens tests avec source d'authentification simulée ne démontraient pas ce parcours |

La borne bcrypt du mot de passe actuel est déjà appliquée par `verifyPassword`.
L'absence de borne dans le schéma de la route n'est donc pas un contournement
constaté ; une régression utilisant bcrypt réel le confirme. Pas de changement
de politique de mot de passe, de MFA ou de permissions.

## Validation

- [Banc serveur](mon-compte-2026-10-11/banc-serveur/README.md) : **23 scénarios
  PostgreSQL réussis**, complétés par les suites des routes et de sécurité.
  Profil, contact, mot de passe, révocations, remplacement MFA et régénération
  des codes : rollback réel sur panne d'audit, concurrence, preuves et rejeu.
  La source de session et les cookies sont simulés dans le banc SQL ; la
  projection de session fait l'objet de deux régressions supplémentaires.
- [Banc client](mon-compte-2026-10-11/banc-client/README.md) : **23 parcours
  distincts réussis** avec composants/CSS réels et API/session simulées.
  Passe principale de 21/22 puis compléments du scénario obligatoire, Entrée
  native et retouche ciblée de l'état password incertain. Les 23 ne sont pas
  annoncés comme rejoués ensemble après ces ajustements ; les preuves précisent
  la limite des DTO simulés.
- Suite web finale : **1 232 tests réussis, 61 ignorés**, 99 fichiers réussis et
  quatre ignorés. Les 23 SQL Mon compte sont exécutés ; les 61 SQL des autres
  pages ne sont pas rejoués sans leurs variables dédiées.
- Build Next de production, lint et vérification des types via build réussis.
  Budgets architecture et performance respectés : Mon compte à **256 004 octets
  gzip** selon le contrôleur du dépôt. Ce poids n'est pas une mesure de charge,
  de latence ni de Core Web Vitals.
- [Intégration réelle](mon-compte-2026-10-11/banc-integration/README.md) :
  **12 scénarios réussis** dans Chromium 149.0.7827.55 et Next de production.
  Connexion/MFA initiale, profil soumis par Entrée, nom vide, conflit entre deux
  onglets, fusion des brouillons, contact versionné et normalisé, perte de réponse
  après commit réel puis relecture sans rejeu, suppression du contact, sept
  largeurs de 320 à 1 920 px, révocation individuelle d'une autre session, mot de
  passe réel avec rotation et invalidation des autres sessions, codes de secours
  avec TOTP/copie/téléchargement réels, retrait à chaud de l'autonomie du profil.
  Le seul ajustement final du banc normalise les fins de ligne du presse-papiers
  Windows ; il ne modifie pas les codes ni le produit.

## Schéma, portée et limites

Le schéma existant fournit les versions, contraintes, relations et transactions
nécessaires. Aucune migration, index, permission, cache ou dépendance ajoutés.
La correction porte sur leur utilisation : projection de session, version du
formulaire de contact, filtre des sessions et cycle des opérations client.
Le contact personnel et les protections essentielles restent toujours accessibles,
même si une ancienne surcharge de permissions indique le contraire ; seule
l'autonomie du prénom/nom peut être retirée dans ce parcours.

Le style et les composants communs sont conservés : hero, sections, champs,
cartes de sécurité, `SectionActionBar` et dialogues. La barre du profil demeure
absente sans saisie ; une commande de reprise reste visible pendant un conflit.

Limites : Chromium uniquement, pas de lecteur d'écran, Safari/iOS, extension
Bitwarden ni clavier virtuel réels. Pas de mesure de charge, test de saturation
ou exercice de restauration. Le remplacement MFA, l'annulation et les réponses
perdues mot de passe/MFA sont vérifiés par SQL et/ou simulation client, sans
annoncer leurs combinaisons complètes comme parcourues dans Next réel.

**COMPTE-01 clôturé pour le parcours réel décrit ; COMPTE-02 à COMPTE-09
corrigés et vérifiés dans les limites des preuves ci-dessus.**

Contrôle documentaire final : **218 fichiers et 1 399 liens locaux/index**
validés ; les six tests du contrôleur documentaire et `git diff --check` passent.
Les preuves textuelles ont été contrôlées pour exclure les valeurs privées de
l'environnement d'essai. Next, PostgreSQL et les dossiers temporaires des bancs
sont arrêtés/supprimés ; seuls scripts, captures fictives et résultats sans
secrets sont conservés dans le dépôt.
