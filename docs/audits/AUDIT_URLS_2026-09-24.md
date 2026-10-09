# Audit des URL des pages — 24 septembre 2026

> **Suivi : migration appliquée après validation.** Ce document conserve le diagnostic avant intervention. Les quatre familles recommandées ont été déplacées, leurs alias conservés et les retours filtrés / filtres partageables implémentés. L’état courant est décrit dans [NAVIGATION.md](NAVIGATION.md#routes-et-maintenance).

## Conclusion

Les chemins actuels permettent de faire fonctionner la navigation, mais leur organisation reflète encore les anciens pôles. Pour préparer la suite, la cible recommandée est : `/membres/...`, `/activite/...` et `/systeme/...` pour les modules concernés, avec les outils personnels et transversaux conservés à la racine.

Cette cible est une **proposition de migration**, pas une modification déjà appliquée. Les URL actives décrites dans `NAVIGATION.md` restent inchangées. Un changement de libellé de menu ne doit pas entraîner systématiquement un nouveau changement d'URL : après cette harmonisation, les chemins doivent rester stables.

## Périmètre et vérification

- Inventaire des 17 fichiers `page.tsx` dans `apps/web/src/app` : 15 modèles d'URL de pages affichées, y compris les listes, créations, fiches et connexion. Le fichier générique Système affiche deux pages et gère une entrée de pôle ; les trois autres entrées de compatibilité n'affichent pas une nouvelle page.
- Lecture du registre des fonctionnalités, des quatre pôles actifs, des permissions documentées par route, de la recherche, des retours vers les listes et des liens d'onglets.
- Lecture des redirections déclarées, du retour après connexion, des contrôles de liens de notifications et du catalogue des 37 chantiers futurs.
- Exécution de huit suites existantes : navigation, retours internes, destinations de notifications, route Système, recherche globale, permissions des pages Personne, navigation de sections et catalogue de feuille de route. **97 tests réussis**.
- Il s'agit d'un audit du code et des contrats testés, pas d'une campagne HTTP authentifiée sur chaque URL et chaque rôle. Les exemples `[id]` désignent des familles de fiches ; ils ne prouvent pas l'existence de chaque ressource en base. Les API ont été regardées comme dépendances, sans audit exhaustif de leurs endpoints.

## Chaque page actuellement présente

| Page | URL actuelle | Décision recommandée | Motif |
| --- | --- | --- | --- |
| Mon travail / accueil | `/` | Conserver | Point d'entrée personnel durable ; peut accueillir les futures tâches et échéances. |
| Connexion | `/login` | Conserver | Chemin d'authentification stable. Le franciser n'apporte pas de bénéfice suffisant pour changer les liens existants. |
| Mon compte | `/mon-compte` | Conserver | Outil personnel indépendant des droits d'administration. |
| Mes notifications | `/mes-notifications` | Conserver | Boîte personnelle commune aux modules, accessible depuis les outils globaux. |
| Recherche | `/recherche` | Conserver | Peut évoluer de la recherche de pages vers les dossiers sans changer d'adresse. |
| Répertoire | `/vie-interne/repertoire` | `/membres/repertoire` | Le préfixe doit distinguer ce domaine de l'Activité. Le répertoire comprend aussi les contacts : conserver le nom de la ressource. |
| Nouvelle fiche | `/vie-interne/repertoire/nouveau` | `/membres/repertoire/nouveau` | Garder la création sous sa collection. |
| Fiche du répertoire | `/vie-interne/repertoire/[id]` | `/membres/repertoire/[id]` | Garder l'identifiant et la fiche sous leur collection. |
| Actualité interne | `/vie-interne/actualite-interne` | `/activite/actualites` | Adresse courte sous son domaine ; « interne » reste utile dans le titre mais n'est pas nécessaire dans ce chemin du site privé. |
| Utilisateurs | `/administration/utilisateurs` | `/systeme/utilisateurs` | Regrouper l'administration des comptes avec les autres modules du pôle Système. |
| Nouvel utilisateur | `/administration/utilisateurs/nouveau` | `/systeme/utilisateurs/nouveau` | Même famille que la liste. |
| Fiche utilisateur | `/administration/utilisateurs/[id]` | `/systeme/utilisateurs/[id]` | Même famille que la liste ; conserver l'identifiant. |
| Journal d'activité | `/systeme/journal-activite` | Conserver | Emplacement cohérent pour l'historique transversal et ses filtres par ressource. |
| Paramètres système | `/systeme/parametres` | Conserver | Distinction claire avec Mon compte et les futurs paramètres métier. |
| Feuille de route | `/feuille-de-route` | `/systeme/feuille-de-route` | Harmonisation avec son placement actuel dans Système ; priorité moindre que Répertoire et Utilisateurs. Garder l'accès aux comptes connectés prévu aujourd'hui. |

Les fiches gardent un identifiant stable, sans nom de personne, pseudo ou équipe dans le chemin : un changement de nom ou d'affectation ne doit pas changer leur adresse. Le segment `nouveau` reste réservé à la création.

## Toutes les entrées de compatibilité identifiées

| Entrée actuelle | Comportement du code actuel | Traitement lors d'une migration |
| --- | --- | --- |
| `/personnes` | Redirection permanente vers `/vie-interne/repertoire` | Rediriger directement vers `/membres/repertoire`. |
| `/personnes/:path*` | Redirection permanente sous `/vie-interne/repertoire/:path*` | Rediriger directement vers la nouvelle famille en conservant le suffixe ; aucune nouvelle sous-page n'est créée par cette règle. |
| `/administration` | Redirection vers `/administration/utilisateurs` | Conserver comme alias de la liste Utilisateurs, avec une destination directe actualisée. |
| `/tableau-de-bord` | Redirection vers `/` | Conserver comme alias historique de l'accueil. |
| `/tableau-de-bord/mes-notifications` | Redirection permanente vers `/mes-notifications` | Conserver. |
| `/systeme` | Redirection vers la première page Système visible selon les permissions ; connexion si session absente | Conserver ce rôle d'entrée. La destination variable selon les droits ne doit pas devenir une redirection permanente commune à tous. |

Les autres chemins sous `/tableau-de-bord/...` et les destinations Système non implémentées aboutissent à `notFound()` dans leurs routes génériques. `/vie-interne` n'a pas de page d'accueil propre. Les racines proposées `/membres` et `/activite` ne sont pas des pages livrées.

La migration doit aussi ajouter des alias pour **tous les anciens chemins actifs déplacés**, pas seulement les anciennes routes `/personnes`. Les anciennes destinations planifiées de la feuille de route ne deviennent pas des pages actives ni des alias automatiques.

## Onglets, filtres et liens directs

| Parcours | État observé | Recommandation |
| --- | --- | --- |
| Répertoire, liste | `q`, `sort`, `structureStatus`, `cursor` dans l'URL | Conserver. La pagination par curseur n'impose pas de ressembler à celle des utilisateurs. |
| Fiche et création Personne | `returnTo` conserve la liste filtrée ; le retour est limité au chemin du répertoire | Conserver ce fonctionnement. Lors du déplacement, traiter aussi l'ancien chemin **contenu dans** `returnTo`. |
| Fiche Personne, onglets | `section=identite` ou `section=coordonnees` ; toute autre valeur revient à Identité | Conserver des onglets partageables. Les fixtures de liens contenant `section=contacts` ne démontrent pas l'ouverture de Coordonnées : cette valeur n'est pas reconnue par la page actuelle. |
| Liste Utilisateurs | `search`, `status`, `role`, `sort`, `page` dans l'URL | Conserver les filtres. Pour les nouveaux modules, préférer une convention commune telle que `q` ; accepter `search` si une harmonisation ultérieure est entreprise. |
| Liste Utilisateurs vers fiche | Lien sans contexte de retour ; le bouton de retour renvoie à la liste sans query string | À améliorer : transmettre un `returnTo` validé comme pour le Répertoire pour garder filtre, tri et page. Le lien vers son propre compte pointe sur `/mon-compte`, ce qui est cohérent. |
| Fiche Utilisateur | Sections `profile`, `access`, `account`, `security`, `history` ; quelques anciens noms restent acceptés | Conserver les liens existants. Les libellés français visibles n'obligent pas à renommer les valeurs techniques. `account` est une vue contextuelle, pas un nouvel onglet principal à créer. |
| Mon compte | Sections `profile`, `security`, `activity` ; `history` accepté comme alias d'Activité | Conserver. Ne pas déplacer le compte personnel sous l'administration des utilisateurs. |
| Journal | Filtres synchronisés avec l'URL, dont les liens ciblant une personne et un champ | Conserver ces liens précis et leurs paramètres lors de toute migration. |
| Paramètres | Une page regroupant les sections ; pas de lecture d'un paramètre d'onglet `section` | Ne pas présenter `?section=retention` comme un lien qui sélectionne une section. Si nécessaire, utiliser une ancre réellement reliée au titre ou implémenter la sélection. |
| Recherche | `q`, `pole`, `source` dans l'URL | Conserver. `pole=internal` reste un identifiant technique du pôle Membres ; ne pas le renommer implicitement avec son libellé. |
| Notifications | Filtre Toutes / Non lues / Archivées en état local | À améliorer : le refléter dans l'URL pour retrouver ou partager la vue sélectionnée. |
| Feuille de route | Phase, pôle et recherche en état local | À améliorer : paramètres proposés `phase`, `pole`, `q`, pour partager une feuille de route déjà filtrée. |
| Actualité | Flux avec pagination ; pas de page de détail d'annonce actuellement livrée | La route de collection suffit aujourd'hui. Créer `/activite/actualites/[id]` uniquement lorsqu'un vrai parcours de consultation le justifie. |
| Connexion | Paramètre `next` contrôlé pour rester sur une destination interne | Conserver les liens profonds, leurs filtres et leur onglet après connexion. Tester également un `next` contenant un ancien chemin après migration. |

Une adresse de module identifie un lieu durable. Un onglet ou un filtre de ce lieu peut rester un paramètre. Une ressource ayant son propre cycle de vie — candidature, adhésion, contrat — mérite son propre chemin, même si une vue résumée apparaît aussi dans une fiche du Répertoire.

## Points de maintenance à traiter avec la migration

1. **Chemins répétés dans plusieurs fichiers.** Le registre `FEATURES` existe, mais les liens de création, les retours, les fiches et les descriptions de permissions contiennent aussi des chaînes littérales. Prévoir des constructeurs communs de liens de liste, création et fiche ; ne pas déplacer seulement les dossiers de pages.
2. **Liens enregistrés dans les notifications.** Le service de lecture filtre les destinations avec `isKnownInternalPageHref`. Il faut accepter les anciens chemins légitimes et les nouveaux, puis produire les nouveaux liens à la création. Une redirection seule ne suffit pas si le lien est supprimé avant affichage par cette liste d'admission.
3. **Retour imbriqué dans `returnTo`.** Conserver la query string extérieure ne traduit pas automatiquement le chemin ancien contenu dans ce paramètre. Le validateur de retour Personne vérifie actuellement un unique chemin exact.
4. **Association des pôles aux chemins.** Les `matchHrefs` de Membres incluent encore `/bureau-juridique/incidents-sanctions` et `/bureau-juridique/inventaire-acces`. Le catalogue futur place les incidents dans Structure. Ces correspondances historiques ne doivent pas servir de modèle pour les nouvelles URL.
5. **Routes Système et navigation sont couplées.** Le fichier générique vérifie une entrée de navigation puis ne rend que le Journal ou les Paramètres. Ajouter une entrée de menu ne suffit donc pas à livrer une page. Chaque nouveau module doit avoir une route et un rendu effectifs, avec contrôle des accès.
6. **Les tests de validité d'un lien ne valident pas son onglet.** Les exemples `section=contacts` et `section=retention` illustrent cette limite. La migration doit vérifier la destination finale et la vue ouverte, en plus de l'admission du chemin.

Le helper `canOpenNavigationHref` n'est pas un inventaire exhaustif des routes ni une politique serveur : il peut accepter un chemin dynamique inconnu hors des destinations réservées. Son résultat seul ne permet pas d'affirmer qu'une page existe ou que l'utilisateur peut consulter sa ressource.

## Préparation des futurs pôles

Convention proposée pour les modules à concevoir, sans création de pages vides :

| Domaine | Préfixe proposé | Exemples indicatifs |
| --- | --- | --- |
| Aujourd'hui et outils personnels | Racine | `/`, `/mes-notifications`, `/mon-compte`, `/recherche` ; les nouvelles vues personnelles restent à définir selon leur usage. |
| Membres | `/membres` | `/membres/repertoire`, `/membres/adhesions`, `/membres/recrutement`, `/membres/arrivees-departs` |
| Esport | `/esport` | `/esport/equipes`, `/esport/planning`, `/esport/competitions` |
| Activité | `/activite` | `/activite/actualites`, `/activite/taches`, `/activite/calendrier`, `/activite/reunions` |
| Relations | `/relations` | `/relations/organisations`, `/relations/partenariats` |
| Structure | `/structure` | `/structure/entites`, `/structure/documents`, `/structure/contrats`, `/structure/incidents` |
| Finances | `/finances` | `/finances/comptes`, `/finances/operations`, `/finances/factures`, `/finances/notes-de-frais` |
| Système | `/systeme` | Utilisateurs, journal, paramètres et feuille de route ; modules techniques ultérieurs dans ce domaine. |

Ces exemples ne figent pas un écran par chantier. « Adhésions et rôles » peut présenter plusieurs vues sous un même module ; ses objets et son chemin définitif doivent être décidés ensemble. Les URL historiques `/sport-team-control`, `/bureau-juridique` et `/tresorerie` ne sont pas les conventions recommandées pour les futurs modules.

Éviter d'enfermer une ressource durable dans sa position organisationnelle du moment : une fiche du répertoire ne doit pas changer d'URL lorsqu'une personne change d'équipe. Les permissions et périmètres d'entité/équipe restent vérifiés indépendamment du chemin.

## Ordre conseillé de réalisation

1. Fixer la cible des quatre familles : Répertoire, Actualité, Utilisateurs, Feuille de route.
2. Centraliser les chemins utilisés et les constructeurs de liens, y compris retours et liens de notifications.
3. Livrer les pages aux nouvelles adresses et actualiser navigation, recherche, fils d'Ariane, routes documentées dans les permissions et tests. Garder les identifiants de données et de permissions.
4. Rediriger les anciens chemins directement vers les nouveaux ; conserver identifiants, paramètres et compatibilité des retours. Ne pas créer une chaîne `/personnes` → `/vie-interne/repertoire` → `/membres/repertoire`.
5. Vérifier liste, création, fiche, onglets, retour filtré, notification historique, connexion avec lien profond, accès refusé et URL inconnue. Vérifier l'absence de boucle ou de collision avec les segments de création.
6. Ajouter les filtres partageables des notifications et de la feuille de route comme améliorations séparées, puis documenter l'arborescence effectivement livrée.

## Sources locales principales

- `apps/web/src/app/**/page.tsx` : routes et entrées de compatibilité.
- `apps/web/next.config.ts` : anciennes routes `/personnes`.
- `apps/web/src/shared/constants/feature-registry.constants.ts` et `app.constants.ts` : destinations et pôles.
- `apps/web/src/shared/utils/internal-href.utils.ts` : liens internes et destinations de notifications.
- `apps/web/src/features/persons/person.ui.ts` : chemin du répertoire et validation des retours.
- `apps/web/src/features/users/UsersListPage.tsx` et `components/users/UserDetailPage.tsx` : liste, fiches et retour Utilisateurs.
- `apps/web/src/features/notifications/NotificationInboxPage.tsx` et `features/roadmap/RoadmapPage.tsx` : filtres locaux.
- `docs/NAVIGATION.md`, `docs/FEUILLE_DE_ROUTE.md` et `features/pages/MATRICE_PREPARATION.md` : organisation actuelle et cible produit.

## Validation après réalisation

Migration réalisée : les quatre familles utilisent les adresses recommandées. Les redirections permanentes préservent les paramètres, les liens de notifications historiques sont traduits au premier affichage comme au rafraîchissement, et les notifications nouvellement créées enregistrent les chemins canoniques. La déduplication accepte les anciens et nouveaux chemins équivalents.

Les retours filtrés des utilisateurs et les filtres partageables des notifications / de la feuille de route sont livrés. Le validateur des liens autorise les valeurs de query string encodées nécessaires à `returnTo`, tout en rejetant les chemins ambigus et en validant séparément le retour à la collection.

Vérifications finales : **1 026 tests dans 87 suites**, compilation de production, lint sans avertissement, typage et budgets architecture/performance validés. **13 scénarios Chromium réussis**, dont 13 cas de redirection historique, anciens liens de fiches, retour filtré, onglets, filtres après rechargement et historique, notifications enregistrées avant migration, absence de réapparition de données périmées, pages canoniques, URL inconnues et vues mobiles. Les essais navigateur utilisent un compte fictif dans une base locale isolée ; ils ne constituent pas une validation exhaustive de chaque rôle et de chaque donnée réelle. Voir le [compte rendu machine](url-migration-2026-09-24/verification.json).
