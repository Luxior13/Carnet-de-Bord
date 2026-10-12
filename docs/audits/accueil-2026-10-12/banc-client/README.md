# Banc client — accueil « Mon travail »

Exécution finale : **12 octobre 2026 à 19 h 13, Europe/Paris**, Chromium.
Résultat : **8 parcours réussis sur 8**, sur le code de travail après la correction
de l’accueil, à partir du commit `282066c9852c2c1ba9e6ee1fa83f4a29e72b256b`.

## Périmètre réel et simulations

Le banc monte le véritable `app/page.tsx`, `PageIdentityHero`, `PageShell`,
`PageCanvas`, `Button` et leurs styles, avec la feuille globale compilée.
Le contexte de compte est simulé par un abonnement React : les changements de
prénom ou de compte mettent à jour la page déjà montée, sans réévaluation serveur.
Tous les noms et identifiants sont fictifs.

Le cadre authentifié est simplifié : fil d’Ariane, zone principale et espace
latéral de 240 px à partir de 1024 px. La police du banc est Arial. Le lien Next
est remplacé par un lien HTML utilisant l’historique natif, et la destination
Mon compte par un écran fictif. Aucun serveur Next, fournisseur d’authentification,
API métier ou base de données n’est utilisé. Toute requête `/api/` serait bloquée
et ferait échouer le parcours ; aucune n’a été observée.

Ce banc ne prouve donc ni le comportement du cache Next au retour arrière, ni
la propagation réelle d’une sauvegarde de profil. Le défaut avant correction a
été reproduit séparément dans le
[banc d’intégration réel](../banc-integration/avant.json).

## Parcours exécutés

| Cas   | Largeur                            | Vérifications                                                                                                                                                                                                                                                                 |
| ----- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 à 6 | 320, 390, 768, 1024, 1440, 1920 px | Un titre principal, repère « Mon travail », description explicite de l’espace en préparation, accès Mon compte, focus par Tab, absence de formulaire/tableau ajouté et de débordement horizontal. À 390 px : activation du lien par Entrée et retour par l’historique simulé. |
| 7     | 320 px                             | Prénom accentué de 100 caractères sans coupure ni débordement, repli « Bienvenue » pour un prénom vide et suppression des espaces extérieurs.                                                                                                                                 |
| 8     | 390 px                             | Prénom actualisé, puis changement d’identité et de rôle dans le contexte simulé : salutation actualisée immédiatement, même nœud de titre conservé et focus maintenu sur Mon compte.                                                                                          |

La hauteur du viewport est de 900 px. Les mesures portent sur le document,
la zone principale et le bandeau d’identité. Aucune erreur JavaScript n’a été
observée. Les captures à 320 et 1440 px ont été inspectées : texte lisible,
action réorganisée sur mobile et focus visible. Les styles de focus consignés
dans le JSON sont des mesures immédiates après Tab, avant stabilisation de la
transition ; les captures donnent l’état affiché ensuite.

## Preuves conservées

- [Résultats et mesures des huit parcours](preuves/parcours-8-apres.json).
- [Accueil à 320 px](preuves/accueil-320.png).
- [Accueil à 1440 px](preuves/accueil-1440.png).
- [Scénarios reproductibles](run.cjs), [composition du banc](fixture.tsx) et
  [contexte, cadre et navigation simulés](mocks.tsx).

## Reproduction

Depuis la racine du dépôt, avec les dépendances et Chromium Playwright installés :

```powershell
node docs/audits/accueil-2026-10-12/banc-client/run.cjs
```

Le script ouvre un serveur HTTP local éphémère puis le ferme avec le navigateur.
Il imprime le chemin d’un dossier temporaire `noctambule-home-client-*` contenant
les résultats, les captures et les fichiers compilés. Seules les preuves utiles
sont archivées ici ; les temporaires de cette exécution ont été supprimés après
archivage.

## Limites

Pas de contrôle par lecteur d’écran, appareil mobile physique ou zoom navigateur.
L’authentification, le layout complet, les requêtes serveur, le cache Next et le
retour après une véritable modification de profil relèvent du banc d’intégration.
Le lien simulé et le changement de compte injecté n’en constituent pas une preuve.
Aucun widget futur ni capacité métier supplémentaire n’a été ajouté.
