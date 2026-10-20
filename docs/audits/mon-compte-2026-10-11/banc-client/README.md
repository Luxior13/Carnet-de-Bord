# Banc client — Mon compte, 11 octobre 2026

Ce banc charge `AccountPageContent`, ses sections différées, les formulaires et
dialogues réels, les primitives et le CSS du dépôt. Point de départ : `ab3387c`,
avec les corrections locales de la présente revue. Session, navigation Next,
layout authentifié, API et presse-papiers sont simulés. Les identités, IP et
secrets sont fictifs ; aucune base ni session réelle n'est utilisée.

Depuis la racine du dépôt, avec les dépendances et Chromium installés :

```powershell
node docs/audits/mon-compte-2026-10-11/banc-client/run.cjs
```

Le dossier temporaire de sortie est affiché au démarrage. Le serveur et Chromium
sont fermés à la fin. `AUDIT_ONLY` sélectionne les noms contenant cette valeur ;
retirer la variable pour la passe entière. Les charges utiles archivées excluent
mots de passe et codes. Les captures utilisent uniquement les exemples fictifs.

## Preuves

| Passe | Résultat | Portée |
| --- | --- | --- |
| [Passe principale](preuves/passe-principale-22.json) | 21/22 | Tous les parcours exécutés sauf le scénario de mot de passe obligatoire, arrêté par une attente incorrecte du banc |
| [Mot de passe obligatoire après correction du banc](preuves/mot-de-passe-obligatoire.json) | 1/1 | Dialogue obligatoire, sans mot de passe actuel, sans annulation/Échap ; une soumission et callback de succès |
| [Entrée native dans le profil](preuves/profil-entree-native.json) | 1/1 | Entrée depuis le prénom déclenche un seul PATCH, sans ouvrir le contact ; focus au champ après succès |
| [État password incertain final](preuves/mot-de-passe-reponse-perdue-final.json) | 1/1 | Après la dernière retouche locale : aucun champ de saisie résiduel, erreur focalisée et commande de rechargement |
| [Focus MFA avant correction](preuves/focus-mfa-avant.json) | 0/1 | Le bouton ouvreur est recréé pendant la relecture : le focus retombe sur le document après Terminer |
| [Focus MFA après correction](preuves/focus-mfa-apres.json) | 1/1 | Retour au bouton « Changer d’application » recréé, à 390 × 550 px |

**23 parcours distincts réussis**, répartis entre la passe principale, le
complément obligatoire et la soumission native par Entrée. Le seul échec de la passe principale concernait
l'attente initiale du banc : la navigation est correctement retirée de l'arbre
accessible par le dialogue modal. L'attente utilise désormais le dialogue pour
ce scénario ; aucune correction produit n'a été nécessaire. La dernière retouche
locale retire le champ de confirmation restant dans l'état de réponse incertaine ;
son scénario ciblé est rejoué. Les 23 n'ont pas été rejoués ensemble après ces
deux ajustements et l'ajout du scénario Entrée.

Le lint des sept composants modifiés passe sans avertissement. Les contrôles
globaux, les tests SQL et l'intégration authentifiée sont documentés dans le
[rapport principal](../../2026-10-11-mon-compte.md), séparément de ce banc.

## Couverture observée

- Sécurité à 320, 390, 768 et 1 440 px : affichage des sessions, détails
  techniques et dates ; aucun débordement horizontal du document/contenu principal.
- Mot de passe aux quatre largeurs : focus initial, saisie sans autocomplétion,
  annulation avec retour à l'ouvreur. Succès, double soumission, réponse perdue
  avec message d'issue incertaine et commande explicite de rechargement.
- Sessions : confirmation globale maintenue pendant DELETE, Annuler/Échap
  inopérants pendant la requête, retrait individuel/global avec focus sur le
  titre Sessions. Refus 403 non JSON de la relecture : ancienne commande globale
  supprimée, Réessayer recharge et rend le focus au titre.
- MFA : saisie, scan et confirmation sur viewport 390 × 550 px, présentation des
  codes, confirmation de conservation obligatoire. Après succès, retour au
  bouton recréé. Réponse de confirmation perdue : pas de second PUT automatique,
  codes absents explicitement signalés, commande de rechargement.
- Codes de secours : focus sur la confirmation de conservation, copie retardée
  puis changement d'acteur sans toast tardif ni secret conservé à l'écran ;
  réponse de régénération perdue avertissant que les anciens codes peuvent être
  invalides ; avertissement natif avant un rechargement tant que les codes n'ont
  pas été déclarés conservés, puis Terminer avec retour du focus.
- Profil : conflit, conservation du prénom modifié et récupération du nom
  modifié côté serveur, relecture explicite puis sauvegarde avec focus au champ.
  En lecture seule, prénom/nom désactivés et aucune barre de sauvegarde ; la
  gestion du contact reste accessible conformément à la permission personnelle
  toujours active.
- Contact : changement du contexte pendant une saisie sans effacer adresse ni
  preuve ; la première requête conserve la version d'ouverture. Après conflit,
  GET explicite, preuve effacée, adresse saisie conservée et nouvelle confirmation
  utilisant la version relue ; retour à Gérer après succès.

## Corrections examinées

`SecuritySection` conserve ses cartes et contrôles utiles. Les lectures récentes
priment sur les anciennes ; refus 401/403 purgent les données de sécurité ;
révocation et relecture restent verrouillées jusqu'à leur fin. Les lignes ont
une commande de déconnexion nommée par appareil. Les dialogues de sécurité
signalent une réponse incertaine, bornent les mutations sensibles à 30 secondes
et ignorent les retours après démontage. Les preuves saisies sont effacées après
la réception des secrets suivants. Une copie en retard ne publie plus son résultat
après changement de codes ou départ.

Le dialogue de mot de passe attend aussi la mise à jour de l'affichage ; si cette
mise à jour échoue après confirmation du serveur, il propose de l'actualiser
sans renvoyer le changement. Ce dernier chemin est vérifié par lecture du code,
pas par un échec de contexte simulé dans ce banc.

[Sécurité mobile](preuves/securite-320.png) ·
[Sécurité bureau](preuves/securite-1440.png) ·
[Mot de passe — réponse perdue](preuves/mot-de-passe-reponse-perdue-390.png) ·
[MFA — réponse perdue](preuves/mfa-reponse-perdue-390.png).

## Limites

API, permissions reçues, navigation, cookie/session, délivrance des codes et
presse-papiers sont simulés. Le banc ne prouve ni validation serveur, ni rollback,
ni transaction SQL, ni TOTP réel. Les mutations réseau perdues simulées sont des
abort de transport, sans commit réel. Le QR est une image de démonstration.

Le DTO utilisateur simulé contient une version `updatedAt`. L'absence de ce champ
dans une ancienne projection serveur a été détectée par l'intégration réelle,
et non par ce banc. Le scénario Entrée confirme le comportement du formulaire
lorsqu'il reçoit une version ; il ne valide pas la projection de session.

Le shell latéral réserve 240 px sur bureau ; ce n'est pas le shell Next réel.
Chromium seul, sans lecteur d'écran, Safari/iOS, zoom natif ni clavier virtuel
réel. Les attributs sans autocomplétion sont constatés ; les extensions ne sont
pas pilotées. Le timeout de 30 secondes, le téléchargement des codes et les
refus 401/403 MFA spécifiques sont inspectés dans le code mais non exécutés
distinctement ici. Aucun budget de performance n'est déduit de ce banc.
