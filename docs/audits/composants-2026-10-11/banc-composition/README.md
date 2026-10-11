# Banc — compositions, retours et fiche Répertoire

Contrôle du 11 octobre 2026 : **20 scénarios réussis** dans Chromium
149.0.7827.55. Les composants et le CSS viennent du dépôt ; les données, le
routeur et les réponses API sont simulés. Résultats détaillés dans
[observations.json](observations.json).

Depuis la racine, avec les dépendances du dépôt et Chromium Playwright installés :

```powershell
node docs/audits/composants-2026-10-11/banc-composition/run.cjs
```

Le script crée un dossier temporaire `noctambule-composition-audit-*`, compile
les sources locales, lance un serveur HTTP local éphémère et ferme navigateur
et serveur après les contrôles. `AUDIT_ONLY` permet de filtrer les noms de
scénarios. Aucun fichier d’environnement, cookie ou compte réel n’est utilisé.
Les contextes simulés réutilisent ceux du
[banc de navigation](../../navigation-sections-2026-10-11/banc/mocks.tsx).

## Scénarios et corrections

- À 320, 390, 768 et 1 440 px : titre de 80 caractères, URL sans espaces,
  action longue, descriptions de section et états vide/erreur. Avant correction,
  le bandeau de référence et les états débordaient. Texte, boutons et états
  restent maintenant dans leur conteneur.
- À 320 et 1 440 px : ouverture au clavier, focus initial, confinement,
  Échap et retour du focus des fenêtres, confirmations et volets. Le panneau
  flottant contient une URL longue ; le menu conserve la sélection clavier et
  le composant Disclosure s’ouvre avec Entrée, se replie avec Espace.
- Suppression à 390 px : conflit 409, attente d’actualisation distincte de
  « Suppression… », fermeture bloquée pendant la requête et nouvelle
  confirmation explicite avec la version actualisée. La clé d’idempotence
  reste stable pour la même tentative.
- Identité du Répertoire à 320 et 1 440 px : deux soumissions synchrones
  donnent une seule requête ; conflit 409, actualisation 500 puis réussie,
  brouillon conservé et champs inchangés actualisés. Entrée enregistre avec
  la dernière version après confirmation manuelle.
- À 390 px : annulation restaure la dernière version connue et le focus ;
  validation locale sans requête ; erreur persistante après un échec serveur ;
  réponse PATCH tardive après changement de fiche ignorée ; réponse GET
  tardive ignorée par la page propriétaire ; mise à jour externe et retrait du
  droit d’édition sans écrasement de la saisie ni écriture autorisée côté client.

Captures relues : [bandeaux à 320 px](identities-320.png),
[bandeaux à 1 440 px](identities-1440.png), [états à 320 px](states-320.png),
[identité après actualisation](person-refresh-320.png).

## Décisions de composition

`PageIdentityHero` reste l’en-tête canonique pour les nouvelles compositions.
`PageHero` conserve ses consommateurs et sa présentation compacte historique,
comme le prévoit le design system ; aucun nouveau modèle parallèle n’est ajouté.
`SectionPanel` garde ses champs et actions locaux. `PageAsideLayout` conserve
son rail ; son commentaire décrit désormais correctement la synthèse empilée
avant le contenu. `ContentState` continue de composer `Alert` et `Empty`.

Les primitives de fenêtre, confirmation, volet, menu et Disclosure sont
conservées : leurs comportements contrôlés étaient déjà adaptés. Le volet de
navigation existant gère explicitement le retour du focus et le changement
d’URL. Aucun gestionnaire de focus supplémentaire n’est ajouté au volet.
`ResourceStateBoundary` n’a aucun consommateur actuel : cette revue ne l’impose
pas aux pages et n’ajoute pas de mécanisme de chargement concurrent.

## Portée des preuves

TypeScript, ESLint des fichiers modifiés et 79 tests de contrat ciblés ont
également réussi. Un premier échec de banc concernant la touche Fin provenait
d’une absence d’attente du focus différé ; le banc attend maintenant le focus
avant Entrée. Un autre attendait un titre incomplet ; il utilise le libellé réel.

Ces contrôles ne valident pas la base, l’audit serveur, les permissions réelles,
une session authentifiée, une extension, un lecteur d’écran, Safari/iOS ni le
zoom natif. Le cadre et la police sont simplifiés, le mouvement est réduit.
Le composant de fiche réel est exécuté pour la réponse tardive du parent ;
les autres scénarios d’identité montent la section propriétaire dans un cadre
isolé. Les composants seulement relus restent « examinés dans le code ».
