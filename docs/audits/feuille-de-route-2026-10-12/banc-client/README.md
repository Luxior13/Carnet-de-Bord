# Banc client — Feuille de route, 12 octobre 2026

Ce banc vérifie la page, les cartes, les composants partagés et le CSS réels.
Le catalogue comprend 39 chantiers, huit pôles cibles et six étapes. Aucune
fonction annoncée n’est activée et aucune donnée persistante n’est modifiée.

La session et le cadre authentifié sont remplacés par un cadre minimal ; la
colonne desktop réserve 240 px à la navigation sans reproduire la sidebar.
L’abonnement de Next à l’URL est simulé. Le hook `usePageQuery` et l’historique
natif du navigateur sont réels : écriture synchrone, précédent et suivant.
Le banc refuse et compte tout appel `/api/**` ; aucun n’a été émis. Il ne
valide donc ni authentification, ni autorisation serveur, ni intégration RSC.
Ces sujets appartiennent au banc d’intégration réel du rapport propriétaire.

Le précédent dossier `pages-restantes-2026-10-11` conserve des observations et
captures, sans runner réutilisable. Ce runner reprend le montage esbuild,
PostCSS et Chromium du banc Paramètres du 11 octobre, adapté à cette page.
Il n’importe pas ses anciennes preuves ni ses résultats.

## Résultat final

**18/18 parcours réussis** dans Chromium le 12 octobre 2026 à 18 h 25, heure de
Paris (16:25:06.733 UTC), après les corrections produit de cette passe.
Point de départ `f108f6c`, avec modifications de travail présentes pendant
l’exécution. Le résultat détaillé et les mesures sont conservés dans
[parcours-18-apres.json](preuves/parcours-18-apres.json).

| Parcours                       | Portée vérifiée                                                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Six rendus du catalogue        | 320, 390, 768, 1 024, 1 440 et 1 920 px ; 39 identifiants/titres/premières versions, noms contextuels des articles et boutons, absence de débordement document/main/cartes |
| Filtres combinés               | 48 combinaisons des huit pôles avec les six étapes ; identifiants des résultats comparés au catalogue réel, y compris combinaisons vides                                   |
| Recherche                      | Accents, casse, plusieurs termes, espaces, critère `doneWhen`, absence de résultat ; ponctuation et symboles neutralisés selon le contrat existant                         |
| Deux remises à zéro            | État vide puis bouton général, à 320 et 1 440 px ; retour aux 39 cartes et focus dans la recherche                                                                         |
| Clavier                        | Ouverture/fermeture des deux introductions, bascule d’étape, menus pôle/étape avec Échap et restitution du focus, détail de carte avec Entrée/Espace                       |
| Historique                     | Saisie rapide, filtres successifs, précédent/suivant, puis précédent après nouvelle saisie ; texte et résultats restaurés                                                  |
| Recherche partagée             | Label cliquable, effacement par le bouton au clavier et par Échap, conservation du pôle et du focus, association `aria-controls`                                           |
| URL dupliquée                  | Première valeur retenue puis normalisation sans doublons ; fragment et paramètre tiers conservés, y compris après remise à zéro                                            |
| URL invalide/longue            | Pôle et étape inconnus retirés ; recherche d’URL ramenée à 200 caractères et reflétée dans le champ                                                                        |
| Détails des 39 cartes          | Public, prérequis, critère de livraison et suite visibles après ouverture ; fermeture et absence de lien vers une fonction future                                          |
| Couleurs forcées/texte agrandi | 390 px, racine CSS à 200 %, ouverture de carte sans débordement ; il ne s’agit pas d’un zoom natif de navigateur                                                           |
| StrictMode                     | Recherche et filtre puis remise à zéro à 1 024 px                                                                                                                          |

Chaque parcours surveille les erreurs JavaScript et les débordements. Les
attributs `autocomplete="off"`, `data-bwignore`, `data-1p-ignore` et
`data-lpignore` sont contrôlés sur le champ, ainsi que sa borne de 200 caractères.
Cela confirme les indications du site, sans prouver le comportement d’une
extension Bitwarden ou d’un gestionnaire de mots de passe effectivement installé.

## Défaut visuel constaté et correction vérifiée

Lors de l’adoption de `ListSearchField`, son ancêtre CSS `.directory` manquait.
La loupe apparaissait au-dessus du champ dans le
[rendu intermédiaire](preuves/recherche-sans-scope-avant.png).
Le propriétaire du produit a ajouté le scope au groupe de recherche. La passe
finale mesure l’icône en position absolue à l’intérieur du champ aux six largeurs.
La composition a été relue sur les captures
[mobile 320 px](preuves/catalogue-320.png) et
[bureau 1 440 px](preuves/catalogue-1440.png) : recherche partagée de 320 px au
bureau, bornée à la place disponible au mobile. Le label et la limite de saisie
existaient déjà avant cette passe ; leur contrôle constitue une non-régression.

La [passe intermédiaire](preuves/passe-intermediaire-15-sur-16.json) contient
15 réussites sur 16 : son unique échec est une attente incorrecte du banc,
qui traitait `[.*]` comme une recherche littérale. Le normaliseur existant
neutralise la ponctuation. L’oracle du banc a été corrigé puis les 18 parcours
ont été rejoués ensemble. Cet échec n’est pas présenté comme un défaut produit.

La [capture en couleurs forcées et texte agrandi](preuves/texte-200-390.png)
complète les captures bornées ; elle n’est pas une preuve de conformité globale.

## Reproduction et limites

Depuis la racine du dépôt, avec les dépendances et Chromium déjà installés :

```powershell
node docs/audits/feuille-de-route-2026-10-12/banc-client/run.cjs
```

Le runner écrit ses artefacts dans un nouveau dossier temporaire
`noctambule-roadmap-client-*`, affiche son chemin, ferme son navigateur et son
serveur à la fin. `AUDIT_ONLY` permet de cibler un nom de scénario. Les deux
dossiers temporaires de cette exécution ont été nettoyés après archivage.

Le cadre et la police de secours Arial limitent la comparaison visuelle au site
complet. Le catalogue est réel ; il n’y a aucune API ni base simulant une vitesse
serveur. Les erreurs réseau, mutations et états de chargement de données sont
non applicables à ce catalogue local. Session, sidebar complète, serveur Next,
lecteur d’écran, appareil physique et zoom natif ne sont pas validés par ce banc.
Les tests d’intégration et contrôles globaux appartiennent à la passe du rapport
[Feuille de route](../../2026-10-12-feuille-de-route.md).
