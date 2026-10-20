# Banc client — fiche utilisateur, 11 octobre 2026

Complément du 14 octobre : la barre Sécurité est désormais absente au repos
et après annulation/succès. Les trois scénarios de défilement vérifient cette
condition ; deux parcours `status-actionbar-lifecycle` couvrent aussi le retour
manuel au statut initial, l'écriture lente et le focus après succès.
[Six contrôles ciblés réussis](preuves/barre-conditionnelle-2026-10-14.json),
avec la reprise après conflit. Les résultats et descriptions historiques
ci-dessous conservent leur date ; le banc courant comporte 48 scénarios.

Allègement visuel du 14 octobre, après cette correction : aides de reset près
des boutons, états sans sous-cartes, compteur d'échecs regroupé et ouverture
des sessions dans les détails. Quinze scénarios existants réussis avec les
filtres `security`, `mfa-reset`, `session`, `secret-copy` et `status-actionbar`.
Cette passe partielle et l'inspection ponctuelle des alertes/détails à 320 px
sont consignées dans le [suivi courant](../../../pages/systeme/utilisateurs/README.md).
Les captures historiques ci-dessous précèdent cet allègement.

Le banc charge `UserDetailPage`, ses composants différés, les contrôleurs réels,
les primitives et les feuilles de style du dépôt. API, session, navigation Next,
layout authentifié et presse-papiers sont simulés. Les identités, adresses IP de
documentation et secrets sont fictifs ; aucune session ni base réelle utilisée.

Depuis la racine du dépôt, dépendances et Chromium déjà installés :

```powershell
node docs/audits/fiche-utilisateur-2026-10-11/banc-client/run.cjs
```

Le dossier temporaire contenant les observations et captures est affiché au
démarrage. Le serveur et Chromium sont fermés en fin d’exécution. `AUDIT_ONLY`
permet d’exécuter les scénarios dont le nom contient la valeur fournie ; retirer
la variable pour la passe complète. Le script contient désormais 48 scénarios,
dont trois pour le défilement et deux pour l'affichage conditionnel de la barre.

## Preuves exécutées

| Passe | Résultat | Portée exacte |
| --- | --- | --- |
| [Avant corrections](preuves/avant-corrections.json) | 18/33 | Reproduit la perte de focus après Annuler l’état, les conflits hors Profil et la copie tardive ; arrivée Sécurité sans instantané initial : aucune requête de sessions |
| [Passe principale après corrections](preuves/passe-38-scenarios.json) | **38/38** | Composition/focus sur cinq largeurs, quatre sections, formulaires, conflits, sessions, copie, permissions et reprise MFA |
| [Portée de l’instantané](preuves/portee-ssr-3-scenarios.json) | **3/3** | Acteur A→B→A, portée inchangée et PATCH tardif après changement d’acteur |
| [Profil long](preuves/profil-long-apres.json) | **1/1** | Après la dernière correction du profil administratif : identité non coupée, aucun débordement à 320 px |
| [Refus pendant une relecture](preuves/refus-secret-apres.json) | **1/1** | 403 non JSON après reset : secret et fiche retirés |
| [Complément — barre d’état et défilement](preuves/barre-enregistrement-defilement.json) | **3/3** | Barre hors des cartes ; bureau normal, bureau de faible hauteur et mobile ; Annuler restaure valeur et focus |

**43 parcours distincts réussis lors de l’audit initial, puis trois contrôles
ciblés de défilement réussis après déplacement de la barre.** La passe principale de 38 précède la
dernière correction locale du nom long. Cette correction est vérifiée par sa
passe ciblée ; la totalité des 43 n’a pas été rejouée ensemble ensuite.
Le formatage ultérieur des fichiers du banc ne change pas les scénarios.

Le complément se reproduit avec `AUDIT_ONLY=status-actionbar-page-scroll`.
À 1 440 × 900 px, après modification du statut, la barre reste à 16 px du bas du
viewport à trois positions de défilement. À 390 × 844 et 1 440 × 550 px, elle
reste dans le flux selon la règle du composant partagé ; elle est entièrement
visible en fin de section. Dans les trois cas, Annuler restaure le statut, rend
le focus à l’interrupteur et remet la barre sans modification en position statique.
Ces mesures utilisent toujours le shell simulé et ne rejouent pas une session
Next réelle ni une sauvegarde serveur.

[Barre — bureau 1 440 × 900](preuves/barre-enregistrement-1440-900.png) ·
[Barre — mobile 390 × 844](preuves/barre-enregistrement-390-844.png) ·
[Barre — bureau bas 1 440 × 550](preuves/barre-enregistrement-1440-550.png).

Le lint des composants modifiés passe. Les 33 tests ciblés de présentation et de
l’éditeur de permissions passent également. Les tests de contrôleurs, la portée
SSR serveur, les contrôles globaux et l’intégration réelle appartiennent au
rapport principal, pas à la simulation décrite ici.

## Couverture

- À 320, 390, 768, 1 440 et 1 920 px : Profil, Autorisations, Compte personnel,
  Sécurité ; aucun débordement du document ni du contenu principal. Activité reste
  absente. Annuler l’état restaure la valeur et le focus sur son interrupteur.
- Profil : effacement du nom par Entrée, charge utile PATCH avec `lastName: ''`,
  erreur serveur liée au prénom avec focus, confirmation de retrait du contact et
  retour du focus après annulation. Le scénario valide le client, pas la mise à
  jour SQL du nom facultatif.
- Conflits : actualisation explicite conservant le brouillon dans les quatre
  sections ; retour au champ, rôle, permission personnelle ou interrupteur de
  statut. Échec de relecture : message conservé, focus sur Réessayer, puis reprise.
- Sessions : arrivée directe sans SSR, erreur initiale puis relecture, annulation
  et confirmation de révocation individuelle ; focus conservé même après retrait
  de la ligne. Dates, appareil inconnu et IPv6 de documentation présents.
- Mot de passe : copie A retardée, masquage puis émission B ; le résultat de la
  copie A ne s’affiche pas pour B. Aucun secret réel utilisé.
- Réinitialisation MFA : annulation, réponse réseau perdue après mutation fictive,
  formulaire verrouillé tant que le résultat est incertain, échec puis réussite
  de vérification explicite ; **un seul POST**, retour à la rubrique MFA.
- Autorisations : réglage `persons:create` autorisé mais inutilisable sans
  `persons:view`, libellé explicite et mise à jour de l’accès effectif ; charge utile
  administrative `permissionScope: 'access'`, puis personnelle `'account'` sans
  droits du répertoire ; promotion ADMIN indisponible sans MFA de la cible.
- Lecture seule : champs désactivés, contact masqué, absence de commande de
  sauvegarde et de rubrique Sécurité sans droit ; identité longue sur sa propre
  fiche administrative.
- Portée : instantané SSR fictif accepté sans GET initial, puis A→B→A provoque
  deux lectures sans recycler l’ancien instantané ; simple réordonnancement des
  permissions et actualisation de date conservent le brouillon ; réponse PATCH
  d’une ancienne portée ignorée. Le 403 non JSON retire aussi le secret affiché.

## Décisions sur les composants

- `UserSecurityTab` réutilise `SectionActionBar` pour l’état du compte. Annulation,
  actualisation, attente et libellés de désactivation/réactivation restent liés à
  ce formulaire. Les autres cartes de sécurité conservent leur composition utile.
- `UserMutationFeedback` protège la relecture par verrou synchrone et garde de
  montage ; ses retours de focus suivent la section travaillée, avec titre de
  secours si aucun contrôle n’est éditable.
- `UserPasswordResetFeedback` invalide les opérations de copie anciennes après
  remplacement/masquage du secret ou démontage.
- `AdminMfaResetDialog` distingue refus explicite et issue inconnue après panne,
  réponse inexploitable ou délai de 30 s. Une lecture explicite via `onCheck`
  vérifie l’état avant une éventuelle nouvelle confirmation. Le composant ne
  rejoue pas automatiquement la mutation.
- `UserProfileTab` borne et replie le nom de la vue personnelle en lecture seule.
  Le débordement initial du breadcrumb **simulé** a été corrigé séparément dans
  le banc : il ne prouve aucun défaut du breadcrumb de production.
- Éditeur de permissions, compte personnel, badges, synthèse, onglets et
  primitives conservés ; aucun catalogue, droit ou composant partagé ajouté.

## Captures et limites

[Profil fictif, 320 px](preuves/profil-fictif-320.png) ·
[Sécurité fictive, 320 px](preuves/securite-fictive-320.png) ·
[Autorisations fictives, 1 440 px](preuves/autorisations-fictives-1440.png).

Le shell simule une réservation de 240 px pour la navigation dès 1 024 px et
utilise Arial. Le vrai shell, Geist, la navigation mobile, les preuves MFA,
PostgreSQL, CSRF et les politiques serveur ne sont pas validés par ce banc.
Un instantané simulé ne prouve pas son chargement sur Next SSR réel.
L’absence de débordement ne certifie ni le contraste complet, ni l’usage au
lecteur d’écran, le zoom natif ou les appareils physiques. Pas d’essai réel de
gestionnaire de mots de passe ni du presse-papiers système. Les parcours de
suppression, de révocation globale et les nombreuses combinaisons de délégation
non décrites ici relèvent des autres validations ou restent hors preuve.
