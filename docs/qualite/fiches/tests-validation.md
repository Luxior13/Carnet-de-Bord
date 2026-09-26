# Q27 — Tests et validation

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Toujours : quelle vérification proportionnée démontre le résultat et ses limites ?

## Questions

- Quelle erreur plausible le contrôle doit-il détecter ?
- Quelle couche porte la règle : fonction, service, route, base, navigateur ou intégration externe ?
- Les tests existants couvrent-ils déjà le comportement, et restent-ils pertinents après le changement ?
- Faut-il tester autorisé/refusé, limites, conflit, répétition, suppression ou réponse tardive ?
- Les contraintes réellement dépendantes de la base sont-elles essayées sur une base isolée ?
- Les données couvrent-elles cas courants et réalistes : noms longs, absence, historiques, grands totaux et droits limités ?
- Le test vérifie-t-il le résultat métier plutôt qu’une classe ou une copie de l’implémentation ?
- Un changement partagé justifie-t-il un contrôle sur les autres consommateurs ?
- Le navigateur vérifie-t-il clavier, focus, petit/intermédiaire/grand écran et états d’erreur ?
- Les mocks excluent-ils précisément ce que l’on prétend avoir validé ?
- Un test est-il reproductible, indépendant et sans attente arbitraire fragile ?
- Les tests, captures et journaux utilisent-ils des données fictives sans secrets ni comptes réels ?

## Choisir une vérification proportionnée

Une retouche de texte peut demander seulement lecture, format, type/lint si utiles.
Ne pas créer de test qui fige une valeur décorative sans protéger un comportement.
Pour une règle ou un risque réel, privilégier un test qui échouerait si cette règle
était cassée. Pour un bug important, conserver une régression pertinente.

Les commandes existent dans les package.json du dépôt. Sélectionner celles du
périmètre ; le contrôle complet de livraison reste distinct d’un contrôle local.
Éviter de répéter une suite réussie sans nouvelle modification ou incertitude.

## Trace attendue

Commande/scénario, environnement, résultat, périmètre et ce qui n’a pas été vérifié.
Indiquer explicitement : code examiné, données simulées, base réelle isolée ou
parcours réel. Une ancienne réussite n’est pas un test du changement courant.

## Non-applicabilité et réexamen

La question de validation se pose toujours ; une suite supplémentaire peut être
inutile. Une preuve brute n’a pas à rester dans le dépôt après la revue.

## Références

[Scripts racine](../../../package.json) · [Scripts web](../../../apps/web/package.json) ·
[Configuration E2E](../../../apps/web/playwright.config.ts).
