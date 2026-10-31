# Banc client — Journal d’activité, 30 octobre 2026

[Fiche du journal](../../../pages/systeme/journal-activite.md) · [Index des audits](../../README.md)

Banc de la page reconstruite le 30 octobre 2026 : vrais composants et styles du
dépôt (`app/systeme/journal-activite/page.tsx`), session, routeur et coque
simulés (`mocks.tsx`), API `GET /api/audit` simulée par Playwright avec 120
événements fictifs déjà projetés comme par le serveur, filtrés et paginés par
50. Aucune donnée réelle.

```bash
node docs/audits/journal-activite-2026-10-30/banc-client/run.cjs
```

`AUDIT_ONLY=<nom>` limite aux scénarios dont le nom contient ce texte. Les
captures et `observations.json` sont écrits dans le dossier temporaire affiché.

## Scénarios

| Scénario | Largeurs | Vérifie |
| --- | --- | --- |
| `liste` | 1 440, 768, 390, 320 | 50 lignes, total annoncé, titre, lignes de 44 px au moins, aucun débordement |
| `nombreux-changements` | 1 440, 390 | Fiche à 14 changements : « Prénom, Nom et 9 autres » sur la ligne, changements avant les faits, 6 lignes puis « Afficher les 8 autres changements », 14 lignes, focus gardé sur « Afficher moins » (31 octobre 2026) |
| `detail-et-filtre-auteur` | 1 440 | Champs résumés sur la ligne (aucun pour un paramètre) ; ligne dépliée : tableau des changements, « Adresse masquée », lien de fiche ; « Filtrer sur cet auteur » dans l’URL, puce retirée |
| `filtres-rapides-et-periode` | 1 440 | Sécurité, Échecs, période 30 jours dans l’URL et la requête ; réinitialisation et focus sur la recherche |
| `recherche-trois-caracteres` | 1 440 | Deux lettres : consigne, aucune requête ; trois : recherche appliquée |
| `pagination-instantane` | 1 440 | Page 2 avec l’instantané de la page 1 ; « Actualiser » repart sans instantané |
| `superadmin-ip` | 390 | IP visible pour le superadmin |
| `vide`, `erreur-et-reprise`, `acces-refuse` | 390 | État vide, erreur puis reprise, refus sans requête |

## Résultat

14/14 le 31 octobre 2026 après la retouche du bloc déplié (couleurs, résumé
des champs, changements en tête, « Afficher les N autres changements ») ;
captures relues à 1 440 et 390 px. Un doublon trouvé et corrigé : le résumé
répétait le nom d’un paramètre déjà présent dans la colonne voisine.

Premier passage :

12/12 le 30 octobre 2026. Captures relues à 1 440, 768 et 390 px : colonnes
alignées sur grand écran, lignes empilées sur téléphone, mention d’importance
entière. Deux défauts trouvés et corrigés par ce banc : requêtes de conteneur
nommées renommées par le module CSS (lignes restées empilées à 1 440 px), et
« Important » tronqué à 768 px.
