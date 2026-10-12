# Banc client — erreur, page introuvable et chargement

Départ : commit `973138502cd27f5d39b253e3c871a5038b32fcfd`, 12 octobre 2026.

## Montage et limites

Chromium monte les vrais `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`,
`RouteErrorState` après correction et `PersistentAuthenticatedShell`, avec leurs
primitives et CSS compilés. Le compte, le chemin renvoyé par le routeur, le header,
la sidebar et les dialogues de sécurité fermés sont simulés. Le cadre conserve
les vrais conteneurs, la zone principale et le lien d'évitement du shell. La police
est Arial, sans téléchargement de police. Toutes les données sont fictives.

Le serveur HTTP du banc sert ces composants isolés. Un rechargement ou le lien
natif d'accueil déclenchent bien une navigation de document GET vers ce serveur ;
cela ne prouve pas la réexécution des composants serveur Next. La 404 utilise un
`Link` simulé. L'erreur est montée par le scénario, sans jeter d'exception dans
un boundary du framework. `global-error.tsx`, ses balises HTML et le chargement
de ses assets relèvent du banc Next réel distinct.

Aucune base, session réelle, variable `.env` ou API métier n'est utilisée. Toute
requête `/api/` ferait échouer le banc. Celui-ci ne valide ni les redirections
d'authentification ni les codes HTTP 404/500 du serveur Next.

## Avant correction

Les [quatre observations initiales](preuves/avant-4.json) ont été exécutées le
12 octobre à 20 h 56 Europe/Paris. Dans cette preuve, `pass` signifie que le
scénario attendu a bien été reproduit, pas que l'ancien comportement est correct.

- Un contrôle focalisé remplacé par l'erreur laisse le focus sur `body` ; la
  seule issue proposée est Réessayer, sans retour à l'accueil.
- Dans la branche publique du shell, l'erreur n'a aucun landmark principal.
- Le chargement possède déjà un `status` nommé, mais aucun texte enfant. Ce
  constat ne prouve pas une défaillance d'annonce par lecteur d'écran.
- Une référence de 512 caractères reste contenue à 320 × 500 px et le message
  interne fictif de l'exception n'est pas affiché. Ce contrôle était déjà positif.

La [capture initiale](preuves/avant-erreur-320.png) montre la partie visible du
conteneur défilant, pas tout son contenu vertical.

## Après correction

**13 scénarios sur 13 réussis**, le 12 octobre à 21 h 02 Europe/Paris.
Les [observations finales](preuves/apres-13.json) conservent les mesures et les
navigations de document. Les assertions sont dans [scenarios.cjs](scenarios.cjs).

| Cas | Contrôles exécutés                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–6 | Les trois états à 320, 390, 768, 1024, 1440 et 1920 px, avec un seul `main` privé, titres et actions adaptés ; aucun formulaire ni saisie ; absence de débordement du document et de la zone principale. |
| 7   | Après remplacement de la page par l'erreur, focus sur le titre ; Tab vers Recharger puis accueil, focus visible et navigation native de retour.                                                          |
| 8   | Recharger au clavier produit un unique nouveau GET document ; le nouveau document simulé présente une page rétablie. Le callback historique `reset` n'est pas utilisé.                                   |
| 9   | Deux activations synchrones du bouton ne lancent qu'un GET supplémentaire ; répété sur une erreur persistante, le titre reprend le focus et le lien d'accueil reste disponible.                          |
| 10  | Erreur publique avec un `main` et titre focalisé ; chargement public transitoire nommé. La 404 publique n'est pas une branche du produit actuel et n'est pas imposée au composant.                       |
| 11  | Référence de 512 caractères, message interne masqué, viewport 320 × 250 px : titre et deux actions accessibles après défilement.                                                                         |
| 12  | Texte racine porté à 32 px, les trois états restent contenus ; animations des squelettes neutralisées avec mouvement réduit. C'est une simulation de texte agrandi à 200 %, pas un zoom natif.           |
| 13  | L'apparition du chargement conserve le focus sur le lien d'évitement ; l'arbre accessible contient le statut nommé et son texte « Chargement de la page… ».                                              |

Les 30 mesures de contraste des titres, descriptions et références sur leurs
surfaces opaques vont de **5,83:1 à 15,15:1**. Ce contrôle ciblé ne constitue pas
une certification WCAG globale ni une mesure de toutes les couleurs et états.
Aucune erreur JavaScript ni requête API n'est observée dans la passe finale.

Les quatre captures ont été inspectées :
[erreur 320 px](preuves/error-320.png),
[erreur 1440 px](preuves/error-1440.png),
[404 à 320 px](preuves/not-found-320.png) et
[404 à 1440 px](preuves/not-found-1440.png).

La [passe intermédiaire](preuves/intermediaire-11-sur-13.json) conserve deux échecs
distincts : la double activation produisait réellement deux GET sans verrou
synchrone, corrigé ensuite ; l'autre assertion imposait à tort un `main` à une
404 publique qui n'existe pas dans le parcours actuel. Cet oracle a été retiré.
Le chargement public transitoire reste sans `main` propre, choix conservé dans
cette passe. Aucun défaut de 404 publique n'est déduit de ce montage artificiel.

## Reproduction

Depuis la racine, avec les dépendances du dépôt et Chromium installés :

```powershell
node docs/audits/etats-techniques-2026-10-12/banc-client/run.cjs
```

`AUDIT_ONLY` sélectionne les noms contenant sa valeur. `AUDIT_BEFORE=1` active
les quatre contrôles historiques, qui nécessitent le code d'avant correction
dans une copie isolée. Ne pas attendre ces anciennes assertions vertes sur le
code corrigé.

Le script imprime son dossier temporaire, écrit `observations.json`, ferme
navigateur et serveur et retourne un échec si une assertion échoue. Les preuves
sont archivées explicitement ; les trois dossiers temporaires de cette passe
ont été retirés après archivage.

Non exécutés ici : lecteur d'écran, Firefox, Safari/iOS, zoom natif, couleurs
forcées, vraie panne du routeur ou du root layout. L'autocomplétion est non
applicable : ces états ne comportent aucun champ.
