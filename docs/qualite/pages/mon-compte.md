# Suivi — Mon compte (`/mon-compte`)

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
