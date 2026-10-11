# Suivi — Mon compte (`/mon-compte`)

## Barre du profil — 11 octobre 2026

Le profil utilise `SectionActionBar` et un vrai formulaire soumis par Entrée.
La relecture après conflit affiche Actualisation, avec les mêmes verrous que la
sauvegarde ; le brouillon reste disponible. Annuler restaure les valeurs et rend
le focus à la saisie ou à son titre si le droit a changé. La barre ne masque plus
les champs sur petit écran. Le dialogue de contact garde son pied contextuel.

[Composants communs](../../references/COMPOSANTS.md) et
[audit daté avec limites](../../audits/AUDIT_COMPOSANTS_2026-10-11.md).

## Identité et état

- Route : `/mon-compte`. Page personnelle du compte connecté.
- Statut : alignée sur la fiche `/systeme/utilisateurs/[id]` ; formulaires,
  conflits et navigation corrigés le 2026-10-11.
- Vérification : composants exercés dans Chromium avec session/API simulées le
  11 octobre ; parcours profil/sécurité sur base réelle toujours à vérifier.

## Décisions courantes

- Même gabarit que la fiche utilisateur : hero `PageIdentityHero` compact
  (avatar DiceBear, identifiant, rôle à droite), rail « Vue d'ensemble »
  (`PageAsideLayout` + `UserOverviewCard`) et navigation de sections.
- Onglets conservés : « Profil » et « Sécurité », chargés à la première visite.
  Les anciens paramètres `activity` et `history` affichent Profil. Le branchement
  dormant de l’activité dans cette page a été retiré le 11 octobre ; les composants
  d’historique des autres consommateurs et les traces persistées sont conservés.
- Composants partagés réutilisés : `UserOverviewCard`, `UserAccessBadge`,
  `UserStatusBadge`, `SectionActionBar`.
- Avatar de compte : fond selon l'accès via `UserAvatar` partagé (rouge clair,
  ambre ou bleu clair), dessin conservé ; [décision et contrôle](systeme-utilisateurs.md#fond-des-avatars-par-accès--10-octobre-2026).
- Onglet Profil modifiable directement (nom facultatif, aucune
  autocomplétion), avec `SectionActionBar`. Onglet Sécurité en pastilles de
  statut partagées.
- Depuis la liste Utilisateurs, `returnTo` conserve les critères et la page.
  Si l'acteur peut consulter cette liste, le hero propose « Retour aux utilisateurs »
  avec une destination limitée à cette collection. La protection existante des
  saisies non enregistrées reste applicable aux liens de navigation.

## Profil, navigation et sécurité — 11 octobre 2026

- Le garde partagé des saisies non enregistrées couvre les liens et les changements
  de section ; annuler une navigation rend le focus à son déclencheur.
- Un rafraîchissement des coordonnées ou du profil conserve le brouillon. Un
  changement de compte ou de ses droits remonte le contenu pour éliminer les
  anciens brouillons et dialogues ; les réponses tardives sont ignorées.
- Prénom requis, nom facultatif : l’API accepte désormais le nom vide, comme le
  formulaire et le modèle existants. L’enregistrement et sa trace d’audit restent
  dans la même transaction.
- `PATCH /api/auth/me` exige `expectedUpdatedAt` (instant ISO de la version lue).
  Une version périmée ou une écriture concurrente retourne 409. Le brouillon reste
  visible ; « Actualiser la version » relit le profil, montre l’identité serveur et
  permet une nouvelle sauvegarde explicitement déclenchée.
- Le client actif `ProfileSection` envoie ce champ. Aucune migration de base ;
  déployer client et API ensemble. Un ancien formulaire déjà ouvert doit être
  rechargé après déploiement, après copie de sa saisie : sa requête sans version
  est refusée avec 400. Ne pas rendre le contrôle de version facultatif.
- Les opérations coordonnées, mot de passe, MFA et révocation de sessions ont un
  verrou synchrone ; les requêtes de lecture/révocation de sessions sont annulées
  au démontage. Annuler une requête ne constitue pas une annulation serveur.
- La ligne de session et ses formats de date sont isolés dans `AccountSessionRow`
  pour maintenir une section Sécurité lisible. Aucun droit ni mode MFA ajouté.

[Audit, scénarios et captures](../../audits/AUDIT_PAGES_RESTANTES_2026-10-11.md) :
tests API de nom vide, version requise, conflit initial et concurrence pendant
l’écriture ; parcours navigateur de brouillon, conflit/reprise, changement de
compte, coordonnées, mot de passe, MFA et révocation. Réponses simulées : ce
contrôle ne démontre pas le rollback PostgreSQL, les cookies ni la révocation
réelle des sessions. Le dialogue de mot de passe est aussi consommé par le cadre
authentifié pour le changement obligatoire ; ce mode forcé n’a pas été rejoué
dans le navigateur pendant cette passe.

## Retour à la liste — 10 octobre 2026

Effet ciblé de la correction USR-15 : Q02/Q04 pour le lien et le focus, Q09/Q10
pour les droits et la validation de destination, Q19/Q27/Q30 pour les composants,
contrôles et suivi. Autres sujets hors impact : aucun changement des données,
mutations, états de sécurité ou règles du profil.

Parcours liste → propre compte → retour dans Next/PostgreSQL isolés avec session
préparée : critères, page et lien focalisé retrouvés. Build, lint et suite web
réussis. [Preuves et limites](../../audits/AUDIT_UTILISATEURS_2026-10-10.md#validation-des-corrections).
La navigation avec brouillon, les sauvegardes et le défi MFA n'ont pas été joués
pendant cette passe ; COMPTE-01 reste ouvert sur ces parcours.

## Points ouverts

- COMPTE-01 — Parcours réel (profil, sécurité, conflits) à valider avec session et
  base isolées avant conclusion fonctionnelle complète ; responsable à attribuer,
  état « à vérifier ». Appliquer les [contrôles](../CONTROLES.md) proportionnés au
  prochain changement et consigner sa preuve dans ce suivi.

Avant de modifier un champ ou une action : le brouillon reste-t-il conservé
après un rafraîchissement de contexte ? Quelle version protège l’écriture et
comment l’utilisateur reprend-il un conflit ? Un changement de compte ou de
droits ferme-t-il les anciens dialogues ? Une réponse perdue peut-elle conduire
à rejouer une action sensible ? Vérifier aussi les consommateurs partagés du
dialogue modifié, notamment le changement obligatoire de mot de passe.

## Modales — revue transverse du 11 octobre 2026

Fenêtres de contact, mot de passe, MFA et sessions : surface commune, actions
empilées sur mobile et retour du focus. L’échec de finalisation des codes de
secours laisse les codes visibles ; l’annulation de configuration MFA attend sa
réponse, affiche son échec et permet de réessayer. Contrôles sur API simulées.

[Décisions et questions communes](modales.md) ·
[Preuves et limites de l’audit](../../audits/AUDIT_MODALES_2026-10-11.md).
Cette passe ne clôt pas les contrôles d’intégration encore ouverts de la page.

## Autocomplétion — correction du 11 octobre 2026

Profil, changement de mot de passe, adresse de contact et MFA suivent la règle commune sans exception. Les champs invisibles d’association au compte ont été retirés.

[Règle propriétaire](../../references/DESIGN_SYSTEM.md) ·
[Contrôles et limites des extensions](../../audits/AUDIT_AUTOCOMPLETION_2026-10-11.md).
La présence des attributs d’exclusion ne garantit pas le comportement d’une
extension installée chez l’utilisateur.

### Complément — proposition encore visible dans la modale de contact

Signalement utilisateur du 11 octobre après la première correction : une
proposition d'autocomplétion reste visible dans la modale d'adresse de contact.
La capture fournie ensuite identifie le menu intégré Bitwarden sur **Mot de
passe actuel**. Le navigateur, la version de l'extension et le DOM effectivement
servi ne sont pas déductibles de cette capture. Ne pas considérer le contrôle
des attributs comme une reproduction du défaut avec l'extension.

Le code conservait `name="email"`, `type="email"` et un mot de passe nommé
`current-password`. Le champ de contact est aligné sur la création de compte :
`type="text"`, `inputMode="email"`, sans `name`, correction automatique désactivée.
Le mot de passe reste masqué, sans `name` inutile : la requête utilise déjà les
valeurs de l'état du formulaire. Les exclusions des gestionnaires sont aussi
portées par le formulaire. Labels et identifiants accessibles restent stables.
Cette adaptation réduit les indications d'autocomplétion ; son effet sur
l'extension de l'utilisateur n'est pas démontré.

Q01/Q04/Q06/Q27/Q30 examinés ; autres sujets hors impact : composition, droits,
API, stockage et session inchangés. La validation applicative de l'adresse et
la validation serveur restent actives malgré le changement du type HTML.

Vérifications ciblées : **33 tests réussis**, TypeScript et lint réussis ;
**8 scénarios Chromium isolé réussis** (`AUDIT_ONLY=contact` dans le
[banc des modales](../../audits/modales-2026-10-11/banc/README.md)). Ouverture à
quatre largeurs, confirmation de suppression depuis la fiche utilisateur,
brouillon après annulation et nouveau scénario de saisie : attributs du champ
et du formulaire, adresse invalide refusée sans requête, adresse vide bloquée,
adresse valide avec espaces/majuscules normalisée puis soumise avec Entrée.
API fictive, aucune mutation réelle. Les
[observations](../../audits/autocompletion-2026-10-11/contact-observations.json)
complètent la première passe sans en remplacer les résultats.

COMPTE-AUTO-01 — **résolu, confirmé par l'utilisateur le 11 octobre 2026**
après les indications de réglage Bitwarden. Cette confirmation clôt le
signalement de la modale ; elle ne valide pas toutes les extensions ni tous les
navigateurs. Le réglage exact appliqué n'a pas été précisé. La documentation officielle
propose [Paramètres → Remplissage automatique → Domaines bloqués](https://bitwarden.com/help/blocking-uris/)
pour désactiver l'intervention sur le domaine concerné. Cette portée comprend
également les propositions de passkeys et d'enregistrement/modification des
identifiants ; elle ne correspond pas à une désactivation limitée à ce modal.
L'autre réglage, global, est l'affichage des
[suggestions dans les champs](https://bitwarden.com/help/auto-fill-browser/#inline-menu).
Réglages documentés le 11 octobre ; aucune modification du navigateur personnel
effectuée. Si le menu réapparaît, relever la version et inspecter les attributs
réellement servis. La clôture repose sur la confirmation utilisateur, pas sur
les succès du banc sans extension. La capture et ses
identifiants personnels ne sont pas recopiés dans le dépôt.

## Barre de sections — 11 octobre 2026

Profil et Sécurité héritent de la sélection, des angles de 6 px et du défilement
conditionnel du composant partagé. Le point de brouillon affiche désormais
« Modifications non enregistrées » au survol et au focus. Dans Chromium isolé,
le changement de section et l'annulation de la confirmation de départ conservent
le profil saisi. [Règles et questions communes](navigation-generale.md#barres-de-sections--décision-du-11-octobre-2026) ;
[preuves et limites](../../audits/AUDIT_NAVIGATION_SECTIONS_2026-10-11.md).
Les validations de mutations et de session réelle restent distinctes.
