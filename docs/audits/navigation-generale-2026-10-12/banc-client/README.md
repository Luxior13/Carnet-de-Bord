# Banc client — navigation générale

Exécuté le 12 octobre 2026. Ce banc accompagne la revue du cadre privé : menu
latéral, rubrique, compte, fil d’Ariane et recherche rapide.

## Montage et limites

Chromium monte les vrais `PersistentAuthenticatedShell`, `AuthenticatedLayout`,
`Sidebar`, `PoleNavigation`, `Header`, `GlobalSearch`, primitives de menu et de
volet, garde de brouillon et sa confirmation. Les styles globaux et modules CSS
sont compilés depuis le dépôt. `SessionLogoutState` est également réel.

Le compte et les disponibilités de fonctionnalités sont simulés. Le routeur et
`Link` utilisent une histoire navigateur locale ; chaque destination affiche
une page fictive avec un champ de brouillon, pas son véritable formulaire métier.
Les dialogues obligatoires de mot de passe et de MFA sont remplacés par des
composants fermés. Les illustrations du logo viennent du dépôt ; la police est
un remplacement local, sans chargement Next Font. Identité et saisies sont fictives.

Les parcours de déconnexion injectent les états du contexte. Ils ne prouvent
ni le POST, ni son délai, ni la révocation d’une session. Le banc HTTP/Next réel
distinct prend en charge ces points. Aucune base, session réelle, variable `.env`
ou API n’est utilisée ; toute requête `/api/` fait échouer ce banc.

## Avant correction

Les [six observations initiales](preuves/avant-6.json) distinguent défauts et
contrôles déjà positifs. `pass` signifie ici que le constat attendu a été reproduit.

- Focus perdu sur `body` au passage du volet mobile vers le bureau.
- Même perte quand le menu des ancêtres disparaît au passage au chemin complet.
- Après « Rester », le volet se ferme et le focus est perdu, malgré le brouillon
  conservé ; même défaut depuis la recherche rapide.
- La recherche du bureau mesure 36 px, contre les 40 px prévus.
- Un nom de famille absent, normalisé en chaîne vide par le DTO, affiche déjà
  correctement le prénom seul. Aucun défaut de donnée `null` n’est déduit d’un
  mock incompatible avec ce contrat.

La [capture initiale](preuves/avant-navigation-1440.png) conserve la composition
réelle du menu Rubriques existant. Elle ne représente pas l’ancienne grille.

## Après correction

**17 parcours sur 17 réussis** dans les [observations finales](preuves/apres-17.json).
Les assertions exécutées sont dans [scenarios.cjs](scenarios.cjs).

| Parcours | Vérifications |
| --- | --- |
| 1 | Sidebar 390 → 1440 → 390 px : destination correspondante au bureau puis déclencheur mobile focalisés ; un champ extérieur garde son focus. |
| 2 | Ancêtres 390 → 768 → 390 px : lien Accueil visible puis bouton compact focalisés ; pas de vol de focus depuis un champ extérieur. |
| 3–8 | Brouillon puis départ depuis une page, Mon compte, Rubriques, Déconnexion, ancêtres et recherche : « Rester » conserve source, saisie et destination ; confirmation navigue ensuite. Changer de rubrique conserve le volet mobile pour choisir une page. Aucun logout après annulation. |
| 9–14 | 320, 390, 768, 1024, 1440 et 1920 px : prénom/nom et chemin longs, menu au clavier, navigation de rubrique, menu compte, Échap et retour du focus. Recherche à 44 px sur mobile et 40 px sur ordinateur. |
| 15–16 | À 320 et 1440 px, états de déconnexion simulés : attente verrouillée, résultat non confirmé, reprise explicite, succès confirmé avec issue native si le routeur ne change pas de destination. Le titre reçoit le focus ; le shell privé reste absent. |
| 17 | Recherche au clavier, Entrée avec brouillon, annulation puis effacement et fermeture : focus rendu à la saisie puis au déclencheur. Attributs `autocomplete="off"` et exclusion Bitwarden présents. |

Tous ces parcours contrôlent l’absence de débordement horizontal du document et
de la zone principale, d’erreur JavaScript et de requête API. Le champ fictif
sert uniquement à activer la vraie garde. Le contrôle des attributs du champ de
recherche ne prouve pas le comportement d’une extension Bitwarden installée.

Captures inspectées : [mobile 320 px](preuves/navigation-320.png) et
[bureau 1440 px](preuves/navigation-1440.png). Le menu compte reste contenu ;
ses noms longs sont tronqués visuellement et conservent leur nom accessible.

La [passe intermédiaire](preuves/intermediaire-12-sur-14.json) conserve les deux
derniers échecs réellement corrigés : retour bureau → mobile sur `body`, et
clic dans la recherche suivi de « Rester » focalisant la liste de résultats
au lieu de la saisie. Les autres interactions de cette passe étaient positives.

Non exécutés ici : lecture vocale, Firefox, Safari/iOS, zoom natif, couleurs
forcées, comportement du routeur Next sous authentification réelle et contrôle
serveur des destinations. Les changements de rôle/disponibilité et la révocation
réelle de session relèvent des autres preuves de l’audit ; aucune réussite n’est
inférée de leur simulation par défaut.

## Reproduction

Avec les dépendances du dépôt et Chromium déjà installés, depuis la racine :

```powershell
node docs/audits/navigation-generale-2026-10-12/banc-client/run.cjs
```

`AUDIT_ONLY` sélectionne les noms contenant sa valeur. `AUDIT_BEFORE=1` active
les scénarios historiques, dont des compléments exploratoires : ils demandent
une copie isolée du code antérieur et ne sont pas censés réussir sur le correctif.
Les six observations archivées correspondent à la première baseline complète.

Le script affiche son dossier temporaire, écrit `observations.json`, ferme le
navigateur et le serveur et signale tout échec par son code de sortie. Les
captures et observations sont archivées explicitement. Les dossiers temporaires
créés pour cette passe ont été nettoyés après archivage.
