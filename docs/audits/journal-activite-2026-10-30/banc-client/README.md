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
| `detail-et-filtre-auteur` | 1 440 | Ligne dépliée : tableau des changements, « Adresse masquée », lien de fiche ; « Filtrer sur cet auteur » dans l’URL, puce retirée |
| `filtres-rapides-et-periode` | 1 440 | Sécurité, Échecs, période 30 jours dans l’URL et la requête ; réinitialisation et focus sur la recherche |
| `recherche-trois-caracteres` | 1 440 | Deux lettres : consigne, aucune requête ; trois : recherche appliquée |
| `pagination-instantane` | 1 440 | Page 2 avec l’instantané de la page 1 ; « Actualiser » repart sans instantané |
| `superadmin-ip` | 390 | IP visible pour le superadmin |
| `vide`, `erreur-et-reprise`, `acces-refuse` | 390 | État vide, erreur puis reprise, refus sans requête |

## Résultat

12/12 le 30 octobre 2026. Captures relues à 1 440, 768 et 390 px : colonnes
alignées sur grand écran, lignes empilées sur téléphone, mention d’importance
entière. Deux défauts trouvés et corrigés par ce banc : requêtes de conteneur
nommées renommées par le module CSS (lignes restées empilées à 1 440 px), et
« Important » tronqué à 768 px.
