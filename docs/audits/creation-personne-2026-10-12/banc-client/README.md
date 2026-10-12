# Banc client — création d’une personne

Route : `/membres/repertoire/nouveau`. Départ : commit
`5706bbad16d240725593a449e4f81418450d7c7c`, 12 octobre 2026.

## Périmètre

Le navigateur monte la vraie page, `PersonCreateForm`, `PersonIdentityFields`,
le schéma de validation, le client HTTP, la garde de navigation et les composants
partagés avec leurs CSS compilés. Le contexte de compte, la disponibilité du
service, le cadre authentifié et le routeur sont simulés. Les réponses HTTP sont
interceptées dans Chromium ; aucune base, session ou variable `.env` n’est utilisée.
Les identités sont fictives.

Le cadre simplifié réserve 240 px à gauche à partir de 1024 px ; il ne reproduit
pas la sidebar complète. La police du banc est Arial. Les destinations sont des
écrans fictifs ; le contrôle du lien et de la garde ne valide pas le cache Next,
la page de détail ni la persistance réelle.

## Avant correction

Les [quatre reproductions](preuves/avant-4.json) ont été exécutées le 12 octobre
2026 à 19 h 33, Europe/Paris. Leur statut `pass` signifie que le défaut attendu a
bien été reproduit, et ne constitue pas un verdict favorable sur l’ancien code.

- Réponse réseau perdue : un second POST était possible immédiatement, sans clé
  d’idempotence. Le banc ne prétend pas qu’une écriture réelle a eu lieu.
- Erreur 500 : le focus se retrouvait sur `body` après désactivation du bouton.
- Barre d’actions : contenue dans la carte. L’attribut initial `data-dirty=true`
  a aussi été relevé ; ce n’est pas un défaut autonome. La création reste
  disponible sur formulaire vierge pour expliquer la validation à la soumission.
- Disponibilité `true → false → true` : le pseudo saisi disparaissait.

Un premier essai a été écarté après correction de la mesure du banc : la
destination simulée ne possède pas de bandeau d’identité. Les quatre scénarios
ont ensuite été rejoués avec succès ; seul ce résultat complet est archivé.

## Vérification après correction

**28 scénarios réussis sur 28** après correction, le 12 octobre 2026 à 19 h 40,
Chromium. Les [observations finales](preuves/apres-28.json) conservent l’heure
UTC, les comptes de requêtes et les mesures de largeur ; les assertions sont dans
[run.cjs](run.cjs).

| Cas   | Contrôles exécutés                                                                                                                                                                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–6   | Composition à 320, 390, 768, 1024, 1440 et 1920 px ; titres, champs et formulaire sans autocomplétion, exclusion Bitwarden, sélecteur de statut au clavier et retour du focus. Barre désormais hors carte.                                                                                                                |
| 7–9   | Validation vide et prénom seul, correction, pseudo trimé, identité civile complète et statut Dans la structure ; soumission par Entrée, retour contextuel, erreur serveur liée au champ puis reprise.                                                                                                                     |
| 10–12 | Deux soumissions simultanées ne produisent qu’un POST ; attente désactive les actions ; départ annulé restitue focus et saisie, départ confirmé fonctionne, saisie effacée ne déclenche plus de confirmation.                                                                                                             |
| 13–15 | Changement de compte ou retrait du droit pendant le POST : l’ancien résultat ne réapparaît pas ; chargement de disponibilité sans formulaire prématuré.                                                                                                                                                                   |
| 16–19 | Indisponibilité initiale puis revérification, absence de permission, retour externe neutralisé, textes maximaux et actions atteignables à 390 × 500 px, barre dans le flux.                                                                                                                                               |
| 20–22 | Réseau coupé, 500 ou JSON invalide : alerte focalisée, identité conservée et verrouillée, recherche proposée dans un nouvel onglet ; aucune répétition sans confirmation explicite, puis reprise avec le même contenu.                                                                                                    |
| 23–24 | Refus 4xx de la reprise conserve l’incertitude de la première demande et demande une nouvelle confirmation ; délai de 30 s simulé en 100 ms aboutit à l’état incertain sans second POST.                                                                                                                                  |
| 25–28 | Succès avec navigation refusée et stockage bloqué : confirmation focalisée, lien utilisable, aucun second POST ; disponibilité perdue puis rétablie conserve saisie et focus ; refus définitif possède un retour focalisé ; départ pendant requête explique qu’il n’annule pas une écriture et ignore la réponse tardive. |

Les trois captures ont été inspectées :
[création à 320 px](preuves/creation-320.png),
[création à 1440 px](preuves/creation-1440.png) et
[reprise incertaine à 320 px](preuves/incertitude-320.png).
Aucun débordement horizontal du document, de la zone principale ou du bandeau
n’a été mesuré ; aucune erreur JavaScript n’a été observée.

Une passe intermédiaire a échoué sur deux assertions du banc mal adaptées :
ancien titre de l’état indisponible et brouillon attendu à tort après changement
de compte. Ces attentes ont été corrigées, puis les 28 parcours rejoués. Aucun
défaut produit supplémentaire n’a été déduit de ces erreurs de test.

L’avertissement de doublon de coordonnées de l’ancien banc n’est pas rejoué :
ce formulaire ne collecte que pseudo, prénom, nom et statut, sans coordonnée.
Il ne faut pas lui attribuer une détection d’homonymes qu’il ne possède pas.

## Reproduction

Depuis la racine du dépôt, avec les dépendances et Chromium installés :

```powershell
node docs/audits/creation-personne-2026-10-12/banc-client/run.cjs
```

`AUDIT_ONLY` limite l’exécution aux noms contenant sa valeur. `AUDIT_BEFORE=1`
rejoue les attentes du code initial : il exige cette ancienne version du produit.
Le script imprime son dossier temporaire `noctambule-person-create-client-*`,
ferme le navigateur et son serveur HTTP local, puis conserve les observations
et captures dans ce dossier pour inspection. Les bundles ne sont pas archivés.
Les temporaires de cette passe ont été supprimés après archivage.

## Limites

Permissions, sessions, écritures, audits et homonymes réellement autorisés côté
serveur sont couverts séparément par l’intégration, pas par ces simulations.
L’essai d’une réponse perdue établit le comportement du client, pas l’issue de la
transaction. Pas de lecteur d’écran, appareil physique, extension Bitwarden ni
zoom natif : les attributs d’exclusion d’autocomplétion seuls sont contrôlés.
La recherche dans un nouvel onglet n’est pas interprétée comme une preuve
d’absence de doublon ; l’utilisateur confirme lui-même une éventuelle reprise.
Le délai accéléré teste la transition et l’annulation cliente, pas trente
secondes de trafic réel. Les réponses après démontage sont simulées : elles
ne prouvent ni annulation ni rollback d’une transaction serveur.
