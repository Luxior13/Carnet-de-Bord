# États techniques — intégration du 12 octobre 2026

[Rapport](../../2026-10-12-etats-techniques.md) ·
[Parcours réels](run.cjs) · [Préparation des sondes](prepare-probes.cjs) ·
[Parcours des sondes](run-probes.cjs).

## Environnement et méthode

Next **15.5.23**, construit en production, Chromium **149.0.7827.55** et
PostgreSQL **17** avec les **52 migrations** du projet. Point de départ :
`9731385`. Le serveur écoute uniquement sur `127.0.0.1:3126`, la base fictive
`technical_states_test` sur `127.0.0.1:54630`. Les scripts refusent les autres
cibles. Aucun fichier de configuration habituel modifié, aucune mutation de
la base du projet et aucune route de diagnostic ajoutée au produit.

Le compte racine fictif est préparé avec `scripts/e2e-setup.mjs` et une cible
E2E explicite. La connexion, le mot de passe, l'enrôlement puis la vérification
TOTP, les cookies de session et CSRF passent par les vraies interfaces et API.
`AUDIT_ENV_FILE` désigne un `env.json` privé dans un dossier temporaire
`noctambule-technical-states-*` : variables E2E, clés de chiffrement et mot de
passe fictifs. La session Playwright et le secret TOTP restent dans ce dossier.
Ils ne sont pas archivés.

Le banc principal arrête réellement **son seul cluster PostgreSQL isolé**,
puis le redémarre. Il observe ainsi la panne du layout racine authentifié,
sans intercepter ni fabriquer sa réponse HTTP. Les commandes `pg_ctl` sont
bornées au dossier `pgdata` de ce banc. Il faut garder ce cluster exclusif
pendant l'exécution.

Les erreurs de rendu serveur/client et le délai de chargement utilisent une
**copie temporaire des sources**. Deux pages de sonde y sont créées : une
lecture serveur contrôlée par un fichier privé et une erreur de rendu client
contrôlée par `sessionStorage`. Le délai serveur est de 1 800 ms. La copie
réutilise les dépendances installées par deux jonctions, sans copier `.env`,
`.git`, les clés ou le build principal. Son build est distinct. La session MFA
réelle du premier banc est réutilisée ; aucune authentification n'est simulée.

Pour la comparaison des sondes, `--baseline-error` remet uniquement
`app/error.tsx` de `9731385` dans cette copie. Les autres sources sont celles de
la passe corrigée. Ce montage isole le comportement de `reset()` ; il ne
prétend pas reconstruire intégralement l'ancienne application.

## Résultats

| Preuve | Résultat et portée |
| --- | --- |
| [HTTP avant](baseline-resultats.json) | 5 parcours exécutés ; panne racine reproduite avec écran générique anglais, sans action ni lien, puis reprise par rechargement manuel du navigateur. L'observation supplémentaire du fallback n'est pas un sixième parcours. |
| [HTTP final](final-resultats.json) | **5/5** : refus anonyme, vraie connexion MFA, route introuvable, `notFound()` du catch-all, panne PostgreSQL et reprise par le bouton. |
| [Sondes avant](baseline-sondes-resultats.json) | **4/4 contrôles de caractérisation** : une cause serveur réparée reste en erreur après `reset()`, sans nouvelle requête ; le rechargement du navigateur la rétablit. Pas de sortie vers l'accueil dans l'erreur persistante. Erreur client et chargement diffusé exercés. |
| [Sondes finales](final-sondes-resultats.json) | **4/4** : reprise serveur par GET, erreur persistante avec nouvelle tentative et sortie vers l'accueil, reprise client, chargement visible puis contenu. |

Une route inexistante anonyme redirige vers la connexion (**307**). Après
authentification, la route sans correspondance retourne **404** et `noindex`.
Le catch-all appelle bien `notFound()`, mais son rendu déjà diffusé conserve
ici le statut HTTP **200**. Le banc n'assimile pas ce cas à une réponse 404.

La panne racine finale retourne **500** : document français, un seul `main`,
titre focalisé, fond attendu et fontes Geist réellement chargées. Les actions
fonctionnent avec le middleware et la CSP du produit ; aucun détail Prisma,
mot de passe ou clé n'apparaît dans l'interface. L'URL et sa query sont
conservées par le rechargement. Le contrôle exclut tout rejeu de mutation
métier ; les POST de télémétrie `web-vitals` sont distingués des mutations.

Les contrôles de 404 couvrent 320, 390, 768 et 1440 px. La panne globale est
également exécutée avec `isMobile: true` à **390 px**, après rechargement et
dans un contexte neuf par navigation directe pendant la panne. Dans les deux
cas finaux : `width=device-width, initial-scale=1`, largeur intérieure 390 px
et aucun débordement. La [mesure intermédiaire](global-viewport-avant.json)
prouve l'absence initiale de la balise viewport autonome ; elle ne prouve pas
un affichage à 980 px, la largeur restant 390 px dans ce parcours.

Le [relevé de reprise intermédiaire](reprise-intermediaire.json) conserve trois
refus `P1017` après redémarrage : trois clics du banc en **166 ms**. Ces refus
sont compatibles avec des connexions fermées du pool, dont l'état interne
n'a pas été mesuré. Le protocole final limite les actions
à trois, avec **1 seconde entre deux tentatives**. Le dernier parcours a
réussi dès le **premier clic**, sans redémarrer Next. Cela ne garantit aucun
délai universel de reprise du pool ; aucun réessai automatique n'a été ajouté
au produit. Pendant le refus, les deux sorties restent disponibles.

Captures inspectées : [fallback initial](baseline-global-outage-390.png),
[erreur globale finale à froid](final-global-cold-mobile-390.png),
[erreur serveur finale](final-server-boundary-390.png),
[chargement diffusé](final-streamed-loading-390.png),
[404 mobile](final-404-320.png) et [404 large](final-404-1440.png).

## Reproduction

Après préparation d'un nouveau cluster et du fichier privé aux cibles exactes
ci-dessus, injecter explicitement `DATABASE_URL` depuis `E2E_DATABASE_URL` pour
chaque build/démarrage. Démarrer le build principal en production sur 3126,
puis exécuter depuis la racine :

```powershell
node docs/audits/etats-techniques-2026-10-12/banc-integration/run.cjs final
node docs/audits/etats-techniques-2026-10-12/banc-integration/prepare-probes.cjs --baseline-error
```

Dans la copie indiquée par `probe-workspace.txt`, formater les deux pages de
sonde avec ESLint puis lancer `bun run build`. Arrêter le Next principal et
démarrer le Next de la copie sur le même port, avec le même environnement
privé. Exécuter `run-probes.cjs baseline`. Réexécuter `prepare-probes.cjs` sans
option, reconstruire/redémarrer la copie puis lancer `run-probes.cjs final`.
Le runner HTTP `baseline` requiert le build initial, tandis que les sorties
finales archivées correspondent aux sources corrigées.

## Limites et nettoyage

La panne PostgreSQL est locale et franche, sans proxy ni dégradation réseau
graduelle. Les sondes prouvent les boundaries et le streaming Next sur des
pages artificielles temporaires ; elles ne simulent pas un défaut d'une route
métier existante. Pas de mobile physique, Safari, lecteur d'écran, zoom natif
ou extension de gestionnaire de mots de passe. Le rendu et les actions sous
CSP sont exercés, sans nouvel audit exhaustif de ses directives.

La documentation Next consultée via Context7 porte sur la version 15.1.11,
la plus proche proposée ; le comportement est ensuite vérifié dans le code
installé **15.5.23** et dans les sondes. La
[documentation officielle d'erreur Next 15](https://github.com/vercel/next.js/blob/v15.1.11/docs/01-app/03-api-reference/03-file-conventions/error.mdx)
décrit le document autonome de `global-error` ; aucune API issue d'un extrait
canary n'a été appliquée au projet.

Après les contrôles, Next 3126 et PostgreSQL 54630 ont été arrêtés, leurs ports
vérifiés libres. Les deux jonctions ont été retirées après vérification du
type `ReparsePoint` et de leur cible exacte, **avant** toute suppression
récursive. La copie, le cluster, les sessions, le secret TOTP, les clés et le
marker temporaires ont été supprimés. Neuf fichiers texte de preuve ont été
comparés aux valeurs privées du banc avant suppression : aucune occurrence.
Seuls scripts, résultats structurés et captures fictives restent archivés.
