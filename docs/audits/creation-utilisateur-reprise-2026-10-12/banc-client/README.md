# Création utilisateur — reprise et focus

Complément ciblé exécuté le **12 octobre 2026 à 23 h 15, Europe/Paris**, sur
Chromium. Le [suivi Utilisateurs](../../../pages/systeme/utilisateurs/README.md)
porte les décisions et la clôture des défauts. Ce banc ne remplace pas la passe
complète du 11 octobre.

## Périmètre et méthode

La page de création, `useCreateUser`, `AdminStepUpDialog`, le cadre authentifié,
les composants et les CSS sont les sources réelles. Les contextes de session et
de disponibilité, les réponses API et la navigation Next sont simulés. Les
données et les preuves d'authentification sont fictives ; ni mot de passe,
ni code MFA, ni secret temporaire ne sont archivés.

Le point de départ est le commit `31091b3`, avant le correctif local de focus.
Le hook et la page ont été copiés avant modification pour figer la reproduction.
La passe finale utilise les sources corrigées du répertoire de travail.

## Résultats

La [preuve avant](preuves/focus-verification-avant.json) reproduit un défaut :
après une réponse de création perdue, une vérification GET lente reprend le
focus sur son panneau alors que l'utilisateur vient de choisir au clavier le
lien « Paramètres système ». Le statut `pass` signifie ici que la reproduction
attendue a réussi, pas que le comportement initial était correct.

La [preuve après](preuves/apres-6.json) contient **6 scénarios réussis** :

| Scénario | Largeur | Résultat contrôlé |
| --- | --- | --- |
| Vérification tardive après un nouveau geste clavier | 1440 px | Le lien choisi garde le focus |
| Vérification sans nouveau geste | 390 px | Le panneau du résultat reçoit le focus |
| Échec de vérification après un nouveau geste | 1440 px | L'erreur paraît sans déplacer le focus choisi |
| Annulation du défi ADMIN | 390 px | Retour au bouton « Créer le compte » ; aucun POST de preuve |
| Succès du défi ADMIN puis création | 1440 px | Une seule reprise de création ; focus « Compte créé » |
| Défi ADMIN encore en attente à 31 secondes | 390 px | Requête interrompue, preuves effacées, champ focalisé et Annuler disponible |

Les trois derniers cas contrôlent le consommateur du dialogue partagé récemment
modifié ; ils ne révèlent pas trois nouveaux défauts. Le premier essai du banc
cliquait directement une radio visuellement masquée : cet oracle a été corrigé
pour utiliser son libellé visible. Seul le cas de focus effectivement exécuté
est conservé dans l'archive avant.

Captures bornées à l'écran de reprise, sans secret :
[avant](preuves/focus-verification-avant-1440.png) et
[après](preuves/focus-verification-apres-1440.png).

## Reproduction et limites

Depuis la racine :

```powershell
node docs/audits/creation-utilisateur-reprise-2026-10-12/banc-client/run.cjs
```

Le script affiche son répertoire temporaire de sortie. Pour une reproduction
avant correctif, `AUDIT_BEFORE=1` et `AUDIT_BASELINE_DIR` permettent d'utiliser
une copie préalable de `useCreateUser.ts` et `page.tsx`. Les copies temporaires
de cette exécution ont été supprimées après archivage ; les sources et les
preuves finales restent conservées ici.

L'horloge est contrôlée pour les délais et les doubles trames de focus. Les
polices du vrai serveur Next ne sont pas chargées. Seules les largeurs 390 et
1440 px sont couvertes dans ce complément, sans nouvelle campagne visuelle.
Le routage Next réel, l'authentification, la validité TOTP, les transactions SQL
et le contrôle des droits après calcul du mot de passe relèvent du banc serveur
distinct. Les anciens délais de création 30 s et de vérification 15 s n'ont pas
été entièrement rejoués ici ; aucun nouveau résultat n'est revendiqué sur eux.
