# Suivi de page — Journal d’activité

> Page retirée le 9 octobre 2026 et replanifiée sur `/systeme/feuille-de-route`.
> Ce suivi est conservé comme historique ; l’audit serveur et les historiques
> embarqués (fiche utilisateur, provenance des champs) restent actifs.

## Identité et état

- Route : `/systeme/journal-activite`, module `features/audit`.
- Public : personnes autorisées à consulter le journal global détaillé.
- Revue puis correction autorisée le 27 septembre 2026 : interface, filtres et
  présentation du journal. API, permissions, schéma et conservation inchangés.
- État initial examiné : commit `bbf8c58` ; composant client de 1 864 lignes
  et route de 1 041 lignes au moment de la revue.
- État courant : corrections fonctionnelles et visuelles vérifiées avec API simulée.
  Les contrôles sur session/base réelles et les volumes de production restent ouverts.
- Références : [revue générale](../REVUE_GENERALE.md),
  [design system](../../references/DESIGN_SYSTEM.md), [permissions](../../references/PERMISSIONS.md),
  [exploitation](../../references/OPERATIONS.md),
  [conservation et portée du journal](systeme-parametres.md#portée-du-journal--constat-et-séparation-à-préparer).
- La [fiche historique](../../../features/pages/systeme/journal-activite.md)
  contient des fonctions et routes prévues ; elle ne décrit pas l’état livré.

## Fonction et décisions de cadrage

Retrouver un fait, comprendre son auteur, l’objet concerné, sa date et son résultat,
puis examiner les changements ou extraire les événements autorisés. C’est une page
d’investigation en lecture, alimentée par les modules propriétaires des actions.
Une liste chronologique avec détails dépliables convient à cet usage ; elle doit
rester dense, explicite et stable pendant la consultation.

Conserver les choix déjà donnés pour le site : sidebar fixe à gauche, centrage
du contenu dans les limites disponibles, titre sobre et description courte,
surfaces bleu ardoise, contours discrets, couleurs utiles aux états et badges sobres.
Le fil d’Ariane rend ici le bouton « Accueil du pôle » redondant. Pas de rail
statistique, notification ou graphique supplémentaire sans besoin identifié.

Le choix de chaque composant est réexaminé ci-dessous : un journal ne doit pas
reproduire automatiquement la liste Utilisateurs ou le formulaire Paramètres.

## Sélection des sujets

Profondeur fonctionnelle pour les parcours ; lecture sensible pour droits,
détails personnels et exports. L’analyse n’autorise aucune nouvelle purge.

| ID | Classement | Motif |
| --- | --- | --- |
| Q01 | À examiner | Compréhension d’un événement et investigation administrative |
| Q02 | À examiner | Hero, libellés, navigation, URL et filtres contextuels |
| Q03 | À examiner | Choix des composants, densité, fonds, couleurs et états |
| Q04 | À examiner | Clavier, focus, cibles et largeurs intermédiaires |
| Q05 | À examiner | Recherche, filtres, curseur et accumulation des résultats |
| Q06 | À examiner | Dates personnalisées et application des critères |
| Q07 | À examiner | Chargement, vide, erreur persistante, copie et export |
| Q08 | Non applicable | Aucun destinataire à notifier après une simple consultation |
| Q09 | À examiner | Droit global, export distinct et compte protégé |
| Q10 | À examiner | Validation, curseur, secrets et contenu du fichier exporté |
| Q11 | À examiner | Anciennes valeurs, coordonnées, IP et conservation existante |
| Q12 | À examiner | AuditLog, AuditFieldChange, snapshots, sélection et index |
| Q13 | Hors impact | Analyse sans changement de schéma ni format persisté |
| Q14 | À examiner | Requêtes successives, instantané et contrat des filtres |
| Q15 | À examiner | Fidélité des événements, valeurs avant/après et actions anciennes |
| Q16 | Hors impact | Aucune suppression exécutée ou proposée ; conservation suivie dans Paramètres |
| Q17 | À examiner | Lots, rendu cumulé, détails chargés et export volumineux |
| Q18 | À examiner | Complexité constatée ; aucun cache nouveau justifié |
| Q19 | À examiner | Page et route volumineuses, catalogue de présentation incomplet |
| Q20 | À examiner | CSV/JSON téléchargés, sans stockage documentaire ajouté |
| Q21 | À examiner | Périmètre, limite, formats et protection des exports |
| Q22 | À examiner | Dates locales, fuseau affiché, intervalle et instantané |
| Q23 | Hors impact | Maintenance existante inchangée ; aucun traitement différé ajouté |
| Q24 | Non applicable | Pas de décision juridique ou de transfert d’entité dans cette page |
| Q25 | Hors impact | Fiches personnes lues comme objets d’audit, sans modifier leur parcours métier |
| Q26 | Non applicable | Aucun flux financier ou contrat géré par cette page |
| Q27 | À examiner | Tests existants, navigateur et limites de la simulation |
| Q28 | Hors impact | Déploiement et planificateur non modifiés ni validés par cette revue |
| Q29 | Hors impact | Aucune donnée persistante changée ; restauration non rejouée |
| Q30 | À examiner | Suivi durable et cohérence avec les références actuelles |

## Constats et traitement

P1 : parcours incorrect ou contenu difficilement exploitable. P2 : compréhension,
cohérence ou maintenabilité à améliorer. Les niveaux ne signifient pas une faille
de sécurité démontrée.

| ID | Priorité / état actuel | Constat initial et preuve | Traitement réalisé ou restant |
| --- | --- | --- | --- |
| JA-01 | P1 — corrigé et vérifié | À 768 px avec sidebar de 264 px, le résumé du premier événement ne dispose que de 2 px dans la grille ; la carte passe de 72 à 272 px et ses textes se chevauchent. `JournalCard` utilise `md:grid-cols-[minmax(0,1fr)_14rem_10rem_2rem]`, déclenché par la fenêtre plutôt que la largeur utile. | Grilles déclenchées par la largeur du conteneur. À 768 px : résumé de 344 px et ligne de 116 px ; à 1 920 px : ligne de 68 px. Aucun chevauchement reproduit. |
| JA-02 | P1 — corrigé et vérifié | À la même largeur, les filtres avancés ont 408 px disponibles pour 511 px de contenu. La grille mélange des seuils de conteneur avec `md:col-span-2`, `xl:col-span-4` et une rangée de dates `sm:flex-row`. Des contrôles sortent du panneau. | Grilles des filtres et des dates basées sur le conteneur ; boutons Filtres/Actualiser côte à côte sur petit écran. Contrôles et détails sans débordement de 320 à 1 920 px. |
| JA-03 | P1 — corrigé et vérifié | Activité propose « Connexion réussie ». L’interface envoie `logType=activity&action=LOGIN_SUCCESS`, explicitement refusé par l’API. Le test serveur existant rejoué confirme le refus ; le navigateur confirme la sélection et la requête produite. | Catalogues Activité/Connexions séparés, parité de classification vérifiée avec le serveur pour toutes les actions persistées. Liens entrants et critères normalisés avant écriture et requête. |
| JA-04 | P1 — corrigé et vérifié | Depuis un lien `entityType=PERSON&entityId=…`, cliquer Connexions conserve l’entité et éventuellement le champ. L’API interdit ces critères avec ce journal. Le navigateur produit la combinaison invalide et affiche une erreur avec la réponse simulée. | Bascule vers Connexions : retrait de l’entité, du champ, de l’enregistrement, de la catégorie, du pôle et de la page ; auteur, compte concerné, recherche et période conservés. Parcours navigateur vérifié. |
| JA-05 | P1 — corrigé et vérifié | `PERSON_UPDATE` apparaît comme « a réalisé une action » ; `nickname` reste un nom technique dans les changements. Les actions PERSON_CREATE/UPDATE/DELETE sont absentes du sélecteur ; PERSON et PARTNER sont absents des catégories malgré leur présence dans le modèle. | Catalogue complet des actions et catégories persistées, y compris les partenaires historiques. Libellés et valeurs des champs de personne dans le module propriétaire ; archive historique des comptes préservée. |
| JA-06 | P2 — corrigé et vérifié | Le label « Acteur, cible ou événement » promet une recherche d’événement ; `buildSearchFilter` recherche uniquement les noms et identifiants de connexion figés des acteurs/cibles. La description, l’action et le nom de la fiche personne ne sont pas recherchés. | Label « Auteur ou compte concerné » et aide « nom ou identifiant de compte », avec minimum de trois lettres/chiffres. Recherche serveur non élargie. |
| JA-07 | P2 — corrigé et vérifié | Le bouton Actualiser perd le focus après activation au clavier à cause de sa désactivation native pendant la lecture. | Actualiser conserve le focus avec aria-disabled et une garde pendant la lecture. Charger plus et retrait de filtre ont également un focus de reprise contrôlé. |
| JA-08 | P2 — corrigé et vérifié | Une période de trois ans est soumise alors que l’API limite les plages personnalisées à 366 jours. Le détail d’erreur du serveur n’est pas affiché ; seule l’erreur générale apparaît. Les dates manquantes/inversées utilisent un toast. | Choix personnalisé préparé sans requête implicite ; dates appliquées explicitement, bornes/fuseau visibles, erreur locale reliée aux deux champs et focus sur le champ à corriger. Plage invalide bloquée avant la requête. |
| JA-09 | P2 — corrigé et vérifié | Hero en grande carte arrondie avec icône et accent, bouton Accueil du pôle et description centrée sur les comptes. Mesuré à 128 px sur grand écran et 257 px à 320 px. | Titre simple et description courte ; suppression de la carte décorative et du retour vers le pôle. |
| JA-10 | P2 — corrigé et vérifié | Chaque événement répète auteur/cible dans la phrase puis dans les filtres. Cartes séparées, fonds translucides sombres et dates longues alourdissent le balayage. | Panneau bleu ardoise commun, séparateurs, lignes de 68 px sur grand écran. Fait/objet/auteur/date sans répétition ; liens de filtrage déplacés dans les détails. |
| JA-11 | P2 — corrigé et vérifié | Retrait d’un filtre mesuré à 14 × 18 px. Les boutons d’export et de copie restent petits ; les liens d’identité ne disent pas explicitement qu’ils filtrent. Le chevron d’ouverture disparaît en mobile, bien que le titre reste actionnable. | Critères supprimables sur toute leur surface, commandes de 40 px sur bureau / 44 px sur petit écran, chevron visible à chaque largeur, copie et accès aux détails techniques agrandis. |
| JA-12 | P2 — corrigé et vérifié | Le badge « Détails sensibles visibles » reste constant : l’API fixe désormais cette visibilité à true pour `audit:view`. Les deux boutons CSV/JSON et « Filtres par défaut » occupent une rangée permanente. | Badge constant et mention des filtres par défaut retirés. Export regroupé dans un menu CSV/JSON ; la rangée des critères apparaît seulement quand elle est utile. |
| JA-13 | P2 — corrigé et vérifié | « Exporter la vue » exporte tous les résultats des filtres, avec un nouvel instantané à la demande, pas les seuls événements affichés. La limite de 50 000 n’est annoncée qu’après troncature. L’export reste disponible pendant une recherche/actualisation. | Portée et plafond annoncés avant export. Format et requête capturés au clic et réutilisés après confirmation d’identité ; scénario vérifié avec modification des critères entre la demande et la confirmation. Nouvelle demande bloquée pendant attente, erreur de lecture ou critères non appliqués. |
| JA-14 | P2 — corrigé et vérifié | La transformation des changements de personne abandonne `sectionKey`, `recordId`, `id` et le type d’opération pour ne garder que champ/avant/après. Deux contacts modifiés peuvent donc devenir ambigus ; les clés React fondées sur les valeurs peuvent aussi coïncider. | Changements de personne conservés avec id, section, recordId et opération ; rendu Avant/Après complet, identifiant d’enregistrement visible, clés stables. Deux coordonnées du même champ distinguées dans le parcours navigateur. |
| JA-15 | P2 — mesure locale ; suivi ouvert | Huit lots de 25 laissent 200 événements montés ; le client conserve tous les lots sans borne. Chaque réponse inclut déjà les détails, même fermés. L’export est diffusé par lots côté serveur mais entièrement assemblé en blob côté navigateur. | 200 événements montés et sept ajouts de 25 exécutés dans Chromium avec API locale simulée (environ 0,7 s pour tout le scénario automatisé). Ce résultat ne mesure ni PostgreSQL, ni la mémoire des gros exports, ni les appareils modestes. Pas de virtualisation/cache/détails différés ajoutés sans mesure représentative. |
| JA-16 | P2 — client corrigé ; route à suivre | Un seul fichier client contient filtres, URL, requêtes, export, lignes et détails ; la route concentre validation, lecture, curseurs, projection et export. Des tolérances de taille existent déjà dans le contrôle d’architecture. | Client séparé en orchestration, filtres/URL, barre d’outils et ligne/détails ; libellés de personne dans leur module. Exception de taille du client retirée. La route serveur inchangée garde sa dette de découpage, à reprendre lors de sa prochaine évolution fonctionnelle. |

### Choix de chaque composant

| Élément | Décision actuelle | Points à reprendre à chaque évolution |
| --- | --- | --- |
| En-tête | Titre « Journal d’activité » et description courte, sans carte décorative | Une seule ligne sur grand écran, retour lisible sur petit écran, un seul h1 |
| Activité / Connexions | Conserver le choix segmenté, états nettement perceptibles | Nom du groupe, clavier, critères remis à zéro et liens directs |
| Recherche | Saisie libre adaptée à une investigation, avec aide distincte du placeholder | Portée réelle, trois lettres/chiffres, saisie de deux caractères, effacement et réponses tardives |
| Période | Sélecteur de périodes usuelles ; deux dates uniquement lorsque nécessaire | Libellés Début/Fin visibles, fuseau, bornes, dates non appliquées et erreur locale |
| Filtres avancés | Action, domaine/page, catégorie ou résultat seulement si utiles | Cohérence entre critères ; catalogue exhaustif sans options interdites ; ne pas ajouter tous les filtres serveur par automatisme |
| Critères actifs | Résumé compact supprimable | Cibles, nom lisible quand aucun résultat, contexte de fiche/record, focus après retrait |
| Actualiser | Action secondaire proche des résultats | Occupé, répétitions bloquées, focus conservé et résultats antérieurs clairement identifiés en cas d’échec |
| Exporter | Une commande secondaire donnant accès aux formats autorisés | Filtres figés, réauthentification, borne, progression/erreur, interruption et taille réelle |
| Événement | Ligne chronologique dense avec ouverture des détails | Auteur/objet sans répétition, libellé du fait, état, date, noms longs et largeur utile |
| Date | Date courte utile à la comparaison, détail exact disponible | Événements très proches, secondes/fuseau dans le détail, date relative vieillissante |
| Couleurs et badges | Surface neutre ; échec, avertissement et criticité distingués par texte et couleur | Contraste réel au repos/survol/focus, pas de grands fonds colorés par type d’action |
| Avant / Après | Valeurs complètes, avec contexte et type du champ | Booléens, dates, unités, valeurs supprimées, données confidentielles et modifications multiples |
| Détails techniques | Repli secondaire conservé | Noms français, monospace réservé aux valeurs techniques, copie et longues valeurs |
| Charger plus | Curseur serveur conservé ; présentation à borner selon les volumes | Focus du premier nouvel élément, erreur/reprise, résultats remplacés et nombre de lignes montées |

## Bases à conserver

- Contrôle serveur de `audit:view`, puis `audit:export` et preuve récente pour
  exporter. Le droit global donne volontairement accès au journal détaillé ; le
  droit contextuel `audit:view_field_history` a une autre portée. Aucun nouveau
  droit n’est justifié par la seule correction visuelle.
- Exclusion des événements du compte protégé pour les autres lecteurs ; projection
  des métadonnées par liste autorisée, avec exclusion des clés de secrets.
- Requêtes validées strictement, recherche bornée et caractères SQL jokers échappés.
  Pagination de 25 par défaut, plafond de 100, tri `createdAt/id`, curseur signé
  lié aux filtres et instantané temporel conservé entre lots.
- Annulation des requêtes précédentes, filtres persistés dans l’URL, attente de
  350 ms pour la recherche, résultats conservés pendant une actualisation.
- États vide/erreur avec reprise ; ouverture des détails au clavier et focus
  déplacé vers le premier nouvel événement lors du chargement d’un lot.
- Exports CSV/JSON avec permissions identiques à la lecture, plafond de 50 000,
  lots serveur de 500, protection des cellules CSV contre les formules et audit
  des phases demandée/terminée. Ces éléments ont des tests serveur simulés.
- Index composites et trigrammes présents dans le schéma ; résolution des noms
  de personnes groupée en une requête par lot. Leur présence ne mesure pas leur efficacité.
- Noms de comptes figés dans l’événement ; nom d’une fiche personne résolu dans
  l’état courant, avec identifiant conservé si elle n’existe plus. Préserver cette
  distinction entre état actuel et fait historique dans les textes.

La conservation est commune aux événements et à leurs changements associés.
La séparation future des finalités est déjà documentée dans le suivi Paramètres ;
cette revue ne la transforme pas en changement de schéma ni en nouvelle durée.
Le journal n’est pas une sauvegarde ni le propriétaire des engagements métier.

## Contrôles exécutés et limites

- **Build de production réussi** le 27 septembre 2026 avec `bun run build` :
  génération Prisma, compilation Next.js, lint, types et 22 pages statiques.
  Un premier échec Windows `EPERM` lors du remplacement du moteur Prisma a disparu
  à la relance, sans modification du code ni arrêt de processus.
- **175 tests ciblés réussis dans cinq fichiers** : `system-activity-journal-ux-contracts`,
  `audit-visibility`, `user-audit-redaction`, `system-page-route`,
  `users-access-hardening`. Le total inclut les protections des comptes ; il ne
  représente pas 175 parcours propres au journal. Les contrats client sont désormais
  testés par leurs fonctions, sans recherches de chaînes dans le fichier de page.
- **TypeScript et ESLint ciblé réussis**, y compris le parcours navigateur permanent.
  Le contrôle global d’architecture reste en échec sur `components/ui/sidebar.tsx`
  (925 lignes pour une limite de 900), préexistant et hors périmètre. Le client
  du journal respecte désormais la limite standard, sans exception.
- **Chromium : 1 920, 1 440, 1 024, 768, 390 et 320 px**, vrais composants et styles
  du dépôt, avec shell/session/routeur et API simulés. Le vrai dialogue de
  confirmation d’identité est rendu, sa réponse API est simulée. La police de
  l’aperçu est Arial ; le téléchargement de la police de production n’est pas validé.
- Le parcours réutilisable system-activity-journal.checks.ts (retiré)
  couvre les critères contextuels, la séparation des actions, les détails de deux
  coordonnées, la suppression de filtres, les dates sans soumission implicite,
  erreurs locales, focus Actualiser/Charger plus, conservation des lignes après
  erreur, reprise, vide, chargement initial, 200 lignes et export après confirmation
  avec critères modifiés entre-temps. Il est intégré à `admin-smoke.spec.ts` ;
  la suite complète avec connexion/base réelles n’a pas été exécutée ici.
- Captures inspectées sur bureau, largeur intermédiaire et mobile, avec détails
  ouverts ; absence de débordement interne des filtres et des changements vérifiée.
  Ouverture au clavier et focus visible de ligne contrôlés. Le refus de copie du
  navigateur donne un retour d’erreur ; le succès et la valeur copiée sont vérifiés
  avec un presse-papiers simulé, sans modifier celui du poste.
  Refus d’accès côté client vérifié avec une session simulée sans droit.
- Mesures de contraste sur les textes rendus au repos, au survol, au focus et dans
  les détails : minimum observé **6,93:1** sur les données de démonstration.
  Bordure du champ de recherche sur son fond : **4,73:1** ; contour de focus de
  ligne sur fond actif : **6,08:1**. Ces mesures ne certifient pas tous les états
  de tous les composants partagés ou d’autres thèmes.
- Aucune donnée réelle consultée ou modifiée, aucun export réel créé. Le fichier
  CSV de test contient uniquement des événements fictifs. Aucune erreur JavaScript
  non interceptée lors des parcours vérifiés.
- Captures, fichiers téléchargés et montage temporaires supprimés après vérification.

## Points ouverts et déclencheurs

| Sujet | Prochaine vérification / déclencheur |
| --- | --- |
| Session et base réelles | Exécuter le smoke test sur base E2E isolée avant validation complète de livraison ; vérifier noms historiques, droits effectifs et retours de liens de fiches. |
| Volumes et exploitation (JA-15) | Mesurer SQL, mémoire/rendu sur plusieurs centaines puis milliers de faits et export proche de 50 000, avec matériel représentatif. Définir ensuite si navigation bornée ou détails à la demande sont nécessaires. Les 200 lignes simulées ne fixent aucun seuil de production. |
| Route volumineuse (JA-16) | Séparer validation, sélection/curseur et export lors d’un prochain changement serveur, en conservant les contrats de confidentialité et les tests de flux. |
| Accessibilité et moteurs | Lecteur d’écran, zoom natif, Safari/Firefox, appareil tactile réel et police de production restent à contrôler. |
| Contrôle d’architecture global | Réduire le fichier sidebar lors du travail sur ce composant ; ne pas relever sa limite pour masquer l’échec. |
| Conservation et reprise | Aucun exercice de purge, restauration ou révocation de droit pendant un export n’a été rejoué ; suivi d’exploitation existant conservé. |

## Questions à reprendre à chaque évolution

- Un nouveau fait a-t-il un libellé compréhensible, une catégorie, une portée,
  une gravité et des filtres compatibles, y compris après le retrait du module ?
- La page distingue-t-elle acteur, compte cible et objet métier sans les confondre ?
- Les valeurs affichées correspondent-elles au fait historique ou à l’état actuel ?
- Peut-on identifier précisément le contact ou l’enregistrement modifié ?
- Les filtres proposés produisent-ils une requête acceptée, même depuis un lien
  contextuel ou après passage entre Activité et Connexions ?
- La liste correspond-elle aux critères visibles quand une nouvelle lecture échoue ?
- Que signifient « exporter », « période » et « actualisé » pour la personne qui lit ?
- La largeur utile, les noms longs et plusieurs centaines de faits restent-ils lisibles ?
- Les nouvelles données justifient-elles toujours les mêmes lecteurs et la même conservation ?

## Historique utile

| Date | Travail | Résultat |
| --- | --- | --- |
| 27 septembre 2026 | Analyse de la page et de ses composants | 163 tests ciblés ; défauts de filtres, libellés, adaptation et focus documentés |
| 27 septembre 2026 | Correction autorisée après analyse | Interface et filtres repris, export figé, changements contextualisés, client découpé ; 175 tests ciblés et parcours Chromium réussis avec dépendances simulées |
