# Audit transverse des composants — 11 octobre 2026

## Demande et point de départ

Préparer les pages futures avec des composants communs utiles, examinés dans
leurs usages réels. Décision explicite : prendre la barre d'enregistrement de
`/systeme/utilisateurs/[id]` comme référence, avec améliorations possibles.

Branche `main`, départ `82b3ef4`, arbre de travail propre avant cette passe.
Audit fonctionnel transverse du code local, puis corrections et vérifications.
Environnement Windows, React 19.1.8, Next 15.5.23, Tailwind 4.3.2, Chromium
149.0.7827.55. Les données des bancs sont fictives ; leurs API, routeur et
contextes sont simulés. Les styles et les composants testés viennent du dépôt.

Références courantes : [catalogue](../design/composants.md),
[design system](../design/README.md) et
[suivi transverse](../pages/transverse/composants-partages.md).

## Périmètre et méthode

Primitives UI, compositions de page, recherche/pagination, retours, modales et
barres d'actions. Consommateurs modifiés : listes, création et fiches des membres
et utilisateurs, profil Mon compte, réglage système. Inspection des composants
conservés : navigation, cartes, avatars, badges, états, squelettes, disclosure,
menus et surfaces flottantes.

Chaque famille est classée dans le catalogue : responsabilité, usage adapté,
contrat et limite. Réutiliser ne signifie pas fusionner les règles de permissions,
les champs d'identité ou la gestion MFA dans un formulaire universel.

| Sujets de la revue générale | Sélection et raison |
| --- | --- |
| Q01–Q07 | Examinés : besoin, navigation, présentation, clavier/mobile, listes, saisie, retours |
| Q09–Q11 | Examinés sur les effets client : états interdits, cible/compte, données des preuves ; aucune nouvelle autorisation ou collecte |
| Q14 | Examiné : doubles soumissions, conflit, brouillon, réponses tardives |
| Q16 | Examiné pour la zone dangereuse : libellé d'actualisation et reconfirmation ; suppression serveur inchangée |
| Q17–Q19 | Examinés : dépendances, mutualisation, rendu et budgets ; pas de cache ajouté |
| Q25 | Examiné pour l'identité : conservation des champs locaux et adoption des champs serveur inchangés |
| Q27, Q30 | Examinés : contrats, bancs reproductibles, documentation et index ; aucune dépendance ajoutée |
| Q08, Q12–Q13, Q15, Q20–Q24, Q26, Q28–Q29 | Hors impact : notifications, stockage/migration, audit métier, fichiers, imports, dates métier, intégrations, gouvernance, finances et exploitation restent inchangés |

## Constats et corrections

Les preuves ci-dessous valident le comportement client dans les conditions des
bancs, sans transformer une API simulée en preuve de transaction réelle.

| ID | Priorité / type | Scénario, attendu et correction | Preuve / état |
| --- | --- | --- | --- |
| UI-C01 | P2, défaut | Focus des primitives : la largeur du ring ambiguë produisait des contours différents. Typage CSS `length:` explicite ; teinte commune. | Primitives au clavier et couleurs forcées ; clos pour primitives exercées. Badge/Tabs : code et compilation seulement |
| UI-C02 | P2, défaut | Case mixte : attendu distinct du cochage. Tiret rendu selon l'état Radix ; vrai/coché/décoché, contrôlé et défaut vérifiés. | Banc primitives ; clos |
| UI-C03 | P2, dette et défaut | Pieds d'édition dupliqués et Entrée absente de profils : actions regroupées dans SectionActionBar, contrat submit/callback exclusif, attente et blocage explicites. | Tests de rendu et banc formulaires ; clos |
| UI-C04 | P1, défaut | Identité personne en conflit : actualiser pouvait perdre la saisie. Base serveur séparée ; seuls les champs locaux modifiés sont conservés, autres champs actualisés ; échec de relecture conserve le brouillon. | Banc composition, conflits et erreurs aux deux largeurs ; clos |
| UI-C05 | P2, défaut | Pagination du répertoire : numéro et focus pouvaient anticiper une réponse échouée. Numéro lié aux dernières lignes reçues ; focus déplacé après réponse réussie seulement. Recherche effaçable partagée. | Banc listes, attente/erreur/reprise ; clos |
| UI-C06 | P2, défaut | Noms et URL sans espaces débordaient des surfaces. Contraintes de largeur et coupure du texte dans hero, section, alert, empty, popover. | Banc composition, quatre largeurs ; clos |
| UI-C07 | P2, défaut | Après conflit de suppression, relecture annoncée comme suppression. Attente Actualisation distincte et nouvelle confirmation de suppression requise. | Banc composition ; clos |
| UI-C08 | P2, défaut | Annuler fait disparaître la barre : focus perdu sur le document. Retour explicite au champ ou au titre de la section. | Banc formulaires, quatre consommateurs à quatre largeurs ; clos |
| UI-C09 | P2, défaut | Barre collante sur mobile : un résumé long recouvrait le champ focalisé. Barre dans le flux sous 768 px ou jusqu'à 600 px de hauteur. | Banc formulaires, conflit long et paysage 900 × 480 px compris ; clos |

UI-C04 inclut le verrou synchrone sauvegarde/actualisation, le formulaire natif,
les erreurs persistantes, l'annulation vers la dernière version connue et les
réponses tardives. Le parent ignore les lectures périmées selon requête, fiche,
compte, droit de lecture et démontage.

## Preuves reproductibles

| Banc | Résultat | Couverture |
| --- | --- | --- |
| [Primitives](composants-2026-10-11/banc-primitives/README.md) | 14 scénarios réussis | Boutons, champs, case mixte, switch ; 320/390/768/1440 px, tactile, couleurs forcées, mouvement réduit |
| [Listes](composants-2026-10-11/banc-listes/README.md) | 18 scénarios réussis | Vraies barres d'outils, pagination partagée et répertoire, attente/erreur/reprise, focus, tactile et couleurs forcées |
| [Composition](composants-2026-10-11/banc-composition/README.md) | 20 scénarios réussis | Textes longs à quatre largeurs, dialogues/menus/disclosure au clavier, suppression en conflit, identité et réponses tardives |
| [Formulaires](composants-2026-10-11/banc-formulaires/README.md) | 32 scénarios réussis | Consommateurs des barres : profils, autorisations, créations, réglage inline, annulation, conflits et paysage |

Total : **84 scénarios Chromium réussis**. Captures représentatives relues,
dont autorisations à 390 px, Mon compte après conflit et identité à 320 px.

Les README indiquent commandes, hypothèses et limites ; les observations et
captures conservent les résultats de leur dernière exécution. Les scénarios ne
rejouent pas toutes les combinaisons possibles de droits et d'appareils.

## Contrôles du dépôt

Contrôles exécutés sur les modifications de cette passe le 11 octobre 2026 :

| Commande | Résultat et portée |
| --- | --- |
| `bun run --filter web test` | 1 084 tests réussis, 25 ignorés ; 90 fichiers réussis, 2 ignorés. Les tests ignorés ne sont pas validés |
| `bun run --filter web typecheck` | Réussi après les corrections de focus |
| `bun run --filter web lint` | Réussi sur l'ensemble du code web |
| `bun run --filter web build` | Build de production réussi, avec lint/types et 19 pages générées ; paramètres de connexion et clés factices de build, aucune base réelle exercée |
| `bun run --filter web check:architecture` | Budget de taille respecté |
| `bun run --filter web check:performance` | Budgets des bundles du build respectés ; ce n'est pas une mesure de charge utilisateur |
| `bun run docs:check` | 195 fichiers, 1 222 liens locaux et index contrôlés avant clôture du rapport |
| `git -c core.safecrlf=false diff --check` | Réussi |

Les contrôles ciblés pendant l'implémentation restent détaillés dans les bancs.
Ils sont inclus dans la suite globale lorsqu'ils en font partie, sans additionner
deux fois ces tests dans le bilan.

## Conclusion et limites

**Conforme sur le périmètre client vérifié.** Composants mutualisés, défauts
reproduits corrigés et scénarios concernés rejoués. Aucune modification de
schéma, dépendance, permission serveur ni donnée réelle.

Les bancs n'exercent pas une session authentifiée complète, la base, les
extensions de mots de passe, le préchargement Next, Safari/iOS ou un lecteur
d'écran. Les points UI-C10 et UI-C11 sont suivis dans le
[suivi courant](../pages/transverse/composants-partages.md), avec leur déclencheur
de reprise et responsable à attribuer. La conformité visuelle du périmètre
exercé ne vaut pas certification globale du site.
