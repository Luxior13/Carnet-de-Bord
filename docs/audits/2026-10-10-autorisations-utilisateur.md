# Audit ciblé — autorisations de la fiche utilisateur

## Périmètre et conclusion

Demande du 10 octobre 2026 : analyser et améliorer toutes les autorisations de
`/systeme/utilisateurs/[id]`. Périmètre : Autorisations administratives, Compte
personnel, choix de rôle, catalogue affiché, dépendances, lecture seule,
annulation, réinitialisation, aperçu et enregistrement. Départ : branche `main`,
commit `7afc856e39b8d240f952edc976a241678ca00091`, arbre propre.

Présentation refondue et défauts d'affichage corrigés. Les clés, presets, contrôles
serveur, règles de délégation et mutations persistantes ne sont pas modifiés.
Cette passe ne certifie pas la sécurité ou l'accessibilité de toute l'application.

Sources : [éditeur](../../apps/web/src/components/users/PermissionsEditor.tsx),
[calcul de présentation](../../apps/web/src/components/users/permission-editor-view.ts),
[lignes](../../apps/web/src/components/users/PermissionRow.tsx),
[onglet administratif](../../apps/web/src/components/users/user-detail/UserAccessTab.tsx),
[autonomie](../../apps/web/src/components/users/user-detail/UserAccountTab.tsx).

## Constats et corrections

| ID | Constat et impact | Correction et contrôle |
| --- | --- | --- |
| USR-A01 — P2 | Le calcul des prérequis partait de droits déjà résolus par `hasPermission`. Un droit configuré à vrai mais bloqué devenait « Refusé », sans explication ; le compteur des droits à compléter restait nul. | Choix configuré et accès effectif séparés. Prérequis manquants explicites, choix Autoriser conservé, compteurs corrigés. Tests du calcul et scénario navigateur ADMIN avec `users:view=false`. |
| USR-A02 — P2 | Accumulation d'encadrés, bandes colorées, badges et descriptions tronquées ; largeur fixe de 40 rem dans une grille liée au viewport ; libellés Autoriser/Refuser masqués sur mobile. | Composition neutre, lignes alternées par rubrique, descriptions entières, adaptation à la largeur du composant, libellés toujours visibles, sélecteurs `compact` partagés. Vérifié à quatre largeurs. |
| USR-A03 — P2 | Pôles sans page et modules prévus proposés dans l'éditeur ; Actualité interne et Journal global comptés comme pages accessibles malgré leur disponibilité `planned`. Le droit de provenance était présenté sous un accès de page dont il ne dépend pas. | Projection de présentation basée sur le registre des fonctionnalités : trois pages livrées, pôles Membres/Système seulement, catégorie transverse « Historique et provenance ». Les deux droits d'audit restent indépendants et éditables. Anciennes sélections de page normalisées vers le catalogue affichable. |
| USR-A04 — P2 | Synthèse limitée à des nombres ; impossible de relire les clés touchées par une cascade ; blocage du lot insuffisamment expliqué près de l'enregistrement. | Détail dépliable des changements, ancien/nouveau rôle, intitulés des droits, conséquence sur les sessions et raison de refus du lot. Annulation et état d'attente explicites ; réglages verrouillés durant l'enregistrement. |
| USR-A05 — P2 | Lecture seule encombrée de contrôles désactivés ; choix interdits exposés deux fois par le bouton et son conteneur explicatif. Autonomie : dépliage avec focus local distinct. | Lecture seule descriptive ; une seule commande accessible par choix interdit, avec état et explication au clavier. Autonomie réutilise `Disclosure`, ses handlers refusent une action en lecture seule ou pendant l'attente. |

USR-A01 à USR-A05 sont corrigés et vérifiés dans le périmètre du banc décrit
ci-dessous. Les contrôles de source existants sont adaptés au déplacement des
lignes et à la réutilisation du composant de dépliage, sans retirer les assertions
sur les restrictions, l'ordre du contenu ou l'explication des refus.

## Vérifications

Chromium local via Playwright, composants React 19.1.8 réellement montés,
Radix installé et CSS du projet recompilé. Acteur, cible, état et callbacks de
sauvegarde simulés ; aucune API ni base appelée. Police de repli du navigateur.

**36 combinaisons réussies** : neuf situations à 320, 390, 768 et 1 440 px :
compte standard, administrateur, ADMIN avec accès parent refusé, lecteur,
attribution seule, cible sans MFA complète, compte protégé, provenance transverse,
autonomie personnelle. Absence de débordement horizontal et d'erreur JavaScript.

- Autoriser un contact active ses prérequis ; annuler restaure le brouillon.
- Navigation pôle/page au clavier, Échap et restitution du focus ; deux pôles
  proposés ; Paramètres système réservé au rôle ADMIN.
- Retour sur Utilisateurs, choix via Entrée, callback Enregistrer atteint,
  état d'attente et impossibilité de modifier pendant la sauvegarde simulée.
- Choix de refus interdit expliqué au focus, sans modification après Entrée ;
  attribution permise sur ce même compte.
- Promotion ADMIN et droit critique indisponibles sans MFA complète.
- Aucun éditeur ni commande de sauvegarde pour le compte protégé ; lecture
  seule sans sélecteurs d'autorisation fictivement modifiables.
- Provenance autorisée avec `audit:view=false`, sans message de page bloquée.
- Retirer l'édition du profil propre puis réinitialiser conserve `users:view` :
  l'autonomie ne réinitialise pas les accès administratifs.

[Observations](autorisations-2026-10-10/observations.json) ·
[Présentation à 1 440 px](autorisations-2026-10-10/autorisations-1440.png) ·
[Présentation à 390 px](autorisations-2026-10-10/autorisations-390.png).
Ces captures représentent les composants dans un banc isolé, pas une session du site.

Sept tests de régression couvrent choix/accès effectif, chaînes de dépendances,
compteurs, refus explicite, surcharges non configurables, pages futures et
provenance indépendante. Contrôles finaux exécutés :

- `bun run --filter web test` : **86 fichiers / 1 043 tests réussis**,
  2 fichiers / 25 tests ignorés (suites PostgreSQL sans configuration dédiée).
- TypeScript web, lint web et budget d'architecture réussis.
- `bun run docs:check` : 179 fichiers, 993 liens locaux et index contrôlés.
- `git diff --check` réussi.

Les premières exécutions ont signalé des assertions de source liées à l'ancien
composant de dépliage et des assertions non-nulles dans les nouvelles fixtures
de tests. Elles ont été corrigées avant la suite complète réussie. Le banc
navigateur final a été rejoué après les ajustements du catalogue et des libellés.
Navigateurs et serveur local fermés ; banc temporaire supprimé après consolidation.

## Contrat serveur relu et limites

Le PATCH de fiche conserve la version attendue, le périmètre `access`/`account`,
la normalisation des dépendances, l'autorisation atomique du lot, la preuve
récente exigée par le serveur, l'audit transactionnel et l'invalidation des
sessions pour les accès administratifs. L'attribution reste limitée aux droits
de l'acteur ; délégation, cible ADMIN, compte protégé et modification de son
propre compte conservent leurs restrictions. Les projections masquent les
autorisations hors du périmètre de lecture de l'acteur.

Cette lecture et les tests avec dépendances simulées ne rejouent pas la mutation
authentifiée sur PostgreSQL. Les preuves antérieures de la
[fiche utilisateur](2026-10-10-fiche-utilisateur.md) restent datées. Connexion,
réauthentification réelle, concurrence en base, lecteur d'écran, appareil physique
et build de production ne sont pas validés par le banc de composants.

Le catalogue technique conserve des clés historiques d'Actualité interne bien
que sa page soit prévue. Elles sont exclues de cette présentation ; leur retrait
des presets et des API n'est pas effectué ici. Responsable à attribuer, réexamen
lors de la reprise ou de la suppression du module. Ne pas interpréter un droit
technique conservé comme preuve qu'une page existe.

## Sélection de revue

Q01–Q07, Q09–Q11, Q14–Q15, Q19, Q27 et Q30 examinés : besoin, contenu, liste de
droits, contrôles, restrictions, confidentialité des fixtures, intégration avec
les mutations existantes et documentation. Q08 non applicable : aucun nouveau
destinataire ni événement à notifier. Q12–Q13, Q16–Q18 et Q20–Q29, sauf Q27,
hors impact : aucun schéma, purge, stockage, intégration, exploitation, engagement
ou modèle métier modifié. Catalogue de taille bornée ; aucun cache ou mécanisme
de recherche ajouté sans besoin.
