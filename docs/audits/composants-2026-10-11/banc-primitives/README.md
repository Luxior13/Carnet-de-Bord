# Banc des primitives de formulaire — 11 octobre 2026

Depuis la racine du dépôt :

```powershell
node docs/audits/composants-2026-10-11/banc-primitives/run.cjs
```

Le banc compile les vrais composants et le CSS du projet, ouvre un serveur local
éphémère puis exécute Chromium avec un contexte neuf pour chaque scénario.
Les résultats et captures sont écrits dans un dossier temporaire dont le chemin
est affiché. `AUDIT_ONLY` permet de filtrer les noms de scénarios.

## Périmètre et résultats

Les [observations conservées](observations.json) comptent **14 scénarios réussis** :

- À 320, 390, 768 et 1 440 px : comparaison du focus calculé de `Input`,
  `Textarea`, `Checkbox` et `Switch`, erreur de saisie, label et attributs
  d'autocomplétion ; actions ordinaires et soumission explicite, attente,
  désactivation, lien natif et état mixte ; sélecteur au clavier, option
  désactivée, Échap et retour du focus, recherche de commande et résultat vide.
- À 390 px : contour système en couleurs forcées et animation réduite ;
  activation tactile par les labels et sélection d'une option.

Le chargement d'un bouton remplace visuellement son icône directe par le spinner
sans changer sa largeur. Le test garde volontairement le même libellé pour
isoler cet effet ; un libellé d'attente plus long peut demander une largeur
minimale adaptée dans la composition.

Captures représentatives : [390 px](primitives-390.png) et
[1 440 px](primitives-1440.png). Elles montrent des données fictives et la zone
de texte en erreur ; elles ne remplacent pas les assertions interactives.

## Limites

Aucune API, session authentifiée, extension de gestion de mots de passe ou
lecteur d'écran réel n'est utilisé. Les vérifications d'attributs ne prouvent
pas qu'une extension respecte la consigne d'autocomplétion. Le bouton désactivé
empêche sa propre réactivation ; la protection contre des mutations concurrentes
reste la responsabilité du formulaire et du serveur.

Le banc vérifie le socle isolé, pas les parcours métier complets des pages.
L'émulation tactile Chromium ne représente pas un appareil iOS physique.
