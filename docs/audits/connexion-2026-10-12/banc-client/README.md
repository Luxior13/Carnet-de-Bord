# Banc client — Connexion et MFA, 12 octobre 2026

Ce banc compile la vraie page `/login`, `UserProvider`, les composants MFA et le
CSS du dépôt. Le logo local est chargé. Seuls l’abonnement de navigation Next,
son image et les réponses HTTP sont adaptés au navigateur isolé. L’historique du
navigateur est réel ; la destination finale est un écran simulé. Le parcours
modale complémentaire compose le vrai `MfaSetupDialog` avec un déclencheur fictif.

Aucun cookie de session réel, compte existant ni base du projet n’est utilisé.
Les identifiants, mots de passe, codes et clé sont fictifs, créés en mémoire.
L’image de préparation est un pixel fictif, pas un QR opérationnel. Les requêtes
archivées indiquent seulement méthode, chemin, noms des champs, booléen de
confiance et résultat booléen de normalisation du login ; aucun secret envoyé.
Les erreurs sont expurgées du mot de passe et du code de secours fictifs.
Il n’y a ni capture automatique d’échec, ni HTML, ni vidéo, ni trace réseau.

## Résultats exécutés

**30/30 parcours réussis** le 12 octobre 2026 à 18 h 49, heure de Paris
(16:49:02.862 UTC), dans Chromium. Point de départ
`0fd674a6e6c943779ef248ce36a25be286c09c8e`, modifications de travail présentes.
Les [observations finales](preuves/parcours-30-apres.json) détaillent chaque
scénario, ses requêtes sans contenu sensible et les mesures de débordement.

| Parcours                             | Vérification et résultat                                                                                                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sept rendus d’identification         | 320, 390, 768, 1 024, 1 280, 1 440 et 1 920 px ; focus initial, ordre Tab, affichage/masquage du mot de passe vide, case de confiance au clavier, attributs d’autocomplétion et borne du login  |
| Deux refus puis reprise              | À 390 et 1 440 px : refus des identifiants puis TOTP, erreur focalisée, Tab vers le champ, bascule secours et succès                                                                            |
| Doubles soumissions                  | Deux soumissions synchrones du formulaire produisent un seul POST identifiants puis un seul POST MFA ; champs désactivés pendant attente ; login normalisé et `rememberMe` transmis             |
| Stockage bloqué                      | Connexion MFA réussie malgré les accès `localStorage` et `sessionStorage` refusés                                                                                                               |
| Anciens identifiants                 | Trois anciennes clés locales nettoyées ; aucun identifiant prérempli                                                                                                                            |
| Refus et réseau                      | Réponse perdue, réponse non JSON, 429 et compte désactivé ; erreur locale puis nouvelle connexion explicite réussie                                                                             |
| Défi expiré                          | Refus serveur d’un défi expiré puis retour aux identifiants, mot de passe effacé et nouvelle connexion                                                                                          |
| Retour avec requête retardée         | Attente de suppression du défi puis réseau refusé ; retour utilisable, focus identifiant et secrets effacés                                                                                     |
| Collage natif                        | Presse-papiers Chromium et Ctrl+V : TOTP avec espace et code de secours groupé conservés intégralement                                                                                          |
| Configuration complète               | Préparation, code, dix codes de secours, copie de la clé et des codes, téléchargement nommé, garde avant déchargement et confirmation explicite avant Terminer                                  |
| Configuration refusée puis reprise   | Préparation 500 puis succès, code refusé puis succès, focus des erreurs et confirmation des codes ; refus du presse-papiers signalé                                                             |
| Confirmation de configuration perdue | Résultat incertain, retrait du QR/champ, un seul PUT, rechargement puis session retrouvée                                                                                                       |
| Timeouts identifiants/retour         | Attentes de 30 secondes accélérées dans le banc, formulaire puis retour débloqués sans seconde mutation automatique                                                                             |
| Démontage pendant requête            | Réponse d’identification tardive après démontage ignorée ; aucune navigation ou interface réouverte                                                                                             |
| Deux destinations                    | Destination interne avec paramètres/fragment conservée ; destination externe remplacée par l’accueil                                                                                            |
| Session déjà présente                | Lecture initiale authentifiée mène à la destination interne prévue                                                                                                                              |
| Modale au clavier                    | À 390 × 550 px : focus initial, Tab confiné, Échap bloqué selon contrat, annulation serveur refusée puis réussie, retour du focus au déclencheur                                                |
| Deux vérifications MFA perdues       | Code de secours potentiellement consommé : pas de nouveau POST automatique ; GET explicite retrouve la session, ou annonce son absence puis permet de recommencer avec de nouveaux identifiants |
| Timeouts de configuration            | Préparation expirée puis reprise ; confirmation expirée reste incertaine et ne renvoie aucun code automatiquement                                                                               |
| Configuration obligatoire expirée    | PUT 401 retire QR/clé/code et revient à l’autorisation ; même sans Annuler, une préparation explicite est possible après nouvelle saisie du mot de passe                                        |
| StrictMode                           | Identification puis MFA réussies sans double POST                                                                                                                                               |

Les timeouts de 15 et 30 secondes sont ramenés à 120 ms uniquement dans les
scénarios marqués `fastTimeout`. Leur valeur de production n’est pas modifiée.
L’expiration du défi est représentée par le refus de l’API simulée ; aucune
durée de validité serveur ni cryptographie TOTP n’est démontrée ici.

Chaque parcours contrôle erreurs JavaScript et débordement horizontal du
document/corps ; les modales contrôlent aussi leur contenu. Les formulaires et
champs examinés conservent `autocomplete="off"` et les exclusions
Bitwarden/1Password/LastPass. Aucun gestionnaire de mots de passe installé
n’a été essayé : les attributs ne prouvent pas qu’une extension les respecte.

## Preuve avant/après du collage

Le [contrôle avant](preuves/collage-natif-avant.json) compile uniquement
`MfaCodeInput` depuis `0fd674a`, en mémoire, avec la page et le contexte courants.
Le collage natif de six chiffres contenant un espace ne garde que **cinq**
chiffres, à cause de la troncature native avant normalisation.
Le [même contrôle après](preuves/collage-natif-apres.json) réussit avec le
composant corrigé et vérifie également le code de secours groupé.
Ce scénario figure aussi dans la passe finale de 30 parcours ; le contrôle
ciblé ne constitue pas un parcours supplémentaire distinct.

Une première passe a échoué sur deux attentes du banc : elle attendait le focus
directement sur le champ, alors que le contrat corrigé place le focus sur
l’erreur puis permet Tab vers la saisie. L’oracle a été ajusté et les 30 parcours
ont été rejoués ensemble. Ces deux écarts ne sont pas des défauts produit.

Seules les captures [identifiants vides à 320 px](preuves/identifiants-vides-320.png)
et [identifiants vides à 1 440 px](preuves/identifiants-vides-1440.png) sont
conservées. Elles ont été relues et ne contiennent ni saisie, ni QR, ni clé, ni
code de récupération. Les étapes sensibles n’ont produit aucune capture.

## Reproduction et limites

Depuis la racine, avec les dépendances et Chromium installés :

```powershell
node docs/audits/connexion-2026-10-12/banc-client/run.cjs
```

Le runner affiche son dossier temporaire `noctambule-login-client-*`, ferme
navigateur et serveur à la fin, et conserve ses artefacts pour inspection.
`AUDIT_ONLY` filtre les noms de scénarios. Pour la preuve avant uniquement :

```powershell
$env:AUDIT_ONLY = 'collage-natif'
$env:AUDIT_BASELINE_MFA = '1'
node docs/audits/connexion-2026-10-12/banc-client/run.cjs
```

Remettre ces variables à vide pour une passe normale. Cette option lit Git,
sans réécrire le composant produit. Les quatre dossiers temporaires utilisés
dans cette passe ont été nettoyés après archivage.

La police Arial de secours diffère de la police chargée par Next. Ce banc ne
valide ni cookie/CSRF réel, chiffrement, TOTP, consommation unique en base,
transactions, limites serveur d’essais, livraison HTTP des cookies après commit,
ni redirection exécutée par Next. Le presse-papiers est simulé sauf dans le
scénario de collage natif ; le téléchargement contient seulement des codes
fictifs et n’est pas archivé. Lecteur d’écran, appareil physique, zoom natif et
navigation complète de l’espace privé restent hors de cette preuve. L’intégration
authentifiée et les contrôles globaux sont consignés dans le rapport propriétaire
de l’audit Connexion du 12 octobre.
