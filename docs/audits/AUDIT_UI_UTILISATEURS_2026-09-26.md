# Audit UI de la page Utilisateurs et grille réutilisable

> Rapport historique : résultats valables pour la passe décrite, non rejoués par
> la correction documentaire. Voir [l’index](README.md) et les [suivis courants](../qualite/pages/README.md).
> Les chemins indiqués comme historiques peuvent désigner des fichiers retirés.

Date : 26 septembre 2026. Page de référence : `/systeme/utilisateurs`.

Référence historique de cette page. Pour tout nouveau changement, utiliser la
[revue générale](../qualite/REVUE_GENERALE.md), ses fiches conditionnelles et le
[suivi courant Utilisateurs](../qualite/pages/systeme-utilisateurs.md). Les grilles
réutilisables ci-dessous témoignent du passage initial ; le nouveau référentiel
porte désormais la méthode commune.

Ce document rassemble les décisions prises sur cette page, les contrôles réellement
effectués, les défauts corrigés et une grille à réutiliser sur les autres pages.
Une capture au repos ne suffit pas à valider une interface : les interactions,
les données inhabituelles et les préférences d'accessibilité font partie du contrôle.

## 0. Questions à se poser avant chaque page

Cette étape précède les choix de hero, cartes, largeur et couleurs. La cohérence
du produit vient des règles communes et de la qualité des interactions ; elle
n'impose pas la même composition à toutes les pages. Répondre concrètement aux
questions suivantes dans chaque nouvel audit, puis vérifier les réponses au rendu.

| Question systématique | Réponse retenue pour Utilisateurs |
| --- | --- |
| Quel travail l'utilisateur vient-il accomplir ? | Retrouver un compte, comparer ses accès et son état, ouvrir sa fiche ou créer un compte. |
| Quel est le type de page : liste, détail, formulaire, tableau de bord, lecture ? | Liste de gestion. La recherche et les comptes sont le contenu principal. |
| Quelle information doit être repérée en premier ? | L'identité du compte, puis son rôle et son état. |
| Quelle action mérite le plus de visibilité ? | « Nouvel utilisateur », selon les permissions. Une seule action principale, dans la barre d'outils du tableau. |
| L'action concerne-t-elle la page entière ou son contenu principal ? | La création concerne les comptes : bouton regroupé avec recherche, filtres et tri, plutôt qu'isolé dans le haut de page. |
| L'en-tête sert-il à travailler, expliquer ou présenter ? | Identifier la page et préciser sa fonction : titre compact, puis « Gérez les comptes et leurs accès. » en texte secondaire de 14 px. Une ligne en usage normal, retour autorisé si l'espace ou le zoom l'exige. |
| Un hero encadré, une illustration ou une icône apporte-t-il une information utile ? | Non ici. Suppression du grand panneau, de l'icône encadrée, de l'accent vertical et du séparateur d'action. |
| Quels blocs se disputent inutilement l'attention ? | L'ancien hero, le tableau et la carte de statistiques avaient un poids proche. Priorité donnée au tableau. |
| Quel volume et quelle fréquence d'utilisation faut-il prévoir ? | Plusieurs pages de comptes, consultation répétée ; lignes compactes, filtres, tri et pagination. |
| Quelles colonnes aident réellement la comparaison ? | Compte, accès, état, dernière connexion. L'alerte de sécurité reste attachée au compte concerné. |
| La largeur sert-elle les données ou crée-t-elle simplement du vide ? | Liste large pour l'identité et les colonnes ; rail de statistiques uniquement si l'espace disponible le permet. |
| Quel axe doit centrer le contenu : l'écran ou l'espace après navigation ? | Centrage écran dès qu'il permet une largeur confortable ; sur écran intermédiaire, priorité à une largeur de 64 rem, ou à toute la place disponible si elle est moindre. Plafond de 80 rem, sans chevaucher sidebar ni rail. |
| Le centrage esthétique dégrade-t-il l'usage sur un écran intermédiaire ? | Le centrage strict réduisait la liste à 425 px sur un écran de 1 024 px. Elle utilise maintenant environ 689 px ; à 1 140 px, la présentation en tableau est conservée. |
| Le rail dépend-il du tableau ou du bord de la zone de travail ? | Rail aligné au bord droit de la zone disponible, à 16 px de l'espace réservé à la scrollbar ; maintien au défilement sur grand écran. |
| Déplacer un bloc secondaire doit-il élargir ou décaler le contenu principal ? | Le rail garde son bord droit indépendamment du tableau. L'espace entre eux peut grandir sur grand écran ; la place nécessaire aux données prime sur le centrage strict aux largeurs intermédiaires. |
| Comment regrouper les informations secondaires sans concurrencer la liste ? | Une carte compacte pour les statistiques, avec trois lignes alignées. Le filet isolé a été abandonné car les chiffres paraissaient détachés. Résumé dépliable sur mobile. |
| Que signifie chaque couleur ? | Bleu nuit pour les surfaces ; violet pour superadmin, bleu pour administrateur, cyan pour utilisateur ; vert pour actif et jaune pour une attention requise. |
| La sobriété a-t-elle rendu la page trop terne ? | Palette du bleu de navigation conservée ; badges d'accès et d'état avec texte lisible et contour fin. |
| Les traitements secondaires prennent-ils le dessus sur les noms ? | Le problème venait du fond coloré, pas de la forme du badge : fond transparent et contour discret, noms toujours prioritaires. |
| Les arrondis correspondent-ils au caractère de la page ? | Gestion dense : 8 px pour panneaux et contrôles, 4 px pour badges ; formes plus sobres que les grandes cartes arrondies et pilules. |
| Quels éléments semblent cliquables et le sont-ils vraiment ? | Ligne entière, boutons, filtres, résumé mobile. Les badges informatifs n'ajoutent pas de faux contrôle. |
| Que faut-il conserver quand la place diminue ? | Recherche, identité, accès, état et alerte. Filtres et statistiques se replient ; email retiré des cartes mobiles. |
| Quelle navigation faut-il après une action ou une consultation ? | Fil d'Ariane pour la hiérarchie, paramètres de retour conservés pour retrouver les filtres de liste. Aucun retour supplémentaire nécessaire ici. |
| Quelles données et quels droits changent le rendu ? | Noms longs, compte protégé, alerte, compte désactivé, absence de connexion, droit de création et visibilité des informations de sécurité. |
| Quels états peuvent invalider une belle capture au repos ? | Chargement, vide, erreur, filtrage, survol, focus, menus ouverts, zoom, contraste renforcé et mouvement réduit. |
| Quelle preuve permet de conclure que le changement aide ? | Comparaison visuelle ordinateur/mobile, densité conservée, contrastes mesurés, parcours clavier et scénarios de données. |

### Adapter la réponse à la page concernée

| Type de page | Priorité de composition | En-tête et largeur à envisager | À examiner spécialement |
| --- | --- | --- | --- |
| Liste de gestion | Retrouver, comparer, agir sur des éléments | En-tête compact ; tableau large si les colonnes le justifient | Volume, filtres, tri, pagination, densité, états, permissions ; statistiques secondaires |
| Fiche de détail | Identifier une entité et comprendre sa situation | Identité, état et actions ; sections structurées, largeur adaptée aux données | Informations clés, navigation entre sections, historique et actions sensibles |
| Formulaire | Saisir correctement et terminer une action | Titre clair et colonne de lecture plus étroite | Labels, aide, erreurs, champs obligatoires, sauvegarde, annulation et saisie non enregistrée |
| Tableau de bord | Comprendre une situation et décider des priorités | Synthèse et période ; grille selon les indicateurs | Importance relative des statistiques, tendances, unités, fraîcheur et accès aux détails |
| Paramètres | Comprendre et modifier une configuration | Sections ou groupes cohérents, description ciblée | Portée de chaque réglage, dépendances, effet immédiat ou après sauvegarde, droits |
| Lecture ou documentation | Lire et retrouver une information | Colonne lisible, sommaire si utile | Longueur des lignes, hiérarchie éditoriale, liens, lecture mobile ; éviter une largeur de tableau |
| Accueil ou présentation | Expliquer la valeur et orienter | Hero possible s'il aide le message et l'action | Contenu réellement utile, poids des illustrations, première action et performance |

Ces propositions sont des points de départ, pas des gabarits obligatoires.
Un fil d'Ariane représente une hiérarchie ; un retour contextuel ou une annulation
peut rester utile dans un formulaire ou un parcours. Décider selon le parcours,
sans transformer le choix de cette liste en interdiction globale.

### Fiche de décision à recopier

- Page et public concernés :
- Tâche principale, volume attendu et action prioritaire :
- Informations principales / secondaires :
- En-tête retenu et raison de son niveau de présence :
- Largeur, densité et disposition adaptées au contenu :
- Fonction des couleurs, contours, badges et effets :
- Adaptations mobile, clavier et préférences d'accessibilité :
- Données inhabituelles, états et permissions à couvrir :
- Règles communes conservées et adaptations locales justifiées :
- Preuves obtenues, limites restantes et décisions à réexaminer :

## 1. Résultat et niveau de preuve

La page présente désormais une liste compacte, une hiérarchie typographique
cohérente, des statistiques distinctes et des contrôles accessibles au clavier
dans les scénarios exécutés. Le contrôle détaillé des états a révélé un défaut
de génération du contour de focus qui n'avait pas été identifié lors du premier
passage visuel ; il a été corrigé pour les primitives utilisées ici.

La révision de composition retire le hero encadré au profit d'un en-tête compact,
adopte un tableau bleu ardoise et regroupe le rail des statistiques. Elle est appliquée
à la liste Utilisateurs ; le composant hero des autres pages n'est pas modifié.

Après retour utilisateur, l'essai anthracite a été remplacé : il était perçu comme
trop neutre et ancien. La version courante associe des surfaces indigo à des
badges d'accès aux teintes douces et états à point coloré. La simplicité de structure reste utile, mais
ne doit pas effacer les repères qui rendent les données rapides à parcourir.

Le retour utilisateur précise que la forme des badges convient : leurs fonds
colorés attiraient trop l'œil. La version retenue garde un contour fin, un fond
transparent et une légère couleur de texte pour l'accès. L'état conserve un point
et un libellé secondaire. Les noms restent prioritaires. Le badge d'alerte est
également transparent, avec texte et contour jaunes. La mention d'identité protégée
reste un texte secondaire. Le survol ne déplace plus la flèche et ne recolore plus
le nom ni le contour de l'avatar.

Le dernier retour sur capture a conduit à éclaircir les surfaces du tableau et
à réunir les statistiques dans une carte compacte : le fond précédent était trop
sombre et les chiffres sur le fond de page manquaient de regroupement. Les surfaces
actuelles sont distinguées du fond général, sans dégradé ni ombre décorative.

Préférence finale : le fond principal du tableau et des statistiques reprend
exactement le bleu de la sidebar (`#202c3e`), via le jeton `--sidebar`. En-têtes,
alternance et survol utilisent des variations proches pour garder une lecture nette.

Les arrondis de cette page et de ses menus sont réduits : panneaux et contrôles
à 8 px, badges à 4 px. Cette échelle est locale ; la navigation et les autres pages
ne sont pas redessinées. Les avatars et les points d'état restent circulaires.

Le haut de page associe le titre « Utilisateurs » à 24 px et la phrase courte
« Gérez les comptes et leurs accès. » à 14 px, en couleur secondaire, avec 4 px
d'espacement. La description vise une seule ligne en usage normal ; elle peut
revenir à la ligne au zoom ou en espace réduit, sans troncature. Le bouton
de création est intégré à la barre d'outils, à droite des filtres sur grand écran.
Sur largeur intermédiaire, recherche et création précèdent les filtres ; sur petit
écran, le bouton reste visible sous la recherche, hors du bloc de filtres dépliable.
La barre d'outils reste disponible pendant le chargement de la liste.

Le cadre extérieur occupe toute la zone disponible, mais la liste reste limitée
à 80 rem. La grille privilégie le centre de l'écran tant qu'il permet une largeur
de travail d'au moins 64 rem. Sinon, elle rapproche le tableau de la zone utile
pour conserver cette largeur ; si moins de 64 rem sont disponibles, elle utilise
toute cette place. Cette largeur de confort n'est donc jamais un minimum qui
provoque un débordement. Le titre suit les bords du tableau, la navigation reste
ancrée et le rail conserve son placement indépendant.

À 1 920 px, le tableau mesure 1 280 px, commence à 320 px et son centre est à
960 px ; à 2 560 px, il conserve cette largeur et son centre passe à 1 280 px.
Avec la sidebar ouverte dans Chromium, la colonne passe de 425 à environ 689 px
sur un écran de 1 024 px, de 536 à 800 px sur un écran de 1 140 px, et de 824 à
1 024 px sur un écran de 1 440 px. À 1 140 px, les colonnes du tableau restent
visibles ; les cartes sont réservées aux largeurs réellement insuffisantes.

Le rail reste indépendant, au bord droit, même sur grand écran. Sa largeur est
de 15 rem et l'écart avec le tableau d'au moins 1,25 rem ; cet écart peut grandir.
Une marge de 1 rem le sépare du bord intérieur de la zone défilante ; la place
réservée à la scrollbar s'ajoute à cette marge. Le rail utilise
`position: sticky` avec un retrait supérieur de 1 rem, dans la grille et sous
l'en-tête de navigation. La sidebar reste ancrée à gauche. Si la zone disponible
après sidebar n'atteint pas 94 rem, les statistiques passent au-dessus de la
liste, sans position collante. Elles se replient en résumé lorsque leur largeur
propre est inférieure à 32 rem ; le rail latéral reste toujours développé.

Ce rapport ne certifie pas une conformité WCAG complète ni toutes les pages du
produit. Les limites et les contrôles complémentaires sont explicités plus bas.

Légende utilisée dans les tableaux :

- **V** : vérifié dans Chromium avec les composants du dépôt.
- **C** : examiné dans le code ; ne vaut pas validation de toutes les interactions.
- **D** : décision de conception retenue pour cette page.
- **R** : reste à vérifier ou à traiter avant une généralisation.

### Environnement et données

- Composants réels de la page, du tableau, de l'en-tête, de la sidebar et des contrôles.
- CSS recompilé depuis `globals.css` et les sources ; police Geist chargée depuis
  le fichier local produit par Next.js, sans substitution par Arial pour l'audit final.
- Chromium pour le passage complet de typographie, contrastes et états ;
  Firefox 151 et WebKit 26.5 sous Windows pour le passage complémentaire de
  géométrie, clavier, pagination, réponses réseau et agrandissement du texte.
  WebKit automatisé ne vaut pas essai dans Safari sur macOS ou iOS.
- Environnement isolé avec authentification, contexte utilisateur, navigation
  Next.js et réponses API simulés. Aucun compte réel n'a été créé ou modifié.
- Jeux fictifs : quatre comptes courants, identité protégée, compte désactivé,
  mot de passe à changer, noms/identifiants/emails longs, puis 43 et 10 003 comptes
  paginés. Le dernier scénario ne transmet que 20 comptes par réponse : il vérifie
  le comportement de l'interface, pas les performances d'une base de données.
- Largeurs : **320, 390, 640, 768, 1 024, 1 140, 1 200, 1 440, 1 784, 1 920 et 2 560 px**.
- Agrandissement du texte à 200 % par augmentation de la taille racine ; ce test
  est distinct du zoom natif du navigateur et d'un test sur téléphone physique.
- Contrôles spécifiques de survol et de focus à 1 920 et 390 px.
- Géométrie avec sidebar ouverte et réduite à 1 024, 1 440, 1 560, 1 784 et
  1 920 px : centrage conservé lorsque la largeur de travail le permet ; priorité
  à la largeur utile sinon, sans chevaucher le rail ou la navigation.

### Historique des vérifications

Les captures, relevés JSON, journaux et scripts temporaires de cet audit ont été
supprimés à la demande de l'utilisateur. Ce document conserve les décisions,
les résultats résumés et la grille réutilisable ; les tests existants du projet
sont conservés.

Les contrôles décrits ont utilisé des données fictives et des états échantillonnés.
Ils ne couvrent pas chaque combinaison possible de données et de préférences.

Réserve visuelle relevée pendant la comparaison : dans WebKit sous Windows,
les graisses de titre et d'en-tête paraissent plus légères que dans Chromium et
Firefox. L'inspection confirme Geist chargée (`100 900`) et `font-weight: 600`
sur le titre et les en-têtes. La cause de cette différence de rendu n'est pas
établie ici ; vérifier Safari réel avant de modifier la typographie du produit.

## 2. Audit de la composition et du contenu

| Élément | Décision ou constat final | Preuve / réserve |
| --- | --- | --- |
| Sidebar | Ancrée à gauche ; ne se déplace pas avec le contenu. | V lors du contrôle de géométrie, ouverte et repliée. |
| Cadre et largeur principale | Cadre extérieur pleine largeur ; plafond de 80 rem ; priorité à une largeur de travail de 64 rem si possible, puis au centrage écran. | V, D. Onze largeurs de 320 à 2 560 px dans Chromium et dix dans Firefox/WebKit, sans débordement. |
| Marge supérieure | Une seule respiration : 24 px à partir du palier `sm`, 16 px en dessous. | V lors du contrôle du cadre de page. |
| En-tête | Titre à 24 px et description courte à 14 px, espacés de 4 px ; aucun panneau ni action isolée. | C, D pour l'ajout de la description ; composition précédente vérifiée au navigateur. |
| Action principale | « Nouvel utilisateur » dans la barre d'outils, à droite des filtres sur grand écran ; hauteur de 40 px sur ordinateur, 44 px sur mobile, visible sans ouvrir les filtres. | V pour rendu, focus et autorisation d'affichage avec profils simulés. |
| Hauteurs des commandes | Recherche, création, filtres, tri, effacement et réinitialisation harmonisés : 44 px avant le palier `lg` (1 024 px), 40 px à partir de ce palier. | V, hauteurs calculées vérifiées à 390 et 1 920 px, y compris filtres mobiles dépliés. |
| Création et états de liste | Bouton conservé pendant le chargement, sur liste vide et en erreur ; URL de retour conservant recherche, filtres et tri. | V pour visibilité et paramètres état/rôle/tri ; navigation réelle vers le formulaire hors audit isolé. |
| Fil d'Ariane | Donne la position dans la navigation ; pas de retour redondant dans cette liste. | C. Parcours complet des pages de destination hors de cet audit. |
| Alignement | Titre et tableau ont les mêmes bords ; centre de l'écran privilégié dans les limites d'une largeur utile suffisante ; statistiques au niveau du bloc de liste. | V. Axe stable à 960 px sur écran de 1 920 px, sidebar ouverte et réduite ; adaptation contrôlée aux tailles intermédiaires. |
| Statistiques latérales | Rail de 15 rem, séparé d'au moins 1,25 rem ; présent quand le conteneur disponible atteint 94 rem. | V. Le seuil dépend de la place après la sidebar, pas seulement de l'écran. |
| Bord droit et scrollbar | Marge de 16 px dans la zone utile, en plus de l'espace de scrollbar réservé par le layout. | V à 1 784, 1 920 et 2 560 px ; bord droit stable avec sidebar ouverte/repliée à 1 920 px. |
| Statistiques au défilement | Rail collant à 16 px du haut de la zone défilante sur grand écran ; demeure dans les limites de sa grille. | V avec 20 lignes visibles sur 43 comptes et un défilement de 500 px. |
| Poids des statistiques | Carte compacte avec titre et trois lignes ; libellés secondaires, valeurs alignées, jaune localisé sur l'alerte. | V, D. Le regroupement donne une structure au rail. |
| Statistiques sur mobile | Résumé compact, dépliable ; indication d'une attention nécessaire conservée. | V. Ouverture au clavier et fermeture testées. |
| Recherche | Toujours disponible, avant les filtres ; nom accessible explicite. | V. Recherche, effacement et état sans résultat contrôlés dans les passages de vérification. |
| Autocomplétion de recherche | Champ `type="search"`, `autocomplete="off"`, nom de champ dédié ; attributs d'exclusion Bitwarden, 1Password et LastPass hérités de `Input`. | V pour le DOM, le focus et l'effacement ; extension réelle non exécutée dans le navigateur d'audit. |
| Recherche visuelle | Placeholder court « Rechercher… » ; titre précisant nom, identifiant ou email. | D. Le titre au survol est un complément, pas le nom accessible du champ. |
| Filtres sur ordinateur | État, rôle et tri sur la barre d'outils lorsque la largeur le permet. | V. |
| Filtres sur mobile | Bouton dépliant avec compteur des filtres/du tri actifs. | V. Recherche non comptée parmi ces trois réglages. |
| Retour aux valeurs initiales | Réinitialisation explicite, visible lorsqu'un réglage ou une recherche est actif. | V. |
| En-têtes de colonnes | Compte, Accès, État, Dernière connexion, Action accessible sans libellé visuel encombrant. | V. Structure de tableau native conservée. |
| Proportions des colonnes | Identité prioritaire ; largeur encadrée pour accès, état et date. | V. Pas de colonne « Sécurité » presque toujours vide. |
| Densité | Lignes courantes de 64 px ; hauteur minimale, pas plafond qui coupe le texte. | V à 1 784/1 920/2 560 px ; croissance autorisée sur largeur intermédiaire et vérifiée avec contenu plus long. |
| Avatar | Aligné sur le haut du bloc d'identité. | V avec et sans alerte. |
| Nom | 14 px semi-gras, visible en premier. | V. Sur mobile, les noms longs peuvent revenir à la ligne. |
| Identifiant et email | Police sans empattement commune, 13 px ; email conservé sur ordinateur. | V. L'email n'alourdit pas la carte mobile. |
| Rôle et état | Badges à 13 px, graisse normale, fond transparent et contour fin ; rôle légèrement coloré, état secondaire avec point coloré. | V. La couleur n'est pas le seul indicateur. |
| Identité protégée | Mention secondaire neutre à 12 px, sans badge. | V. Distincte d'une alerte demandant une action. |
| Mot de passe à changer | Badge jaune, texte explicite ; associé à l'identité du compte. | V. Autorisation issue de la réponse API respectée dans les essais simulés. |
| Dernière connexion | Texte secondaire à 13 px ; format relatif lisible ; « Jamais » si absence de date. | V, C. Pas d'audit exhaustif des fuseaux horaires ou dates malformées. |
| Pagination | Compteurs à 13 px, page courante distinguée, précédent/suivant désactivés aux bornes. | V avec 43 comptes, trois pages, ordinateur et mobile. |
| Zone vide sous la liste | Conservée lorsque peu de comptes sont présents. | D. Les lignes ne sont pas étirées pour remplir l'écran. |

## 3. Typographie, couleurs, contours et effets

### Échelle de référence retenue

| Usage | Taille à une racine de 16 px | Graisse / comportement |
| --- | --- | --- |
| Titre principal | 24 px | 600, interligne 32 px ; retour à la ligne autorisé |
| Description de page | 14 px | Couleur secondaire, interligne 20 px, marge supérieure 4 px ; phrase courte sans troncature |
| Noms | 14 px | 600 |
| En-têtes du tableau | 13 px | 600 |
| Identifiants, emails et dates | 13 px | Normale, interligne 20 px |
| Badges de rôle et d'état | 13 px | Normale, interligne 20 px ; 26 px de haut, fond transparent et contour de 1 px |
| Libellés et compteurs de pagination | 13 px | Selon le composant ; page courante distinguée |
| Libellés de statistiques | 13 px | Normale |
| Valeurs de statistiques | 20 px | 600, chiffres tabulaires |
| Mention d'identité protégée | 12 px | Normale, couleur secondaire |
| Badge d'alerte | 12 px | 500 ; padding, texte et contour suffisamment distincts |
| Filtres et boutons | 14 px | Hiérarchie héritée des contrôles communs |
| Champ de recherche sur petit écran | 16 px | Taille native du champ conservée |

Les tailles sont exprimées en rem dans le code. Une police monospace n'est pas
nécessaire pour un identifiant de compte lisible par un humain. Les nombres de
statistiques et les dates peuvent utiliser les chiffres tabulaires sans changer
de famille typographique.

Les commandes de la barre d'outils suivent une même hauteur : 40 px sur ordinateur
et 44 px sur mobile. Le bouton d'effacement intégré au champ suit cette hauteur
avec une cible carrée et un espace réservé à droite du texte. Les lignes de 64 px
et les badges de 26 px conservent leur densité ; uniformiser les commandes ne
signifie pas agrandir les données de la liste.

### Palette et contraste

| Fonction | Jeton / couleur | Règle |
| --- | --- | --- |
| Fond de page | `surface-canvas`, `#0d111c` | Repose derrière les zones fonctionnelles. |
| Panneaux et lignes de base | `surface-panel` → `sidebar`, `#202c3e` | Même bleu que la navigation, selon la préférence utilisateur. |
| En-têtes | `surface-panel-header`, `#27364b` | Sépare le classement des données. |
| Alternance | `surface-row-alternate`, `#233145` | Aide au suivi horizontal, contraste discret. |
| Survol | `surface-tile-hover`, `#2d415c` | Réservé aux éléments interactifs. |
| Fond de recherche | `surface-inset`, `#10182a` | Champ en retrait. |
| Bordure de contrôle | `border-control`, `#7891b5` | Distincte des séparateurs décoratifs. |
| Superadmin | `access-privileged`, `#c2b8e7` | Texte violet doux ; ne représente pas une alerte. |
| Administrateur | `access-admin`, `#acc6e8` | Texte bleu doux. |
| Utilisateur | `access-member`, `#a3c9d8` | Texte cyan atténué. |
| État actif | `success`, `#86efac` | Petit point vert, libellé secondaire ; valeur des comptes actifs assortie. |
| État désactivé | `muted-foreground`, `#a9b7cc` | Libellé explicite et point gris ; pas d'assimilation à une erreur. |
| Texte principal | `foreground`, `#e7edf7` | Noms, titres, informations importantes. |
| Texte secondaire | `muted-foreground`, `#a9b7cc` | Métadonnées lisibles, pas texte « désactivé ». |
| Action principale | `primary`, `#70b5fa` | Contraste avec le texte sombre `#0c1a2b`. |
| Alerte | `warning`, `#fcd34d` | Situation à traiter, jamais décoration générale. |
| Focus | `ring`, `#92acd0` | Contour perceptible indépendamment du survol. |

La palette indigo est définie une seule fois dans `globals.css`, sous
`data-surface-tone="indigo"`, puis activée sur cette page et sur les menus de ses
filtres rendus dans un portail. Les autres pages et la sidebar gardent leur palette.
Les alias de surface sont redéfinis dans cette portée pour éviter l'héritage de
valeurs déjà calculées à la racine. Le contraste renforcé conserve la priorité
sur les contours de cette variante.

Exemples calculés sur cette palette : texte secondaire/panneau **6,93:1**,
texte secondaire/survol **5,11:1**, texte principal/en-tête **10,41:1**,
texte du bouton principal/fond **8,08:1**, contour de focus/survol **4,47:1**,
bordure de champ/fond de champ **5,49:1**.

Les libellés d'accès et d'état sont opaques, dans des badges à fond transparent
et contour teinté à 30 %. Leur contraste
est également mesuré sur le fond de chaque ligne au survol ; chaque libellé mesuré
dépasse 4,5:1 lors du passage de vérification. La visibilité
vient du contraste et de la hiérarchie, sans accumulation d'effets décoratifs.

Le relevé des textes visibles des scénarios standards atteint au moins 4,5:1.
Ce relevé ne remplace pas une mesure de toutes les transparences, tous les
pseudo-éléments et tous les états de désactivation. Les couleurs composées doivent
être mesurées sur leur fond effectif, pas comparées avant application d'une opacité.

### Matrice des états interactifs

| Élément | Normal | Survol | Focus clavier | Ouvert, sélectionné ou désactivé |
| --- | --- | --- | --- | --- |
| Action principale | Bleu, texte sombre | Variation légère du fond | Contour de 3 px corrigé | Navigation de destination non exécutée dans cet audit isolé |
| Recherche | Fond en retrait, bordure visible | Fond et bordure changent | Contour de 3 px et fond de focus | Effacement et recherche contrôlés ; champ non désactivable ici |
| Sélecteurs | Fond discret, valeur courante | Fond et bordure changent | Contour de 3 px corrigé | Menu au clavier, option surlignée, Échap et retour du focus vérifiés |
| Ligne de tableau | Alternance et séparateur | Fond de ligne uniforme ; flèche, nom et avatar stables | Contour intérieur opaque de 2 px | Toute la ligne mène à un lien natif ; pas de faux bouton sur le `tr` |
| Carte mobile | Identité puis métadonnées | Fond renforcé avec pointeur | Contour intérieur visible | Aucune commande interactive imbriquée dans le lien de carte |
| Résumé des statistiques | Surface indigo | Survol ajouté | Contour intérieur de 2 px | Entrée déplie/replie ; chevron indique l'état |
| Rôle et état | Badges transparents à contour fin, état secondaire et point | Texte lisible sur le fond de ligne survolé | Pas de tabulation autonome | Rôles et états conservent les mêmes teintes sur mobile |
| Mention d'identité protégée | Texte neutre | Pas d'effet de bouton autonome | Non focalisable | Ne pas lui donner une apparence cliquable sans action |
| Badge d'alerte | Jaune avec texte explicite | Reste lisible sur le survol de la ligne | Pas de tabulation supplémentaire | Visible uniquement dans le contexte de permissions prévu |
| Pagination | Pages et commandes identifiables | Styles des boutons communs | Bénéficie du correctif de `Button` | Dernier « suivant » désactivé vérifié ; styles détaillés de chaque page à recontrôler sur les autres usages |

Le survol ne doit ni agrandir une ligne ni déplacer les colonnes. Le focus peut
être plus contrasté que le survol : il indique la position exacte au clavier.
Un contour décoratif de panneau n'a pas la même fonction qu'un contour de champ.
Les angles suivent une échelle sobre : panneaux, contrôles et menus 8 px,
badges 4 px. Aucun fond coloré n'est ajouté aux badges.
Les ombres décoratives importantes ne sont pas nécessaires dans ce tableau.

Les transitions ordinaires observées sont de 150 ms. La règle globale de réduction
des mouvements les ramène à 0,01 ms ; le chevron des statistiques a été mesuré
dans ce mode. La réduction de mouvement ne doit pas supprimer l'indication de
l'état ouvert/fermé.

## 4. Défauts identifiés et corrections

| ID | Importance | Constat | Traitement |
| --- | --- | --- | --- |
| UI-01 | Importante | Les contrôles ne dessinaient pas le contour de focus demandé. | Corrigé dans `Button`, `Input` et `Select`. Compilation CSS et mesure de l'épaisseur réelle vérifiées. |
| UI-02 | Moyenne | Le focus de ligne utilisait le jeton à 40 % d'opacité, trop discret. | Jeton opaque conservant le contour intérieur de 2 px. |
| UI-03 | Mineure | Le résumé mobile des statistiques indiquait un clic par le curseur, sans survol visuel. | Fond de survol et transition ajoutés. |
| UI-04 | Moyenne | Plusieurs métadonnées trop petites et identifiants dans une autre famille de police. | Métadonnées à 13 px et Geist uniforme ; hiérarchie des noms maintenue. |
| UI-05 | Mineure | Identité protégée présentée comme une alerte. | Mention neutre sans badge dans la version retenue. |
| UI-06 | Moyenne | Une hauteur de 96 px limitait la densité de la liste. | 64 px minimum ; alerte regroupée avec les métadonnées, croissance autorisée si nécessaire. |
| UI-07 | Moyenne | Statistiques et filtres repoussaient les premiers comptes sur mobile. | Résumé dépliable et filtres regroupés avec compteur. |
| UI-08 | Moyenne | Le hero prenait une place excessive pour une liste de travail. | En-tête compact avec titre et description d'une phrase courte ; création intégrée à la barre d'outils du tableau. |
| UI-09 | Moyenne | Grandes surfaces et carte de statistiques en concurrence avec les comptes. | Statistiques secondaires et en-tête compact ; tableau principal conservant la priorité. |
| UI-10 | Moyenne | L'essai anthracite et l'absence de repères colorés rendaient la page trop terne. | Surfaces indigo et couleurs fonctionnelles ; densité de 64 px conservée sur ordinateur. |
| UI-11 | Moyenne | Les fonds colorés des badges de rôle et d'état concurrençaient les noms. | Badges conservés avec fond transparent, contour fin et teintes atténuées ; suppression des effets décoratifs de survol sur nom, avatar et flèche. |
| UI-12 | Moyenne | Tableau jugé trop sombre et statistiques détachées de la composition. | Surfaces éclaircies en bleu ardoise ; statistiques réunies dans une carte compacte avec alignements réguliers. Contrastes recalculés au repos et au survol. |
| UI-13 | Moyenne | Arrondis trop prononcés pour le rendu de gestion souhaité. | Échelle locale de 8 px pour panneaux et contrôles, 4 px pour badges ; mesure des rayons réels dans le navigateur. |
| UI-14 | Moyenne | Suggestions de gestionnaire de mots de passe dans la recherche. | Champ explicitement déclaré comme recherche, autocomplétion désactivée et attributs d'exclusion conservés ; bouton d'effacement unique. |
| UI-15 | Moyenne | Action de création isolée du tableau. | Déplacée avec les commandes de liste, accessible pendant le chargement et sur mobile ; contrôle de permission préservé, filtres conservés dans l'URL de retour. |
| UI-16 | Moyenne | Le plafond de largeur éloignait le rail du bord droit sur grand écran. | Conteneur pleine largeur, marge droite de 16 px après prise en compte de la scrollbar, rail collant et adaptation mobile préservée. |
| UI-17 | Moyenne | Étendre le tableau pour déplacer le rail rompait son centrage sur l'écran et le collait au bloc secondaire. | Grille locale séparant les deux placements : tableau centré, largeur plafonnée et limitée par les obstacles ; rail ancré à droite, espace intermédiaire flexible. Mesures avec sidebar ouverte et réduite, grands écrans et scrollbar. |
| UI-18 | Moyenne | Le centrage devenu strict réduisait trop la colonne aux tailles intermédiaires, malgré l'espace utilisable à droite. | Priorité à une largeur de confort de 64 rem, limitée à la place disponible ; centrage écran dès que cette largeur le permet. Vérifié sur Chromium, Firefox et WebKit. |

### Recherche et gestionnaires de mots de passe

`Input` transmettait déjà `autocomplete="off"`, `data-bwignore`, `data-1p-ignore`,
`data-lpignore` et `data-form-type="other"`. Le champ de cette liste restait cependant
un champ texte par défaut. Il utilise maintenant `type="search"`, un nom dédié
`directory-search`, ainsi que `autoCapitalize="none"` et `spellCheck={false}`.
Le bouton d'effacement natif WebKit est masqué pour conserver une seule commande
d'effacement accessible, celle de l'application.

Dans le [code officiel de Bitwarden consulté](https://github.com/bitwarden/clients/blob/main/apps/browser/src/autofill/services/collect-autofill-content.service.ts),
`search` figure dans les types ignorés. Le respect de `data-bwignore` dépend également
d'un réglage utilisateur dans la version consultée ; cet attribut seul n'est donc
pas une garantie. L'audit vérifie le type et les attributs dans le DOM et rejoue
la saisie/effacement. Il ne certifie pas le comportement de toutes les versions
et configurations d'extensions ; recharger la page permet de réinitialiser leur analyse.

### Cause du défaut de focus

La classe `focus-visible:ring-[var(--ring-width)]` était ambiguë. Avec la version
de Tailwind installée, elle générait une **couleur** :

```css
--tw-ring-color: var(--ring-width);
```

Elle ne créait donc pas le contour de 3 px attendu. La forme corrigée précise
le type : `focus-visible:ring-[length:var(--ring-width)]`, avec une couleur de
focus explicite `focus-visible:ring-ring`.

**Piège de vérification :** `box-shadow !== 'none'` ne prouve pas qu'un contour
existe. Une valeur peut ne contenir que des ombres transparentes de rayon nul.
Vérifier l'épaisseur, la couleur, la position et le rendu dans le navigateur.

Les trois primitives corrigées sont partagées : le correctif bénéficie à leurs
autres consommateurs. Cela ne signifie pas que les autres pages ont été auditées.

## 5. Données, états métier et accessibilité

| Scénario | Contrôle effectué | Niveau |
| --- | --- | --- |
| Chargement initial | Squelette visible, statut de chargement explicite, pas de zéro présenté comme donnée finale. | V |
| Actualisation | Anciennes données conservées ; après une réponse 503, message explicite sur les dernières données fiables, puis récupération par « Réessayer ». | V sur Chromium, Firefox et WebKit avec réponse réseau simulée après succès. |
| Liste vide | État vide et géométrie contrôlés. | V |
| Recherche sans résultat | Retour aux valeurs initiales proposé. | V dans les vérifications de la liste. |
| Erreur initiale | Message d'erreur, action « Réessayer », retour à la liste après réponse valide. | V |
| 43 comptes | 20 comptes, puis 20, puis 3 ; compteur et désactivation à la dernière page. | V sur réponses simulées. |
| 10 003 comptes | 20 lignes par réponse, accès direct à la page 501 avec 3 lignes, retour à la page 500, nombre de boutons borné, pagination lisible à 320/390/1 024 px. | V sur les trois moteurs avec réponses simulées ; aucun benchmark backend. |
| Recherches concurrentes | La réponse retardée à « Louise » n'écrase pas la recherche plus récente « Camille ». | V sur les trois moteurs ; annulation et protection contre les réponses obsolètes déjà présentes dans le code. |
| Noms et coordonnées longs | Pas de débordement de page ; nom mobile multiligne et métadonnées tronquées si nécessaire. | V ; lire le détail du compte reste nécessaire pour une valeur tronquée. |
| Identité protégée + alerte | Coexistence de la mention et du badge, augmentation de hauteur lorsque nécessaire. | V |
| Informations de sécurité masquées | Résumé et badges retirés lorsque la réponse API masque les détails. | V sur fixtures ; suite serveur `users-access-hardening` exécutée avec dépendances simulées, session réelle restant à valider. |
| Paramètres dans l'URL | Filtres restaurés, compteur cohérent et réinitialisation. | V sur navigation simulée. |
| Statistiques globales | Restent distinctes du nombre de résultats filtrés. | V, C |
| Navigation clavier | Recherche, menu de filtre, cartes, résumé, focus et fermeture par Échap. | V |
| Zoom texte 200 % | Recomposition sans débordement horizontal de la page contrôlée. | V ; pas une couverture de toutes les combinaisons de zoom navigateur. |
| Contraste renforcé | Émulation Chromium : contour de recherche renforcé et palette du menu porté hors de la page vérifiés. | V pour ces éléments ; contrôle système réel et autres composants à compléter. |
| Couleurs forcées | Contour système solide de 2 px mesuré sur recherche et lien de compte au focus. | V en émulation Chromium et Firefox ; session réelle Windows avec couleurs forcées à tester. |
| Lecteurs d'écran | Noms accessibles, tableau natif, boutons et liens examinés. | C et assertions navigateur ; pas de session NVDA/VoiceOver. |

### Contrôles nécessaires avant de conclure sur les performances réelles

Le code limite les comptes retournés avec `take`/`skip` côté serveur et envoie
recherche, filtres et tri à l'API. Les statistiques déclenchent aussi plusieurs
requêtes d'agrégation. Les essais d'interface ne mesurent ni leur coût ni celui
des pages éloignées dans une vraie base.

Dans cet environnement, `E2E_DATABASE_URL`, `E2E_SUPERADMIN_LOGIN_NAME` et
`E2E_SUPERADMIN_PASSWORD` ne sont pas configurés. Le parcours avec authentification
et base réelles n'a donc pas été exécuté. Pour compléter ce passage :

1. Préparer une base de test isolée avec des volumes représentatifs, par exemple
   1 000, 10 000 puis 50 000 comptes, et des profils autorisés, limités et refusés.
2. Mesurer liste initiale, recherche, chaque filtre/tri et dernières pages, à froid
   puis à chaud, avec une concurrence représentative ; relever médiane, p95,
   erreurs, temps des agrégations et plans de requêtes lentes.
3. Fixer le budget de latence selon l'usage attendu, puis corriger les goulots
   observés avant d'ajouter cache, index ou changement de pagination.
4. Rejouer connexion, expiration de session, retrait de permission et parcours
   liste → fiche → retour avec conservation des filtres.

## 6. Grille réutilisable pour une autre page

Copier cette section dans l'audit de la page cible. Pour chaque point, noter
**validé / corrigé / à faire / non applicable**, la largeur, les données utilisées
et une preuve. Une case n'est pas validée parce qu'une classe CSS semble correcte.

### A. But et structure

- [ ] Répondre aux questions de la section 0 pour cette page précise, avant de choisir une composition.
- [ ] Justifier le niveau de présence du hero/en-tête ; ne pas copier systématiquement une carte encadrée.
- [ ] Identifier l'élément qui doit attirer l'œil et vérifier qu'aucun bloc secondaire ne le concurrence.
- [ ] Le rôle de la page et son action principale sont évidents.
- [ ] Le titre, la description, les actions et le fil d'Ariane ne se répètent pas inutilement.
- [ ] Placer l'action au niveau du contenu qu'elle concerne ; une action de liste peut appartenir à sa barre d'outils plutôt qu'au hero.
- [ ] Vérifier qu'un déplacement d'action ne la masque pas pendant le chargement, en erreur ou quand le contenu est vide.
- [ ] La sidebar reste ancrée ; les marges et le centrage sont adaptés au type de contenu.
- [ ] Définir l'axe de centrage : écran entier ou zone disponible ; vérifier sa position réelle, y compris avec sidebar réduite.
- [ ] Un centrage strict ne doit pas imposer les cartes mobiles quand un tableau lisible tient dans la zone utile ; définir la largeur de confort et son adaptation.
- [ ] La largeur principale sert la lecture ; le formulaire ou le texte long ne reprend pas automatiquement la largeur d'un tableau.
- [ ] Les colonnes secondaires ont une utilité et une place clairement définies.
- [ ] Définir l'ancrage d'un rail : bord du contenu ou bord de la zone de travail ; vérifier les grands écrans, sidebar ouverte/repliée et apparition de la scrollbar.
- [ ] L'ancrage du rail ne force pas le contenu principal à s'étirer ou à changer d'axe ; conserver une distance minimale sans chevauchement.
- [ ] Un rail collant reste sous l'en-tête, ne recouvre pas le tableau et reprend un placement normal lorsque l'espace disponible est insuffisant.
- [ ] Les informations secondaires forment un ensemble lisible : une carte discrète peut mieux les regrouper qu'un simple filet isolé.
- [ ] En-têtes, panneaux et listes partagent des alignements stables.

### B. Typographie et rédaction

- [ ] La police réellement chargée correspond à celle du produit, y compris dans les captures.
- [ ] Titres, noms, métadonnées, badges et commandes suivent une hiérarchie de taille et de graisse.
- [ ] Les informations utiles ne sont pas excessivement petites ou trop atténuées.
- [ ] La police monospace est réservée aux contenus qui en bénéficient réellement.
- [ ] Dates, pluriels, libellés de rôle et messages vides sont compréhensibles.
- [ ] Les valeurs longues, absentes, masquées et les grands nombres ont été contrôlés.

### C. Couleurs, surfaces et contours

- [ ] Les couleurs viennent des jetons du design system.
- [ ] La sobriété ne supprime pas les repères utiles : rôles, états et actions restent faciles à distinguer.
- [ ] Chaque couleur ajoutée correspond à une signification ; un rôle privilégié ne doit pas ressembler à une alerte.
- [ ] Vérifier la palette avec une liste plus longue : la répétition des badges ne doit pas prendre le dessus sur l'identité.
- [ ] Distinguer la forme du badge de son remplissage : un fond transparent et un contour fin peuvent conserver le repère sans lui donner trop de poids.
- [ ] Adapter les arrondis à la page et à sa densité ; ne pas reprendre automatiquement les pilules et grandes cartes d'une page de présentation.
- [ ] Retirer les effets décoratifs qui ne clarifient pas l'action, tout en gardant survol et focus perceptibles.
- [ ] Les textes ont un contraste suffisant au repos, au survol et au focus.
- [ ] Un champ est identifiable sur son fond ; un contour de panneau ne ressemble pas à un contrôle.
- [ ] La couleur d'alerte signale une action ou une situation particulière.
- [ ] Badges, états et sélections ne reposent pas uniquement sur la couleur.
- [ ] Arrondis, séparateurs et ombres ont une fonction cohérente.

### D. Chaque composant interactif

- [ ] Inspecter l'état **normal** : texte, icône, contour et zone cliquable.
- [ ] Inspecter le **survol** sur toute la zone réellement activable, sans déplacement de contenu.
- [ ] Atteindre le contrôle par **Tab**, puis contrôler le focus visible et non coupé.
- [ ] Déclencher avec **Entrée/Espace** selon le rôle natif et vérifier le résultat.
- [ ] Contrôler l'état **ouvert/fermé**, **sélectionné** ou **courant** lorsqu'il existe.
- [ ] Tester le contrôle **désactivé** : pas d'action, état compréhensible, comportement clavier correct.
- [ ] Vérifier la fermeture par **Échap** et le retour du focus pour les menus et fenêtres concernés.
- [ ] Contrôler **chargement**, **succès**, **erreur** et **nouvelle tentative** lorsqu'ils existent.

### E. Listes, tableaux et cartes

- [ ] Les données comparables sont alignées sous des en-têtes explicites.
- [ ] La hauteur minimale reste compatible avec le volume attendu.
- [ ] Texte long et badges supplémentaires ne sont pas coupés par une hauteur fixe.
- [ ] Une ligne ou carte cliquable conserve une sémantique de lien native.
- [ ] Il n'existe pas de bouton ou lien interactif imbriqué dans un autre lien de carte.
- [ ] Alternance, survol et focus fonctionnent sur les lignes paires comme impaires.
- [ ] Recherche, filtres, tri et réinitialisation gardent un état compréhensible.
- [ ] Pagination, premier/dernier élément et faible/fort volume ont été contrôlés.

### F. Mobile et préférences utilisateur

- [ ] Tester au moins 320, 390, 768, 1 024, 1 440 et 1 920 px, et de part et d'autre des seuils propres à la page.
- [ ] Tester sidebar ouverte/repliée lorsqu'elle change la largeur réellement disponible.
- [ ] Le contenu prioritaire n'est pas repoussé par des blocs secondaires disproportionnés.
- [ ] Les filtres repliés exposent un compteur ou un résumé si un réglage est actif.
- [ ] Les zones tactiles, le champ de saisie et les menus sont utilisables sur téléphone.
- [ ] Harmoniser la hauteur des commandes qui partagent une barre d'outils, y compris les commandes conditionnelles et les filtres dépliés.
- [ ] Les champs de recherche sont déclarés comme tels et n'appellent pas de suggestions d'identifiants ; contrôler aussi avec l'extension réellement utilisée.
- [ ] Tester le texte agrandi, le zoom navigateur et l'absence de défilement horizontal involontaire.
- [ ] Tester mouvement réduit, contraste renforcé et couleurs forcées.

### G. Données et permissions

- [ ] Tester zéro, un, plusieurs et assez d'éléments pour paginer.
- [ ] Tester des noms, emails et libellés longs, ainsi que des valeurs manquantes.
- [ ] Tester chargement lent, échec initial et échec après une première réponse valide.
- [ ] Une recherche récente garde la priorité sur une réponse plus ancienne et retardée.
- [ ] Avec un grand total, le nombre de lignes rendues et de boutons de pagination reste borné ; vérifier aussi la dernière page et les grands compteurs sur mobile.
- [ ] Distinguer les tests d'interface avec réponses simulées des mesures de performance et de permission sur une base réelle.
- [ ] Les totaux globaux et les résultats filtrés sont explicitement distingués.
- [ ] Tester les profils autorisés, limités et refusés avec les vraies règles serveur avant livraison métier.
- [ ] Les URL de détail et de retour gardent les filtres attendus.

### H. Preuves et clôture

- [ ] Conserver une capture ordinateur, une capture mobile et une capture de focus.
- [ ] Enregistrer les dimensions, données fictives et limites de l'environnement de test.
- [ ] Mesurer les styles calculés ; ne pas se limiter à rechercher une classe dans les sources.
- [ ] Relancer les vérifications de types, le lint et les tests pertinents.
- [ ] Consigner les défauts restants avec priorité, fichier et méthode de reproduction.
- [ ] Ne généraliser les règles communes qu'après contrôle des composants et pages concernés.

## 7. Critères de référence pour la grille

Pour le texte courant, utiliser un contraste d'au moins **4,5:1** ; le texte de
grande taille possède un seuil distinct. Le placeholder est aussi un texte à
contrôler. Source : [W3C — contraste du texte](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Le focus clavier doit être visible. Ici, la convention de produit est de 3 px
sur les contrôles et 2 px à l'intérieur des lignes ; ces dimensions précises sont
un choix de design, pas une citation du critère. Source :
[W3C — focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html).

Les éléments visuels nécessaires à l'identification des contrôles et de leur état
se vérifient avec le contraste non textuel, notamment le seuil **3:1** selon les
conditions du critère. Les séparateurs purement décoratifs ne doivent pas être
confondus avec ces contrôles. Source :
[W3C — contraste non textuel](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Le minimum de cible **24 × 24 CSS px** comporte des exceptions, notamment
d'espacement. Pour les actions mobiles importantes, viser 40–44 px reste ici
une convention de confort. Source :
[W3C — taille minimale des cibles](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Pour Tailwind, préciser le type d'une valeur arbitraire lorsque la variable peut
être interprétée de plusieurs façons. Source consultée via Context7 :
[Tailwind — résolution des valeurs ambiguës](https://tailwindcss.com/docs/adding-custom-styles#resolving-ambiguities).

## 8. Points ouverts et limites de généralisation

| Priorité | Point | Suite recommandée |
| --- | --- | --- |
| P1 | Même syntaxe ambiguë de focus repérée dans `checkbox.tsx`, `switch.tsx`, `textarea.tsx`, `tabs.tsx` et `badge.tsx`. | Examiner les usages interactifs, corriger le type de longueur et vérifier chaque composant dans le navigateur. Ces fichiers n'ont pas été modifiés dans ce passage. |
| P1 | Validation réelle de l'authentification, des permissions, des routes de destination et de l'API. | Configurer la base E2E dédiée et ses identifiants, absents de cet environnement, puis exécuter les parcours réels. La suite serveur avec dépendances simulées passe. |
| P2 | Safari sur macOS/iOS, iOS/Android physiques et lecteurs d'écran. | Chromium, Firefox et WebKit ont passé les scénarios complémentaires sur Windows ; ajouter les essais sur les appareils et outils réels. |
| P2 | Différence visuelle de graisse dans WebKit sous Windows. | Comparer dans Safari réel : Geist est chargée et les graisses calculées sont correctes, mais le rendu de la capture paraît plus léger. Aucune cause ni correction générale n'est déduite de cette seule observation. |
| P2 | Zoom natif du navigateur et préférences système réelles. | Compléter les essais réels ; émulation des couleurs forcées validée sur recherche et lien de compte dans Chromium/Firefox, contraste renforcé testé sur champ et menu dans Chromium. |
| P2 | Transitions réelles de permissions en session et performances backend. | Suivre le protocole ci-dessus ; 10 003 comptes simulés ne constituent pas un benchmark. Échec réseau après succès et réponses de recherche retardées sont désormais vérifiés sur les trois moteurs. |
| P2 | Textes accessibles riches des cartes. | Les liens ont un nom de destination ; contrôler avec un lecteur d'écran l'accès pratique aux métadonnées et aux alertes. |
| P3 | Variantes d'en-tête dans les documents et les autres pages. | La liste utilise un en-tête compact ; réévaluer les autres pages selon leur rôle avant toute harmonisation. |

Ces points sont une liste de suivi, pas des validations implicites. Les règles
spécifiques à une liste administrative — largeur, hauteur de ligne, rail de
statistiques — ne doivent pas être imposées à une page de lecture ou à un formulaire.

## 9. Fichiers et vérifications techniques

Fichiers principaux de la page :

- [`page.tsx`](../../apps/web/src/app/systeme/utilisateurs/page.tsx) : en-tête compact, palette locale et largeur.
- [`UsersListPage.tsx`](../../apps/web/src/features/users/UsersListPage.tsx) : recherche, filtres, tableau, cartes et pagination.
- [`UsersOverview.tsx`](../../apps/web/src/features/users/UsersOverview.tsx) : statistiques et résumé mobile.
- `UsersListLayout.module.css` — chemin historique : `apps/web/src/features/users/UsersListLayout.module.css` : grille locale, largeur de confort de 64 rem dans les limites de la zone utile, plafond de 80 rem, centrage écran et placement indépendant du rail. Calcul CSS à partir du viewport privé, de la zone utile et de l'écran, tenant compte des marges et gouttières de scrollbar ; aucun déplacement de la sidebar ni mesure JavaScript.
- [`page-shell.tsx`](../../apps/web/src/components/ui/page-shell.tsx) et [`globals.css`](../../apps/web/src/app/globals.css) : géométrie et jetons.
- [`button.tsx`](../../apps/web/src/components/ui/button.tsx), [`input.tsx`](../../apps/web/src/components/ui/input.tsx), [`select.tsx`](../../apps/web/src/components/ui/select.tsx) : correction du focus commun.

TypeScript et lint de la page validés après l'ajout de la description courte.
Lors du passage de validation de la disposition : **177 tests existants réussis** dans les suites
`admin-users-list-a11y-contracts`, `design-system-contracts`,
`authenticated-shell-ux-contracts` et `users-access-hardening`. Ces tests ne
remplacent pas les mesures de rendu ni les essais sur une base réelle.

Depuis `apps/web`, les commandes de validation du dépôt sont :

```powershell
bunx tsc --noEmit
bunx eslint src/app/systeme/utilisateurs/page.tsx src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/select.tsx src/features/users/UsersListPage.tsx src/features/users/UsersOverview.tsx src/__tests__/admin-users-list-a11y-contracts.test.ts
bunx vitest run src/__tests__/admin-users-list-a11y-contracts.test.ts src/__tests__/design-system-contracts.test.ts src/__tests__/authenticated-shell-ux-contracts.test.ts src/__tests__/users-access-hardening.test.ts
```

Pour une nouvelle page, reprendre la grille et produire ses propres preuves :
les résultats de cette page ne se transfèrent pas automatiquement avec les composants.
