# Préférences et décisions du propriétaire

[Système de design](README.md) · [Harmonisation](harmonisation.md)

Journal daté des retours visuels et d’ergonomie du propriétaire : « je préfère
ça », « j’aime », « je n’aime pas », « ok go », validations de rendu. **Chaque
nouveau retour ajoute une entrée ici**, puis met à jour le fichier propriétaire
de la règle (voir la [boucle des préférences](README.md#boucle-des-préférences)).

Une préférence exprimée sur une page s’applique par défaut aux pages du même
gabarit. La colonne « Portée » l’indique ; « à confirmer » signale une portée
ambiguë, sans bloquer le travail.

Journal créé le 19 octobre 2026 à partir des décisions déjà consignées dans les
suivis de pages et l’ancien design system ; chaque entrée renvoie à sa source.

## Règles en vigueur

Synthèse à jour des préférences encore applicables, de la plus récente à la
plus ancienne. Le détail et l’origine sont dans le journal ci-dessous.

| Sujet | Règle retenue | Portée | Fichier propriétaire |
| --- | --- | --- | --- |
| Compteurs d’une liste | Pas de carte de synthèse : les compteurs sont des filtres rapides à bascule sous la recherche, qui remplacent les menus de filtre, rôle compris ; un groupe par dimension, précédé d’un libellé visible (« État », « Rôle ») ; bouton enfoncé en bordure et texte d’accent ; compteurs à facettes toujours affichés, sans décalage de la ligne quand on sélectionne ; le bouton enfoncé tient lieu de filtre actif | Listes de gestion (gabarit A) | [Comportements](comportements.md#listes-recherche-et-pagination), [Gabarit A](gabarits.md#a-liste-de-gestion) |
| Pastilles de statut | Composant commun `StatusBadge` ; une catégorie neutre (« Hors structure ») prend le ton `muted`, jamais une couleur d’alerte | Tout le site | [Fondations](fondations.md#variantes-autorisées) |
| Cellules d’une liste | Pas de total qui répète un détail voisin ; indications de recherche en gris discret ; un seul anneau de focus par ligne | Listes de gestion | [Comportements](comportements.md#focus-et-états), [Liste du Répertoire](../pages/membres/repertoire/liste.md) |
| Réglages répétés dans une fiche | Une carte par réglage (`surface-row-alternate`, `border-content`, rayon 8 px, 8 px d’écart), sans alternance ; rubriques en petites capitales suivies d’un filet ; aide dans un popover, jamais un dépliage ; conséquences critiques et blocages toujours visibles | Fiches à sections | [Gabarit B](gabarits.md#b-fiche-à-sections), [Utilisateur — Autorisations](../pages/systeme/utilisateurs/fiche-autorisations.md) |
| Commandes redondantes | Pas de commande qui refait ce qu’un choix fait déjà (retour au rôle par ligne retiré) ; garder les réinitialisations groupées | Éditeurs de réglages | [Utilisateur — Autorisations](../pages/systeme/utilisateurs/fiche-autorisations.md) |
| Haut d’une section | Pas de bandeau qui répète les droits de l’acteur, pas de titre identique au lien de section, pas de compteur déjà présent dans la synthèse ; les sélecteurs principaux rejoignent la barre de filtres, une seule ligne d’aide | Fiches à sections | [Gabarit B](gabarits.md#b-fiche-à-sections) |
| Icônes dans les filtres de catégories | Chaque option de pôle ou de page porte l’icône de la navigation latérale, décorative | Filtres par pôle ou page | [Composants](composants.md) |
| Administrateur complet | Un Administrateur possède toujours toutes les autorisations délégables ; un Utilisateur seulement celles accordées | Comptes et autorisations | [Permissions](../domaines/permissions.md) |
| Ressenti de référence | La liste `/systeme/utilisateurs` est la référence de couleurs, clarté et densité ; reprendre ce ressenti sans recopier son tableau | Tout le site | [Pages de référence](README.md#pages-de-référence) |
| Lignes de réglage | Rendu moins carré, lignes moins hautes, séparations fines, pas de contours imbriqués | Éditeurs en lignes | [Fondations](fondations.md#espacements-et-arrondis) |
| Champs de formulaire | Rendu adouci de l’onglet Informations du site Noctambule : police système, rayon 8 px, 40/44 px, contour `#435978`, survol `#5b7699`, focus `#698cdd` avec anneau à 13 % ; plus de libellés réduits ni de police monospace sur une saisie ordinaire | Tous les formulaires | [Fondations](fondations.md#espacements-et-arrondis) |
| Synthèse d’un compte | Double authentification à côté du mot de passe (« Activée » vert, « À configurer » jaune, « Masquée ») ; compteur « Autorisations : X / Y » | Fiche utilisateur | [Utilisateurs](../pages/systeme/utilisateurs/README.md) |
| État du compte | Badge « Actif » vert ou « Désactivé » jaune juste à gauche de l’interrupteur, qui suit le brouillon | Fiche utilisateur, Sécurité | [Utilisateur — Sécurité](../pages/systeme/utilisateurs/fiche-securite.md) |
| Sections de lecture | Listes de descriptions sans sous-cartes ni icônes encadrées ; aides près des actions ; une information affichée une seule fois | Fiches à sections | [Comportements](comportements.md#lecture-seule-et-droits) |
| Réglages globaux | Bandeau compact, carte unique par groupe, saisie directe, barre commune seulement en cas de brouillon ou de reprise | Pages de réglages | [Gabarit D](gabarits.md#d-page-de-réglages) |
| Menu des rubriques | Conserver le menu déroulant « Rubriques » sous le logo | Navigation générale | [Navigation générale](../pages/transverse/navigation-generale.md) |
| Barre de sections | `PageSectionNavigation` pour toute barre de sections du site, y compris futures ; ombre discrète seulement en position collée ; flèches seulement en cas de débordement | Tout le site | [Composants](composants.md#onglets-et-rails) |
| Barre d’enregistrement | La barre de la fiche Utilisateur est la référence de toutes les actions d’enregistrement | Tout le site | [Comportements](comportements.md#barre-denregistrement-commune) |
| Méthode de revue des composants | Examiner les composants un par un, réutiliser ceux qui servent, sans multiplier les variantes | Tout le site | [Composants](composants.md) |
| Autocomplétion | Désactivée partout, sans exception, connexion et MFA comprises | Tout le site | [Comportements](comportements.md#autocomplétion) |
| Avatars de compte | Fond selon l’accès : Superadmin rouge clair, Administrateur ambre, Utilisateur bleu clair ; dessin conservé | Avatars de compte | [Liste des utilisateurs](../pages/systeme/utilisateurs/liste.md) |
| Listes de gestion | Recherche des mots dans les deux ordres, retour de fiche avec contexte ; la synthèse compacte du 10 octobre est remplacée par les filtres rapides le 20 octobre 2026 | Listes de gestion | [Comportements](comportements.md#listes-recherche-et-pagination) |
| Page de référence | `/membres/repertoire` est la référence visuelle et UX, complétée par `/systeme/utilisateurs` | Tout le site | [Pages de référence](README.md#pages-de-référence) |
| Taille des listes | Pas de réglage global du nombre de lignes ; 25 par défaut dans le code | Listes | [Gabarits](gabarits.md#hiérarchie-dune-page) |
| Sidebar | Toujours ouverte à 264 px sur ordinateur, sans mode réduit | Navigation générale | [Navigation générale](../pages/transverse/navigation-generale.md) |
| Recherche rapide | Aucun raccourci clavier global | Header | [Navigation générale](../pages/transverse/navigation-generale.md) |

## Journal

| Date | Contexte | Retour du propriétaire | Décision appliquée |
| --- | --- | --- | --- |
| 20 octobre 2026 | Filtres rapides des deux listes, rendu réel | « Dès que je sélectionne, les compteurs s’enlèvent et tout décale » | Compteurs à facettes calculés par le serveur (recherche et autres groupes appliqués) : toujours affichés, toujours justes, plus de décalage |
| 20 octobre 2026 | Ligne de filtres rapides de la liste Utilisateurs, rendu réel | Demande un avis ; deux défauts relevés : « Tous » paraît contredire un rôle enfoncé, l’état enfoncé se voit mal. « Ok go » sur la recommandation | Libellé visible devant chaque groupe à la place du filet, état enfoncé en bordure et texte d’accent, sur les deux listes ; le rôle reste en filtres rapides (PREF-Q2 tranchée) |
| 20 octobre 2026 | Liste du Répertoire, rendu réel sur le serveur de dev après correction de l’alignement du tri | « Moi je suis content » | Rendu validé : filtres rapides, pastilles, cellules allégées et tri au bord droit deviennent le standard des listes de gestion ([détail](../pages/membres/repertoire/liste.md#reprise-en-profondeur--20-octobre-2026)) |
| 20 octobre 2026 | Liste du Répertoire, reprise en profondeur | « Ok go » sur toutes les recommandations (REP-21 à REP-28) | Synthèse remplacée par des filtres rapides avec compteurs ; « Hors structure » neutre ; coordonnées réduites au détail par type ; indication de recherche en gris ; un seul anneau de focus ; pastille commune `StatusBadge` ([détail](../pages/membres/repertoire/liste.md#reprise-en-profondeur--20-octobre-2026)) |
| 18 octobre 2026 | Section Autorisations de la fiche utilisateur | Juge que la hiérarchie ne fait pas assez ressortir chaque ligne ; veut que l’icône d’aide ouvre un popover plutôt qu’un dépliage | Une carte par autorisation, rubriques en petites capitales avec filet, popover partagé ([détail](../pages/systeme/utilisateurs/fiche-autorisations.md#autorisations--une-carte-par-ligne-détails-en-popover--18-octobre-2026)) |
| 18 octobre 2026 | Retour au rôle par ligne | « Ok go » sur le retrait | Bouton ↺ retiré ; choisir la valeur du rôle supprime déjà l’exception |
| 18 octobre 2026 | Autorisations d’un Administrateur | « Oui pour moi » | Un Administrateur possède toujours les 25 autorisations délégables ; aucune exception ne les restreint |
| 18 octobre 2026 | Filtres Pôle et Page ou fonction | Demande d’icônes | Icône de la navigation latérale sur chaque option et sur la valeur affichée |
| 18 octobre 2026 | Haut de la section Autorisations | « Ok go » sur l’allègement | Bandeau de droits, titre répété et compteurs globaux retirés ; rôle dans la barre de filtres, ligne d’aide unique |
| 17 octobre 2026 | Section Autorisations | Conserve l’organisation, demande un rendu moins carré et des lignes moins hautes, puis « ok go » | Arrondis 8 px, séparations fines, contours imbriqués retirés ([détail](../pages/systeme/utilisateurs/fiche-autorisations.md#autorisations--présentation-allégée--17-octobre-2026)) |
| 17 octobre 2026 | Liste `/systeme/utilisateurs` | Lui convient visuellement : couleurs aux bons endroits, informations claires, densité satisfaisante | Devient la référence de ressenti, sans recopier son tableau |
| 17 octobre 2026 | Champs de formulaire | Demande de retrouver le rendu validé sur les fiches Tournois du site Noctambule, puis relève un contour encore trop clair | Police système, 8 px, 40/44 px, contour `#435978`, survol `#5b7699`, focus `#698cdd` ([détail](../pages/transverse/composants-partages.md#champs--harmonisation-du-17-octobre-2026)) |
| 17 octobre 2026 | Fiche utilisateur après harmonisation | Signale que les champs semblent inchangés | Libellés réduits, police monospace et rôle compact retirés de la fiche ([détail](../pages/systeme/utilisateurs/README.md#fiche--harmonisation-des-champs--17-octobre-2026)) |
| 15 octobre 2026 | Synthèse de la fiche utilisateur | Demande le compteur d’autorisations | « Autorisations : X / Y », calcul partagé avec l’éditeur |
| 14 octobre 2026 | Section Sécurité de la fiche utilisateur | Apprécie la présentation, valide les allègements proposés, demande le badge d’état à gauche de l’interrupteur | Listes de descriptions, aides près des actions, badge Actif/Désactivé ([détail](../pages/systeme/utilisateurs/fiche-securite.md#allègement-visuel-de-longlet-sécurité--14-octobre-2026)) |
| 14 octobre 2026 | Synthèse de la fiche utilisateur | Demande la double authentification à côté du mot de passe | Activée (vert), À configurer (jaune), Masquée |
| 14 octobre 2026 | Paramètres système | « Go » sur la proposition issue de l’analyse | Bandeau compact, carte « Conservation du journal », saisie directe, barre conditionnelle ([détail](../pages/systeme/parametres.md#refonte-de-linterface--14-octobre-2026)) |
| 12 octobre 2026 | Navigation générale | Souhaite conserver le menu déroulant « Rubriques » | Menu confirmé ; l’ancienne grille devient historique |
| 11 octobre 2026 | Barre de sections collante | Approuve l’ombre discrète en position collée, puis précise que le composant s’applique à tout le site | `--shadow-navigation-stuck` ; `PageSectionNavigation` obligatoire pour toute barre de sections |
| 11 octobre 2026 | Composants partagés | Examiner les composants un par un et réutiliser ceux qui servent | Barre de la fiche Utilisateur choisie comme référence d’enregistrement |
| 11 octobre 2026 | Autocomplétion | Une proposition reste visible dans la fenêtre de contact | Règle réaffirmée sans exception ; champs invisibles d’association retirés |
| 10 octobre 2026 | Autocomplétion | Règle : aucune autocomplétion, y compris connexion et MFA | Attributs imposés par les primitives |
| 10 octobre 2026 | Avatars de compte | Demande un fond selon l’accès | Rouge clair, ambre, bleu clair ; dessin et graine conservés |
| 10 octobre 2026 | Répertoire | « Ok go » sur quatre améliorations | Synthèse compacte, recherche dans les deux ordres, compteurs ouvrant leur sous-ensemble, retour de fiche avec contexte |
| 10 octobre 2026 | Sélecteurs de la fiche personne | Signale l’écart avec les filtres de la liste | Variante compacte appliquée ; **remplacée le 17 octobre** par la variante par défaut des champs de fiche |
| 9 et 10 octobre 2026 | Répertoire | Désigne `/membres/repertoire` comme page de référence visuelle et UX, complétée par `/systeme/utilisateurs` | Pages de référence du design |
| 27 septembre 2026 | Paramètres | Retrait du réglage global de pagination | Défaut partagé de 25 dans le code |
| 27 septembre 2026 | Sidebar | Retrait de la réduction et du bouton sur ordinateur | Sidebar toujours ouverte à 264 px |
| 27 septembre 2026 | Recherche rapide | Décision finale : aucun raccourci | Écouteur Ctrl/⌘ + K supprimé |
| 27 septembre 2026 | Identité | Remplacer Team Control par Noctambule | Nom de la structure dans la sidebar, les métadonnées et la connexion |

## Questions ouvertes

Points où la portée d’une préférence ou une proposition reste à trancher. En
attendant, appliquer la colonne « Par défaut ».

| ID | Question | Par défaut | Effet |
| --- | --- | --- | --- |
| PREF-Q1 | Sous 118 rem, la carte de synthèse placée au-dessus du contenu pèse davantage sur la hauteur que l’en-tête de section allégé le 18 octobre 2026 : faut-il la réduire, la replier ou la déplacer ? | Tranchée pour les listes le 20 octobre 2026 : plus de synthèse, compteurs en filtres rapides. Pour les fiches à sections, synthèse compacte actuelle conservée | Proposition à formuler et à valider avant tout changement ([source](../pages/systeme/utilisateurs/fiche-autorisations.md#autorisations--une-carte-par-ligne-détails-en-popover--18-octobre-2026)) |

## Questions tranchées

Une question tranchée garde son identifiant, la décision et sa date.

| ID | Question | Décision | Date |
| --- | --- | --- | --- |
| PREF-Q2 | Liste Utilisateurs : le rôle en filtres rapides ou en menu ? | Filtres rapides, avec un libellé « Rôle » devant le groupe pour lever l’ambiguïté de « Tous » ; le menu aurait perdu les compteurs par rôle | 20 octobre 2026 (« ok go ») |
