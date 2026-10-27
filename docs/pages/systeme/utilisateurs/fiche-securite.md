# Utilisateur — Sécurité

[Index des pages](../../../pages/README.md) · [Utilisateurs](README.md) · [Design](../../../design/README.md) · [Guide général](../../../REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/systeme/utilisateurs/[id]` |
| Section | `?section=security` |
| Espace | Système |
| Gabarit visé | [B. Fiche à sections](../../../design/gabarits.md#b-fiche-à-sections) |
| État d’harmonisation | Aligné ; allègement validé le 14 octobre 2026 — voir [Harmonisation](../../../design/harmonisation.md#état-par-page) |
| Point d’entrée | [UserSecurityTab](../../../../apps/web/src/components/users/user-detail/UserSecurityTab.tsx) |
| Contrôle d’accès | `users:view_security`, réinitialisations (`users:reset_password`, `users:reset_mfa`), sessions (`users:view_sessions`, `users:revoke_sessions`), statut, suppression ; preuves récentes côté serveur |
| Chargement / erreur dédiés | section chargée à la demande / commune à la fiche |

## Rôle et tâches principales

Comprendre l’état de sécurité d’un compte et agir si nécessaire : activer ou
désactiver le compte, réinitialiser mot de passe ou double authentification,
révoquer des sessions, supprimer le compte.

## Composition actuelle

Cinq rubriques : état du compte (badge `UserStatusBadge` à gauche de
l’interrupteur), mot de passe et double authentification (état dans le bandeau,
puis une rangée : fait et aide à gauche, action à droite), sessions
(`SessionRow` commune : appareil, dernière activité, IP courte, détails
repliables, révocation), suppression
(`UserDeletionCard`). Barre commune seulement quand l’état du compte diffère
de la valeur enregistrée.

## Décisions retenues

- **27 octobre 2026 — rubriques compactes et ligne de session commune** (le
  propriétaire demande « tu vois quelque chose ? », puis « ok go » sur la
  proposition). L’état de la rubrique (« À jour », « Activée »…) passe dans son
  bandeau, à droite du titre ; dessous, une seule rangée : le fait (dernier
  changement, date d’activation) et son aide à gauche, l’action à droite.
  Environ 80 px gagnés par carte. La décision du 20 octobre 2026 est tenue : l’état reste dans sa rubrique. Sessions : une seule ligne commune
  (`SessionRow`, [utilitaires](../../../../apps/web/src/shared/utils/session-display.utils.ts))
  sur la fiche utilisateur et Mon compte ; « Windows · Chrome », « Appareil non
  identifié », « Dernière activité : il y a 5 min », IPv6 raccourcie à
  l’affichage (RFC 5952, rien ne change en base ni dans l’audit), détails
  « Ouverte le », « Se ferme si inactive le », « Fermeture au plus tard le ».

- **25 octobre 2026 — mot de passe temporaire dans sa carte** (retour du
  propriétaire : « le visuel ici n’est pas parfait »). Le panneau était posé
  au-dessus de « État du compte », collé à cette carte, sans bandeau de titre,
  avec un champ sur toute la largeur et la case à cocher empilée sur le bouton.
  Le résultat s’affiche désormais dans la carte « Mot de passe », à la place du
  pied « Réinitialiser le mot de passe » : encart d’alerte « Mot de passe
  temporaire à transmettre », champ de 448 px au plus, bouton « Copier » puis
  « Copié » (l’annonce reste pour les lecteurs d’écran), pied de carte avec la
  case « J’ai conservé ce mot de passe » et « Terminer et masquer ». Les états
  expiré et réponse incertaine suivent la même structure. Banc client de la
  fiche : 50/50, dont deux captures de cet état relues à 390 et 1 440 px.

- **25 octobre 2026 — réinitialisation MFA délégable** ([revue complète](../../../audits/2026-10-23-revue-complete.md#suivi--lot-5-mots-de-passe-25-octobre-2026),
  REV-11) : le bouton « Réinitialiser la double authentification » apparaît pour
  tout détenteur de `users:reset_mfa` (racine comprise), sur un compte non
  protégé dont la double authentification est active et, hors racine, non
  administrateur. L'aide décrit le cas d'usage (application et codes de secours
  perdus) au lieu d'une « récupération superadmin ». Banc client de la fiche
  rejoué : 48/48, capture de la rubrique relue à 1 440 px.

- **24 octobre 2026 — verrou de compte retiré** ([revue complète](../../../audits/2026-10-23-revue-complete.md),
  REV-01) : le verrou par compte et son compteur de tentatives disparaissent du
  modèle, de l’API et de la rubrique, désormais intitulée « Mot de passe » et
  limitée à l’état du mot de passe et à son dernier changement. Les échecs
  restent inscrits dans le journal d’audit (`LOGIN_FAILED`) ; la limitation
  des essais relève du limiteur de connexion.

- 14 octobre 2026 : listes de descriptions sans sous-cartes, aides près des
  actions, compteur de tentatives affiché une fois ([préférences](../../../design/preferences.md)).
- 12 octobre 2026 : attentes bornées, reprise sans rejeu et autorisation
  concurrente pour les sessions (USR-D20 à USR-D22 clos).
- 15 octobre 2026 : droits de suppression vérifiés (superadmin, admin sur un
  compte standard, jamais entre administrateurs).
- 20 octobre 2026 : « l’utilisateur » au lieu de « le membre », double
  authentification « Activée » et rubrique « État ». Les états restent ici, près
  de leurs actions ; le bandeau n’en garde que la pastille.

## Points ouverts

Aucun point ouvert ; USR-D20 à USR-D22 sont clos au périmètre vérifié.

## Références

- [Page Utilisateurs](../../../domaines/permissions.md#page-utilisateurs), fiche [Sécurité](../../../references/securite.md)
- Audits : [11 octobre 2026](../../../audits/2026-10-11-fiche-utilisateur.md), [clôture du socle](../../../audits/2026-10-12-cloture-socle.md)

## Historique

- 12 au 15 octobre 2026 : sessions, allègement visuel, barre conditionnelle et droits de suppression.
- 19 octobre 2026 : fiche propre à la section, créée par découpage du suivi du module.

## Revues datées

Sections déplacées le 19 octobre 2026 depuis l’ancien suivi du module, sans
modification de leur contenu. Elles conservent leur date, leur portée et leurs
preuves ; la synthèse ci-dessus porte l’état courant.

### Vérification des droits de suppression — 15 octobre 2026

Question ciblée de l'utilisateur : bouton disponible pour le superadmin et
pour un admin sur un compte standard, mais absent entre administrateurs.
Examen du commit `a3641a6`, arbre propre au départ ; aucune correction de code
nécessaire sur ce périmètre.

- Le superadmin peut demander la suppression d'un utilisateur ou d'un admin.
- Un admin peut supprimer un utilisateur standard avec `users:delete_account`
  (accordée par défaut, révocable), jamais un autre admin.
- Aucun acteur ne peut supprimer son propre compte ni le compte racine protégé.
- Le bouton reste visible pour une cible autorisée active, mais désactivé
  jusqu'à sa désactivation enregistrée, y compris pour le superadmin.
- Nuance de la politique existante : un compte USER explicitement doté du droit
  et de ses dépendances peut aussi supprimer un autre USER. Ce n'est pas une
  capacité strictement réservée au rôle ADMIN.

Concordance examinée entre `useUserDetailCapabilities`, `UserDeletionCard`,
la route DELETE et `user-deletion` : garde de rôle, permission, cible protégée,
soi-même, état enregistré et preuve récente de mot de passe. La transaction
relit l'autorité et conditionne l'écriture à l'état/version de la cible.
[Règle canonique](../../../domaines/permissions.md).

**12 cas Chromium réussis**, avec acteurs/cibles fictifs, présence/absence et
désactivation du bouton ; aucun appel de mutation. **13 tests ciblés réussis**
dans `users-access-hardening.test.ts` (filtre `delet|inactive|irreversibly|recent
password even`, 91 autres tests non exécutés). Ces tests de route simulent la
session et Prisma ; aucune suppression réelle ni nouvelle preuve PostgreSQL.
Sélection : Q01–Q02, Q06, Q09–Q10, Q16, Q27 et Q30 ; les autres sujets sont
hors impact de cette vérification sans modification fonctionnelle.

### Allègement visuel de l'onglet Sécurité — 14 octobre 2026

L'utilisateur apprécie la présentation actuelle, puis valide les allègements
proposés après une lecture visuelle. Les cinq rubriques sont conservées : état
du compte, mot de passe/verrouillage, double authentification, sessions et
suppression. L'objectif est de réduire les répétitions et les niveaux visuels.

Décisions appliquées dans `UserSecurityTab` :

- L'impact du reset de mot de passe est une aide près du bouton, reliée par
  `aria-describedby` ; la confirmation détaillée reste en place.
- La récupération superadmin devient une aide près de l'action, également
  reliée au bouton. La restriction au compte racine et les conditions de perte
  restent explicites. Sans MFA configurée, l'état obligatoire suffit ; sans
  droit de récupération, aucun bouton n'est ajouté.
- Le verrouillage regroupe son état, son échéance éventuelle et le compteur
  de tentatives non nul, affiché une seule fois. Le texte « Aucun verrouillage
  en cours » ne répète plus le badge « Aucun ».
- Les informations ordinaires utilisent une liste de descriptions, sans
  sous-carte ni icône encadrée. Les badges d'état et les en-têtes de section
  gardent leurs repères. L'interrupteur du compte n'a plus de cadre imbriqué ;
  sa conséquence reste explicite et accentuée en cas de désactivation.
- À la demande de l'utilisateur, le badge partagé `UserStatusBadge` apparaît
  juste à gauche de l'interrupteur : « Actif » en vert ou « Désactivé » en jaune.
  Il suit la valeur du brouillon comme l'interrupteur ; la vue d'ensemble
  conserve l'état enregistré jusqu'au succès. Libellé et commandes partagent
  une ligne, avec la conséquence dessous sur toute la largeur, même à 320 px.
- Appareil, dernière activité, IP et révocation des sessions restent visibles.
  La date d'ouverture rejoint les échéances dans « Détails de la session »,
  avec le format de date français déjà utilisé pour ces échéances.

Contrôles après modification : **quinze scénarios Chromium existants réussis**
(`AUDIT_ONLY=security`, `mfa-reset`, `session`, `secret-copy`, `status-actionbar`),
dont cinq largeurs de 320 à 1920 px ; inspection des captures à 390 et 1440 px.
Inspection ponctuelle supplémentaire à 320 px : verrouillage et MFA à configurer
visibles, compteur présent une fois, date d'ouverture accessible avec Entrée,
repli avec Espace et focus conservé. **Quinze tests de contrats**, TypeScript
et lint ciblé réussis. La passe complète du banc n'a pas été rejouée.

Complément après ajout du badge : dix scénarios existants réussis
(`responsive-security` et `status-actionbar`), TypeScript et lint ciblé réussis.
Rendu actif inspecté à 320 px ; annulation, sauvegarde et focus revérifiés par
les parcours existants. Même périmètre simulé et mêmes limites que ci-dessus.

Sélection légère : Q01–Q04, Q06, Q22 et Q27 examinés ; Q30 pour le suivi.
Les autres sujets sont hors impact de cette composition : aucune modification
des permissions, requêtes, confirmations, données, composants partagés ni
dépendances. `Card`, `Button`, `Disclosure`, les jetons et la barre commune
restent réutilisés. API, acteur et shell simulés ; aucun nouveau contrôle
serveur/base, lecteur d'écran ou appareil physique. La correction de barre
ci-dessous conserve sa trace et ses preuves antérieures.

### Barre de l'onglet Sécurité — 14 octobre 2026

Correction ciblée de `/systeme/utilisateurs/[id]?section=security`, demandée
après constat d'une barre d'enregistrement permanente. `UserSecurityTab`
affiche désormais `SectionActionBar` seulement lorsque l'état « Compte actif »
diffère de la valeur enregistrée, avec les droits existants. Revenir à la valeur
initiale, annuler ou enregistrer avec succès masque la barre. Pendant une
écriture ou un conflit, le brouillon conserve ses actions et leurs verrous.
Après enregistrement, le focus revient à l'interrupteur s'il a été perdu ; un
autre contrôle focalisé ou une modale ouverte garde son focus.

Contrôles du 14 octobre : **six scénarios Chromium réussis** (trois formats
de défilement, deux parcours repos/modification/retour/écriture lente/succès,
une reprise après conflit), **onze tests de contrats**, TypeScript et lint
ciblé réussis. [Preuves client](../../../audits/fiche-utilisateur-2026-10-11/banc-client/preuves/barre-conditionnelle-2026-10-14.json).
API, acteur, navigation et shell simulés ; aucun statut réel modifié et aucune
nouvelle validation serveur/base ou lecteur d'écran. Les anciennes preuves
de barre toujours présente restent historiques.

Sélection proportionnée : Q01–Q04, Q06 et Q27 examinés ; Q30 pour le suivi.
Autres sujets hors impact de cette condition d'affichage et du retour de focus :
pas de nouvelle action, règle d'accès, mutation, donnée ou composant partagé.

### Sessions administratives — complément ciblé du 12 octobre 2026

**Corrections vérifiées dans le périmètre décrit.** Départ `2ecb215`, arbre propre.
Périmètre : lectures et révocations
individuelle/globale dans Sécurité de `/systeme/utilisateurs/[id]`, autorisation
à l'exécution, confirmation, résultat incertain et retour du focus. Le profil,
les autorisations, l'état du compte, la suppression et les resets mot de passe/MFA
ne sont pas réaudités. Les limites du 10 octobre déjà levées le 11 ne sont pas
rouvertes sans nouveau constat.

Sélection de la [référence générale](../../../REFERENCE_GENERALE.md) : Q01–Q07, Q09–Q11,
Q14–Q17, Q19, Q22, Q27–Q28 et Q30 examinés pour les sessions, les actions
sensibles et leurs reprises. Q12–Q13, Q18 et Q29 hors impact : schéma, migrations,
cache et sauvegardes inchangés. Q08, Q20–Q21 et Q23–Q26 non applicables : aucun
message différé, fichier, transfert de masse, automatisation, règle de structure,
vie esport ou engagement financier ajouté.

Décisions de cette reprise, en continuité avec les
[sessions personnelles](../../mon-compte/securite.md#sécurité--attente-et-reprise-des-sessions--complément-ciblé-du-12-octobre-2026) :

- Borner lectures et révocations, corps de réponse compris. L'annulation côté
  client ou un délai dépassé ne prouve pas l'annulation de l'opération serveur.
- Distinguer refus, réussite et résultat incertain. Une réponse perdue demande
  un avertissement local persistant et une relecture bornée, sans second DELETE
  automatique. Un GET suivant ne doit pas faire annoncer l'échec d'un succès
  déjà confirmé ni bloquer indéfiniment l'interface.
- Garder les contrôles de portée et de preuve administrateur existants ;
  vérifier l'autorisation au moment de la mutation, y compris après une attente.
- Après reprise ou disparition de la ligne, rendre le focus à un élément encore
  présent et visible sous les onglets. Une interaction plus récente conserve
  la priorité sur une réponse retardée.

Le helper de Mon compte est déplacé vers `shared/utils/security-request.utils.ts`
(`securityRequest`), sans modifier sa borne de 30 secondes ni sa sémantique.
Il sert maintenant les sessions administratives et `AdminStepUpDialog`, dont
la requête de preuve est aussi bornée. Le dialogue est également consommé par
la création d'utilisateur et les paramètres : ces parcours ne sont pas
réaudités par la seule vérification de la révocation administrative. Les huit
parcours du banc Mon compte ont été rejoués avec succès après ce déplacement.

| Point | Constat reproduit avant correction | Correction et clôture du 12 octobre |
| --- | --- | --- |
| USR-D20 — P1 | GET sessions toujours en attente à 31 secondes, sans reprise ; DELETE global fermant immédiatement la confirmation mais laissant l'action désactivée indéfiniment. Un 500 JSON ou une réponse perdue ne relisait pas les sessions ; après commit simulé, quatre lignes restaient affichées pour trois sessions restantes. | **Clos au périmètre testé** : délais de 30 secondes, message persistant dans la carte Sessions, relecture sans nouveau DELETE et purge après 403 non JSON. Le POST du défi est borné ; Annuler redevient accessible après délai. Le parcours HTTP confirme la reprise après commit réel sans rejouer la révocation. |
| USR-D21 — P1 | GET et DELETE individuel/global répondaient 200 après suppression de la session source, rotation de version de l'acteur ou retrait de permission ; un DELETE répondait aussi 200 après expiration de la preuve MFA pendant l'attente réelle du verrou cible. Dix reproductions SQL avant correction, avec snapshot d'authentification simulé. | **Clos au périmètre SQL testé** : comptes verrouillés dans l'ordre de leurs identifiants, présence de la source stabilisée par verrou partagé, droits et échéances relus après l'attente. Refus 401/403, session cible préservée et aucun audit ajouté ; treize SQL ciblés réussis, sans changement des permissions ou durées. |
| USR-D22 — P2 | Le titre Sessions recevait le focus vers 80 px derrière la barre située entre 56 et 105 px, à 390 et 1 440 px. Le parcours du défi rendait aussi le focus à BODY après annulation ou succès, constat relevé pendant la correction des délais. | **Clos au périmètre testé** : titre visible vers 120 px et retour après défi vérifiés côté client ; une interaction plus récente conserve son focus malgré une réponse retardée. Focus visible aussi dans les parcours HTTP, dont la réponse perdue à 390 px. |

Ces sept reproductions utilisent les composants réels avec API, acteur et
horloge simulés ; elles ne prouvent pas un commit ou un refus serveur réel.
Le [banc client final](../../../audits/utilisateur-sessions-2026-10-12/banc-client/README.md)
réussit onze parcours et archive aussi les huit contrôles Mon compte rejoués.
Les deux cas 500/réponse perdue sont rejoués après placement du message dans
la carte Sessions : deux succès inclus dans les onze parcours distincts.
Polices Next absentes, police calculée non mesurée ; aucun commit réel ni règle
de preuve validé par ces simulations. Les autres largeurs, changements d'acteur,
lecteurs d'écran et resets ne sont pas rejoués.

Le [banc serveur](../../../audits/utilisateur-sessions-2026-10-12/banc-serveur/README.md)
réussit treize SQL ciblés sur 25 tests, douze ignorés par le filtre, ainsi que
39 tests API simulés distincts. PostgreSQL 17 et 52 migrations existantes ;
comptes, sessions, droits, transactions et audits réels, mais snapshot
d'authentification injecté. Dix régressions nouvelles couvrent l'autorisation
périmée ; les trois autres vérifient projection, appartenance/révocation et
rollback de la révocation globale si l'audit échoue. La preuve MFA est datée
artificiellement, son expiration intervient pendant un vrai verrou observé.

Le [banc HTTP](../../../audits/utilisateur-sessions-2026-10-12/banc-integration/README.md)
réussit quatre parcours sur Next 15.5.23 et PostgreSQL isolés : annulation de
confirmation et de preuve, révocation individuelle après mot de passe/TOTP,
révocation globale et réponse perdue après commit réel. Les demandes refusées
avant la preuve sont distinctes de la reprise autorisée ; une seule mutation
et un audit par révocation réussie. La session cible révoquée reçoit 401,
l'acteur conserve sa session (200). Après perte de réponse : un DELETE, un GET,
aucune session cible restante, message persistant et titre focalisé visible.

La suite générale compte 1 252 tests réussis et 179 ignorés, dans 103 fichiers
réussis et neuf ignorés ; les 23 tests ciblés helper/UX sont inclus dans ce
total, les treize SQL sont une exécution distincte. Types, lint global,
architecture et build final Next 15.5.23 réussis. Budget de la fiche :
314 521 octets gzip, plafonds inchangés ; aucune mesure de charge déduite.
Le complément HTTP sur ce dernier build confirme le message dans la carte
Sessions et le titre focalisé à 178,30 px sous la barre finissant à 105 px
(390 × 700). Il rejoue seulement la réponse perdue : un DELETE, un GET, un audit,
cible refusée et acteur conservé ; il n'ajoute pas un cinquième parcours distinct.
Nettoyage confirmé dans le banc HTTP : Next/PostgreSQL arrêtés, ports libres,
dossier privé, cluster de deux bases, variables et secrets temporaires supprimés.
Le contrôle des artefacts conservés ne retrouve aucune valeur secrète ; aucune
base habituelle du projet n'a été utilisée.

Limites : les courses SQL ne sont pas des retraits de droits joués dans un vrai
parcours de connexion ; le banc HTTP ne rejoue pas tous les délais simulés ni
tous les consommateurs du défi. Aucun nouveau contrôle de Safari/iOS, lecteur
d'écran, appareil physique, charge ou reset mot de passe/MFA. Aucun changement
de schéma, permission, durée de session ou contrat de réponse.

Questions à conserver après un changement de ces actions : la session de
l'administrateur et la cible sont-elles encore autorisées après l'attente ? La
révocation a-t-elle pu réussir malgré l'absence de réponse ? Une relecture lente
empêche-t-elle une reprise ou déplace-t-elle le focus après une nouvelle action ?
