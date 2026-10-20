# Catalogue des composants

[Système de design](README.md) · [Fondations](fondations.md) · [Comportements](comportements.md) ·
[Suivi des composants](../pages/transverse/composants-partages.md)

Toute page nouvelle ou modifiée réutilise les composants adaptés à sa tâche.
Ce catalogue précise lequel choisir et ce que la page doit encore prendre en
charge. Les [fondations](fondations.md) portent les couleurs et dimensions, les
[comportements](comportements.md) les états communs ; le
[suivi des composants](../pages/transverse/composants-partages.md) porte les
décisions datées et les points ouverts (UI-Cxx). Sections de cette page :
cadre, navigation, listes, saisie, actions, fenêtres, retours, puis
[règle de réutilisation](#règle-de-réutilisation), [barre de sections](#onglets-et-rails),
[inventaire](#inventaire-des-composants) et [composants à retirer ou à adopter](#à-retirer-ou-à-adopter). Les contrôles datés restent dans
[l’audit du 11 octobre 2026](../audits/2026-10-11-composants.md).

La référence de liste est le Répertoire, complétée par Utilisateurs. La référence
des barres d’enregistrement est la fiche `/systeme/utilisateurs/[id]` : toutes
les pages ayant ce besoin utilisent `SectionActionBar`. La présentation est
commune ; le formulaire conserve la validation, les autorisations et les requêtes.

## Cadre et composition des pages

| Besoin | Composant à choisir | Contrat et adaptation |
| --- | --- | --- |
| Largeur, marges, conteneur de page | [PageShell et PageCanvas](../../apps/web/src/components/ui/page-shell.tsx) | Choisir la largeur selon la tâche ; garder le contenu réductible. Ne pas recréer un centrage propre à chaque page. |
| Identité et titre de page | [PageIdentityHero](../../apps/web/src/components/layout/PageIdentityHero.tsx) | En-tête canonique, variante `compact` pour une fiche ou un formulaire. Texte intégral et actions longues peuvent revenir à la ligne. |
| Contenu avec synthèse secondaire | Aucun composant depuis le 20 octobre 2026 : `PageAsideLayout` est retiré | Rail à partir de 118rem ; sinon synthèse entre le bandeau et le contenu. Vérifier l’utilité et la densité de cette synthèse avant de l’ajouter. Une liste de gestion n’en a pas : ses compteurs sont des filtres rapides (20 octobre 2026). |
| Fiche avec sections dans l’URL | [EntityDetailLayout](../../apps/web/src/components/layout/EntityDetailLayout.tsx) | Compose identité, navigation et contenu. Les sections, destinations et règles métier appartiennent à la fiche. |
| Section d’une fiche | `Card` et `CardContent`, titre `h2` réservé aux lecteurs d’écran, rubriques `FormSectionTitle` ([CreateUserParts](../../apps/web/src/features/users/CreateUserParts.tsx)) | `SectionPanel` et `AccountPanel` sont retirés depuis le 20 octobre 2026 : une section ne répète pas son lien par un titre visible. Une rubrique qui porte des actions (Sécurité) garde sa carte titrée. |
| Surface ou carte sémantique | [Card et ses sous-composants](../../apps/web/src/components/ui/card.tsx) | `as` pour article/section, `asChild` pour une carte-lien. Les séparateurs appartiennent à CardHeader/CardFooter, sans doublon adjacent. |
| Détails secondaires à la demande | [Disclosure](../../apps/web/src/components/layout/Disclosure.tsx) et [Collapsible](../../apps/web/src/components/ui/collapsible.tsx) | Disclosure apporte bouton et chevron ; Collapsible sert aux compositions différentes. Pour des commandes répétées dans des cartes, fournir un `aria-label` qui reprend le libellé visible et précise l'objet concerné. Ne pas y cacher une erreur ou une action indispensable. |
| Séparation simple | [Separator](../../apps/web/src/components/ui/separator.tsx) | Séparer des groupes existants ; ne pas ajouter des cartes et bordures emboîtées pour un simple espacement. |

## Navigation et recherche globale

| Besoin | Source | Comportement à préserver |
| --- | --- | --- |
| Barre de sections avec destinations propres | [PageSectionNavigation](../../apps/web/src/components/layout/PageSectionNavigation.tsx) | Vrais liens, section active, brouillon et défilement horizontal conditionnel. Ombre uniquement en position collée, hauteur stable. Consulte une seule fois les gardes du brouillon avant la navigation ; révèle le début masqué du nouveau contenu après acceptation en conservant le focus au lien. |
| Fil d’Ariane | [Breadcrumb](../../apps/web/src/components/ui/breadcrumb.tsx) | Hiérarchie et destinations réelles ; conserver le chemin complet accessible sur petit écran. |
| Navigation principale | [Sidebar](../../apps/web/src/components/Sidebar.tsx), [primitives sidebar](../../apps/web/src/components/ui/sidebar.tsx), [Header](../../apps/web/src/components/layout/Header.tsx) | Réutiliser le cadre existant, sa version mobile, son focus et ses contrôles d’ouverture. La visibilité des liens ne remplace pas les permissions serveur. |
| Changement de pôle | [PoleNavigation](../../apps/web/src/components/layout/PoleNavigation.tsx) | Consomme le catalogue de navigation et ses permissions ; ne pas recopier ses destinations dans les pages. |
| Recherche globale et commandes | [GlobalSearch](../../apps/web/src/components/layout/GlobalSearch.tsx) et [Command](../../apps/web/src/components/ui/command.tsx) | Command fournit les interactions ; le catalogue décide des résultats autorisés et de leur classement. Un filtrage applicatif conserve `shouldFilter={false}` pour éviter un second filtrage. |

`PageSectionNavigation` reçoit des destinations réelles via `getSectionHref`.
Son callback facultatif `onSectionChange(section, href)` exécute une navigation
déjà acceptée ; le consommateur n'y ouvre pas une deuxième garde. La confirmation
conserve le mode `replace` lorsqu'il est demandé. Montage, historique,
section déjà active et clics modifiés ne demandent aucun repositionnement vertical.
La révélation horizontale au focus reste indépendante de cette remise en vue.

Une recherche de liste utilise ListSearchField. Un menu d’actions utilise
DropdownMenu. Le choix dépend de la tâche, même si plusieurs composants
affichent un panneau avec des lignes sélectionnables.

## Listes et pagination

| Besoin | Source | Responsabilité de la page |
| --- | --- | --- |
| Liste de gestion avec outils, tableau et cartes mobiles | [DataTableSection](../../apps/web/src/components/ui/data-table-section.tsx) et [directory.module.css](../../apps/web/src/components/ui/directory.module.css) | Colonnes, légende, cartes mobiles, états, filtres et actions autorisées. Reprendre le socle commun sans imposer les colonnes du Répertoire. |
| Filtres rapides avec compteurs | [QuickFilterGroup et QuickFilter](../../apps/web/src/components/ui/quick-filter.tsx), classes `filterBar`, `quickFilterSets`, `quickFilters`, `quickFilter` de `directory.module.css` | Un groupe par dimension (`role="group"`, `label` pour les technologies d’assistance) avec son libellé visible `caption` ; boutons `aria-pressed`. La page fournit le compteur seulement s’il égale le résultat, et le nom du dénombré (« fiche », « compte ») pour le nom accessible. Plusieurs groupes vont dans `quickFilterSets`, séparés par leur libellé et un écart de 20 px. Consommateurs : Répertoire, Utilisateurs. |
| Structure HTML du tableau | [Table et sous-composants](../../apps/web/src/components/ui/table.tsx) | Donner une légende et des en-têtes utiles ; préserver les relations entre libellés et valeurs lors du passage en cartes. |
| Recherche dans une liste | [ListSearchField](../../apps/web/src/components/ui/list-search-field.tsx) | Fournir libellé accessible, limite de saisie, valeur et callbacks. Un `id` explicite permet d'associer un label visible ; sinon l'identifiant est généré. Le groupe parent doit porter la portée CSS `directoryStyles.directory`, requise par le module partagé. Le délai avant requête, l’URL et la remise à zéro des critères restent au module. Effacer rend le focus au champ. |
| Précédent et suivant, avec curseur ou numéro de page | [ListPagination](../../apps/web/src/components/ui/pagination.tsx) | Fournir `canPrevious`, `canNext`, page et total de pages seulement s’il est connu. Gérer chargement, curseurs et retour vers une page accessible ; la primitive ne les invente pas. |
| Accès direct à des pages numérotées connues | [Pagination](../../apps/web/src/components/ui/pagination.tsx) | Fournir des bornes et totaux fiables. Conserver cette variante uniquement lorsque le contrat permet effectivement le saut de page. |

Les listes Répertoire et Utilisateurs partagent recherche et pagination.
Leurs contrats de requête restent distincts. Un total, une recherche serveur,
une sélection multiple ou une virtualisation se justifient par un besoin réel,
pas par la création du composant partagé. DataTableEmptyState reste une
composition simple disponible dans DataTableSection ; ContentState convient
aux états nécessitant description, erreur ou reprise.

## Saisie et sélection

| Besoin | Source | Choix et comportement |
| --- | --- | --- |
| Texte, email, mot de passe, date ou nombre saisi | [Input](../../apps/web/src/components/ui/input.tsx) | Garder le type natif adapté, les bornes utiles et la saisie directe. Le module valide la valeur ; des boutons numériques supplémentaires ne sont pas systématiques. |
| Texte sur plusieurs lignes | [Textarea](../../apps/web/src/components/ui/textarea.tsx) | Conserver saisie, sélection, collage et redimensionnement. Ne pas réimplémenter le champ dans chaque éditeur. |
| Nom du champ | [Label](../../apps/web/src/components/ui/label.tsx) | Associer `htmlFor` et `id`. Relier aide et erreur existantes avec `aria-describedby`, signaler l’erreur avec `aria-invalid`. |
| Valeur parmi des options connues | [Select](../../apps/web/src/components/ui/select.tsx) | Variante par défaut pour les formulaires, alignée sur Input ; déclencheur et contenu utilisent ensemble `variant="compact"` pour les filtres et tableaux denses. Préserver focus ouvert, sélection clavier, état invalide et options désactivées. |
| Choix indépendant ou sélection de plusieurs éléments | [Checkbox](../../apps/web/src/components/ui/checkbox.tsx) | État coché, décoché ou indéterminé avec indicateurs distincts. Libellé et zone tactile associés ; le contrôle ne déclenche pas implicitement une mutation serveur. |
| Option binaire d’activation | [Switch](../../apps/web/src/components/ui/switch.tsx) | Donner un libellé stable et expliquer si le choix est appliqué immédiatement ou attend l’enregistrement du formulaire. |
| Saisie de la palette de commandes | [CommandInput](../../apps/web/src/components/ui/command.tsx) | Réservée à Command ; les actions annexes ne doivent pas sélectionner un résultat par propagation de touche. |

Input, Textarea et CommandInput imposent la politique commune sans
autocomplétion ; le formulaire porte aussi `autoComplete="off"`. Les indications
d’exclusion des gestionnaires ne garantissent pas qu’une extension les respecte.
Les choix métier d’un Select restent disponibles.

Ne pas ajouter une enveloppe universelle de champ avant un besoin répété : un
label, le contrôle, une aide et une erreur explicitement associés restent une
composition lisible. Les groupes métier tels que PersonIdentityFields peuvent
être partagés dans leur module sans transférer leurs règles à la primitive.

## Actions et enregistrement

[Button](../../apps/web/src/components/ui/button.tsx) représente une action ;
`Button asChild` habille un vrai lien pour une navigation. Le bouton ordinaire
utilise `type="button"` par défaut : préciser `type="submit"` pour soumettre.
`loading` affiche un indicateur décoratif, marque l’attente et désactive le bouton
en conservant son libellé. La page fournit un texte approprié et le verrou
synchrone de la requête. `loading` et `disabled` ne s’appliquent pas à `asChild` :
un lien temporairement indisponible demande une sémantique et une garde adaptées.

[SectionActionBar](../../apps/web/src/components/layout/SectionActionBar.tsx)
est la barre commune des fiches, créations et réglages qui demandent
Enregistrer/Annuler. Son [module CSS](../../apps/web/src/components/layout/SectionActionBar.module.css)
porte la composition et l’adaptation à l’espace disponible.

| Situation | Contrat commun |
| --- | --- |
| Formulaire inchangé | `hasChanges={false}` : enregistrement inactif et barre dans le flux ; le module peut aussi masquer la barre. |
| Brouillon modifié | Message de modifications non enregistrées, Annuler et Enregistrer. Une éventuelle confirmation d’abandon reste au formulaire. |
| Écriture ou actualisation en cours | `isSaving` et `isResolvingConflict` sont distincts ; contrôles concurrents indisponibles, libellé décrivant l’opération réelle. |
| Conflit de version | `conflict` bloque l’écriture ; `onResolveConflict` propose la reprise lorsqu’elle appartient à la barre. Le formulaire conserve le brouillon et attend une nouvelle confirmation pour écrire. |
| Enregistrement indisponible | `saveDisabled` et `saveDisabledReason` expliquent la cause sans l’assimiler à un conflit. Les erreurs restent persistantes près du formulaire. |
| Réglage ouvert mais inchangé | `placement="inline"` et `cancelDisabled={false}` permettent de refermer l’éditeur sans inventer une modification. |

Choisir un seul déclenchement : `onSave` pour une action portée par callback,
ou `saveType="submit"` pour le formulaire natif. `saveForm` relie le bouton à
un formulaire placé hors de la barre, notamment lors d’un portail. L’API exclut
le cumul callback et soumission native. `extraActions` permet une action locale
justifiée ; le module garde ses permissions et sa désactivation pendant l’attente.

La barre peut être collante lorsqu’il reste un brouillon, à partir de 768 px et
avec une hauteur de fenêtre supérieure à 600 px. Elle reste dans le flux sur
petit écran, faible hauteur, formulaire inchangé ou `placement="inline"`.
Conserver les champs visibles prime sur le maintien permanent des actions à
l’écran. Une modale conserve son pied de fenêtre adapté à son parcours.

Pour une barre portée par la page, la placer après l'ensemble du contenu
éditable, hors des cartes internes : son parent doit couvrir tout le parcours
de défilement. Retirer `placement="inline"` ne suffit pas si une carte courte
ou un ancêtre avec débordement masqué limite encore son déplacement.

Le formulaire possède la base enregistrée, le brouillon et la version de
concurrence. Il bloque les doubles requêtes, traite leurs erreurs, ignore les
réponses tardives d’une ancienne cible et choisit le focus après succès,
erreur ou annulation. La barre ne devient pas un moteur de formulaires.

## Fenêtres et panneaux

| Besoin | Source | Contrat à préserver |
| --- | --- | --- |
| Édition ou tâche dans une fenêtre | [Dialog](../../apps/web/src/components/ui/dialog.tsx) | Titre, description utile, contenu défilable et fermeture compréhensible. La page décide si l’attente ou un brouillon demandent une garde. |
| Confirmation explicite | [AlertDialog](../../apps/web/src/components/ui/alert-dialog.tsx) | Action et conséquence précises ; issue d’annulation et verrou pendant une mutation bornée. Garder la fenêtre si l'erreur s'y corrige. Une issue incertaine peut fermer la fenêtre lorsque la section porte l'explication persistante et la relecture, avec un retour de focus utile ; ne pas fermer simplement au clic. |
| Preuve récente avant une action administrative | [AdminStepUpDialog](../../apps/web/src/components/users/user-detail/AdminStepUpDialog.tsx) | Mot de passe et/ou code MFA selon la preuve demandée par le serveur ; requête bornée à 30 secondes, verrou synchrone et reprise explicite. Le consommateur reste propriétaire de l'action autorisée après la preuve. |
| Volet latéral ou navigation mobile | [Sheet](../../apps/web/src/components/ui/sheet.tsx) | Défilement, nom accessible, confinement et retour du focus. La sidebar conserve son retour conditionné au changement d’URL. |
| Petit panneau contextuel interactif | [Popover](../../apps/web/src/components/ui/popover.tsx) | Contenu borné par l’écran et texte long contenu. Préférer Dialog si la tâche nécessite une vraie fenêtre. |
| Actions ou navigation contextuelles | [DropdownMenu](../../apps/web/src/components/ui/dropdown-menu.tsx) | Navigation clavier, sélection, fermeture et éléments indisponibles ; ne pas s’en servir comme champ Select. |
| Explication courte non indispensable | [Tooltip](../../apps/web/src/components/ui/tooltip.tsx) | Survol et focus, fermeture par Échap ; ne pas y placer une action ou l’unique explication d’une erreur. |
| Départ avec brouillon | [UnsavedNavigationDialog](../../apps/web/src/components/layout/UnsavedNavigationDialog.tsx) | Consommer la garde de navigation de la page ; distinguer abandon local, changement de section et départ. |
| Suppression définitive d’une fiche | [EntityDangerZone](../../apps/web/src/components/layout/EntityDangerZone.tsx) | Description métier, confirmation, verrou d’opération, erreur et conflit. Actualiser n’effectue jamais la suppression. |

Le mécanisme [modal-focus](../../apps/web/src/components/ui/modal-focus.tsx)
est interne aux fenêtres et confirmations. Réutiliser leur restitution de
focus, y compris pour une ouverture contrôlée sans Trigger. Un remplacement
local doit servir un parcours concret : changement de page, déclencheur supprimé
ou passage à une autre fenêtre. Aucun système global supplémentaire n’est requis.

Le helper [securityRequest](../../apps/web/src/shared/utils/security-request.utils.ts)
borne la réponse et son corps à 30 secondes, en conservant le signal de durée
de vie du consommateur. Il est partagé par les sessions de Mon compte, les
sessions administratives et AdminStepUpDialog ; il ne remplace pas toutes les
requêtes du site. Son abandon ne prouve pas l'annulation serveur : le module
explique l'incertitude et choisit la relecture, sans rejeu automatique de mutation.

## Retours et éléments de lecture

| Besoin | Source | Choix |
| --- | --- | --- |
| Vide, erreur, attente ou avertissement dans le contenu | [ContentState](../../apps/web/src/components/layout/ContentState.tsx) | `kind` et présentation compacte/panneau selon la place ; description et action de reprise utiles. Compose Alert ou Empty. |
| Page entière indisponible ou accès refusé | [PageState et AccessDeniedState](../../apps/web/src/components/layout/PageState.tsx) | Titre de page, explication et retour ; ne pas présenter un refus comme une liste vide. |
| Erreur imprévue de rendu ou de cadre racine | [RouteErrorState](../../apps/web/src/components/layout/RouteErrorState.tsx) | Partagé par `error.tsx` et `global-error.tsx`, sans dépendance au routeur ou aux providers. Message générique, digest facultatif, titre focalisé, rechargement GET complet verrouillé dès l'activation et lien accueil natif. `standalone` rend le repère `main` lorsqu'aucun cadre privé ne le fournit. |
| Alerte ou état vide de composition particulière | [Alert](../../apps/web/src/components/ui/alert.tsx), [Empty](../../apps/web/src/components/ui/empty.tsx) | Primitives de ContentState ; préserver les textes longs et choisir les annonces sans répétition excessive. |
| Chargement initial | [Skeleton](../../apps/web/src/components/ui/skeleton.tsx), [PageDetailSkeleton](../../apps/web/src/components/layout/PageDetailSkeleton.tsx) | Structure décorative avec un état de chargement nommé ; le chargement de route global ajoute un texte destiné aux technologies d'assistance. Ne pas simuler une valeur réelle ; une actualisation peut garder les données déjà affichées. |
| Statut d’un objet, pastille à point | [StatusBadge](../../apps/web/src/components/ui/status-badge.tsx) | Choisir le ton selon le sens : `muted` pour une catégorie neutre, couleurs d’état seulement pour ce qui demande attention. Le libellé reste explicite ; ne pas recopier la classe. |
| Statut ou métadonnée courte | [Badge](../../apps/web/src/components/ui/badge.tsx) | Texte explicite ; teinte sémantique seulement si elle signifie quelque chose. Ne pas donner l’apparence d’un bouton à une information passive. |
| Image d’identité et repli | [Avatar](../../apps/web/src/components/ui/avatar.tsx), [DiceBearAvatar](../../apps/web/src/components/ui/dicebear-avatar.tsx) | Image locale déterministe pour DiceBear, repli et nom accessibles. Le module fournit identité et couleur métier. |
| Icône de section | [ServiceIcon](../../apps/web/src/components/ui/service-icon.tsx) | Contenant visuel neutre ; rendre l’icône décorative quand le texte donne déjà son sens. |
| Retour immédiat après une commande | [Toaster](../../apps/web/src/components/ui/sonner.tsx) | Appliquer la [politique de feedback](../references/feedback.md). Un toast ne remplace pas une erreur persistante, une confirmation ou l’audit serveur. |

`RouteErrorState` répond à une rupture de rendu : il recharge explicitement le
document et ne connaît ni les brouillons ni le résultat d'une mutation métier.
Une erreur attendue d'API reste dans son module avec `ContentState`, `PageState`
ou un retour de formulaire adapté. Ne pas remplacer une reprise locale qui
préserve la saisie par un rechargement global. Contrat et limites dans le
[suivi des états techniques](../pages/transverse/etats-techniques.md).
Le document autonome de `global-error` fournit lui-même langue, styles, polices
et meta viewport : il ne doit pas les supposer hérités du layout qui a échoué.

## Avant un nouveau composant

1. Quelle tâche concrète et quels consommateurs réels justifient l’ajout ?
2. Une primitive, une variante ou une composition de ce catalogue suffit-elle ?
3. Où vivent valeur, brouillon, requête, permission et erreur ? Le partage retire-t-il
   une duplication sans cacher une règle métier ?
4. Quels états sont nécessaires : vide, attente, conflit, indisponibilité,
   désactivation et réponse tardive ? Quelle reprise est possible ?
5. Que deviennent clavier, focus, noms longs, écran étroit, faible hauteur,
   mouvement réduit et couleurs forcées ?
6. Quelle modification touche les autres consommateurs ? Quels scénarios doivent
   être rejoués dans les composants réels ?
7. Quel fichier porte la décision et ses limites de validation ?

Ajouter une primitive dans `components/ui`, une composition transverse dans
`components/layout`, et une règle métier dans son module. Ne pas créer de
bibliothèque de champs, de moteur de tableau, de formulaire dynamique ou de
sélecteur avancé pour des besoins seulement envisagés. Les variantes partagées
sont nommées et utiles ; les paramètres métier restent explicitement fournis
par leurs propriétaires.

## Règle de réutilisation

Toute page nouvelle ou modifiée choisit les composants de référence utiles à
sa tâche : `PageIdentityHero`, `DataTableSection` + `directory.module.css` pour
les listes, `QuickFilter` pour leurs compteurs, `StatusBadge` pour les
états (y compris dans le bandeau d’une fiche), `TooltipContent` et les primitives `Input`, `Select`, `Button`, `Badge`, `Card`.
[globals.css](../../apps/web/src/app/globals.css) reste la source unique des
tokens ; aucune palette copiée dans un composant.

Le [catalogue des composants](composants.md) précise les choix par usage,
les comportements partagés et les responsabilités qui restent aux pages.

| Besoin | Source à réutiliser |
| --- | --- |
| Cadre, largeur et marges | [PageShell et PageCanvas](../../apps/web/src/components/ui/page-shell.tsx) |
| Bandeau d'identité, variante compacte | [PageIdentityHero](../../apps/web/src/components/layout/PageIdentityHero.tsx) et [son module](../../apps/web/src/components/layout/PageIdentityHero.module.css) |
| Tableau, cartes mobiles, outils et pagination | [DataTableSection](../../apps/web/src/components/ui/data-table-section.tsx) et [directory.module.css](../../apps/web/src/components/ui/directory.module.css) |
| Recherche de liste et effacement avec retour du focus | [ListSearchField](../../apps/web/src/components/ui/list-search-field.tsx) |
| Précédent/suivant d’une liste, avec total lorsqu’il est connu | [ListPagination](../../apps/web/src/components/ui/pagination.tsx) |
| Actions d’enregistrement et d’annulation | [SectionActionBar](../../apps/web/src/components/layout/SectionActionBar.tsx) et [son module](../../apps/web/src/components/layout/SectionActionBar.module.css) |
| États d’une fiche dans le bandeau | `meta` de [PageIdentityHero](../../apps/web/src/components/layout/PageIdentityHero.tsx), par exemple [UserIdentityStatus](../../apps/web/src/components/users/UserIdentityStatus.tsx) |
| Navigation entre les sections d'une fiche | [PageSectionNavigation](../../apps/web/src/components/layout/PageSectionNavigation.tsx) |
| Infobulle, survol et focus | [TooltipContent](../../apps/web/src/components/ui/tooltip.tsx) |
| Vide, erreur et accès refusé | [ContentState](../../apps/web/src/components/layout/ContentState.tsx) et [PageState](../../apps/web/src/components/layout/PageState.tsx) |

Une fiche conserve une identité compacte et des sections de lecture ; un
formulaire groupe ses champs et ses validations ; un tableau de bord organise
ses synthèses selon les décisions à prendre. Tous partagent ce langage visuel.
Les filtres « statut de structure » et « sans coordonnées », les requêtes et les
permissions du répertoire restent des règles de son module. Les comportements
de recherche, de compteur et de retour de fiche se qualifient pour chaque besoin.

À migrer quand les pages concernées sont retouchées : les
styles locaux qui dupliquent les composants partagés. Un module CSS de
composition métier, utilisant les tokens communs, reste légitime. L'accueil, Mon compte,
la fiche utilisateur, la création de compte et la création de fiche personne
utilisent déjà `PageIdentityHero`. La fiche personne le compose en variante
compacte via `EntityDetailLayout` depuis la revue du 12 octobre 2026 ;
`UsersAdminHero` a été retiré.
Les routes canoniques sont `/membres/repertoire` et `/systeme/utilisateurs` ;
ne plus créer de lien vers les anciens alias (`/personnes`,
`/vie-interne/*`, `/administration/*`).

Les mêmes jetons produisent une famille visuelle commune ; la densité et la
structure restent adaptées au contenu de chaque écran.

## Onglets et rails

- **Navigation entre sections** : toute barre horizontale de navigation entre
  sections disposant de leur propre URL utilise `PageSectionNavigation`,
  directement ou via `EntityDetailLayout`, sur les pages actuelles et futures
  du site. Les pages fournissent leurs libellés, icônes, destinations, état actif
  et gardes de navigation ; le style, le défilement et les interactions communs
  restent dans ce composant. Ne pas recopier la barre ou ses styles dans une page.
  Toute adaptation nécessaire se compose avec le composant partagé ; un besoin
  incompatible est expliqué dans le suivi de la page.
  La barre regroupe de vrais liens, chacun avec son URL, et reste accessible quand elle
  déborde ; la section active est rendue visible sans déplacer le formulaire.
  La section active associe fond `surface-navigation-active`, soulignement
  `primary` et icône `primary-emphasis`. Les liens gardent une hauteur minimale
  de 48 px et des angles supérieurs de 6 px, y compris au survol.
  Quand la barre s'accroche en haut du conteneur défilant, son fond reste opaque
  et une ombre inférieure discrète la sépare du contenu. Hauteur et espacement
  restent stables ; aucune bordure haute n'est ajoutée sous le header. L'ombre
  disparaît au retour à sa position normale ; sa transition respecte le mouvement réduit.
  Les deux flèches apparaissent seulement si les libellés dépassent la largeur
  de la barre ; elles deviennent inactives à leur extrémité sans perdre le focus.
  Le défilement horizontal natif reste disponible. Le focus révèle le lien visé,
  le mouvement réduit désactive l'animation, et la disparition des flèches au
  redimensionnement rend le focus à la section active si nécessaire.
  Le point de brouillon conserve son texte accessible et affiche l'infobulle
  « Modifications non enregistrées » au survol ou au focus, refermable par Échap.
  Lors d'un changement explicite vers une autre section, la garde est consultée
  une seule fois. Après acceptation, le début du nouveau contenu est remis en
  vue sous la barre s'il était masqué et le focus reste au lien activé. Cette
  commande du composant ne remonte pas systématiquement au bandeau d'identité ;
  elle ne promet pas d'annuler toute restauration de scroll native du routeur.
  « Rester » conserve URL, saisie et défilement. Le montage, Back/Forward,
  l'activation de la section courante, les clics modifiés et la simple révélation
  horizontale d'un lien ne déclenchent pas cette commande verticale.
  La confirmation conserve le mode de navigation choisi par la page, notamment
  le remplacement d'URL des trois consommateurs actuels.
  Consommateurs actuels : Mon compte et les fiches Utilisateur/Répertoire.
- **Onglets de contenu** : aucun aujourd’hui. Si des panneaux locaux
  alternatifs d’un même objet deviennent utiles, réinstaller la primitive
  shadcn `Tabs` (retirée le 20 octobre 2026 faute de consommateur), avec le
  comportement clavier et les rôles ARIA correspondants. Les filtres, la pagination, le fil d'Ariane et les menus de navigation
  conservent leurs composants adaptés à leur fonction.
- Les onglets ne remplacent pas les filtres : un onglet est un lieu, un filtre
  est une requête.
- **Rail de synthèse** : retiré le 20 octobre 2026 avec `PageAsideLayout`,
  son dernier consommateur étant devenu sans objet (listes : filtres rapides ;
  fiches : états dans le bandeau). Les seuils de 104 et 118 rem des anciens
  audits restent historiques.

## Inventaire des composants

Le [catalogue des composants partagés](composants.md) est la référence de choix
et de comportement, reliée aux sources et au suivi transverse. Cet inventaire
résume leur organisation.

`components/ui` : bouton, badge, carte, champ, étiquette, case à cocher,
sélecteur, interrupteur, onglets, table, pagination, boîte de dialogue, popover,
tooltip, séparateur, squelette, sidebar, avatar, commande, alerte et état vide.

Les primitives shadcn sont du code source local, adapté aux jetons du site.
`Command` s'appuie sur cmdk ; `Avatar` et les contrôles interactifs concernés
s'appuient sur Radix. Les compositions métier utilisent ces primitives :
`ContentState` compose `Alert` ou `Empty`, `Disclosure` compose `Collapsible`
et `Button`, les avatars DiceBear composent `Avatar`. `Card` accepte `as` pour
conserver un article ou une section, et `asChild` pour une carte-lien.

La recherche rapide délègue ses interactions clavier à `Command`. Le classement
et les permissions restent dans le catalogue applicatif, avec
`shouldFilter={false}` pour éviter un second filtrage divergent.
Les boutons inclus dans cette palette isolent leurs touches de celles de la
liste : Entrée sur Effacer ou Fermer ne doit pas
ouvrir aussi le résultat sélectionné. Le style sobre de la recherche reste local ;
`DialogContent.overlayClassName` permet d’adapter son voile sans modifier les
autres fenêtres.

La navigation entre sections utilise `PageSectionNavigation`. Une action de
navigation présentée comme un bouton utilise `Button asChild` avec un lien.
Ces liens ne sont pas transformés en onglets ARIA : chaque section possède une URL.

`components/layout` : en-tête, héro, état de contenu, état de page, panneau de
section, retour contextuel, mise en page de fiche, zone de danger, recherche
globale.

`components/users` : fiche utilisateur et éditeur d'autorisations ;
`features/users` : liste des comptes et ses composants métier.

Tout nouveau composant part dans `components/ui` s'il est générique, sinon dans
le module qui l'utilise.

## À retirer ou à adopter

Aucun composant sans consommateur au 20 octobre 2026 (recherche des imports
statiques et dynamiques dans `apps/web/src`, tests exclus). Un composant qui
perd son dernier consommateur est retiré dans le même travail ou inscrit ici
avec sa raison.

Retirés le 20 octobre 2026 (constats [SYS-01 à SYS-03](../systeme/constats.md)),
récupérables dans l’historique Git si un besoin réel réapparaît :

| Composant | Raison du retrait |
| --- | --- |
| `PageHero` | Ancien en-tête compact ; son seul consommateur était la page non branchée de l’actualité interne |
| `Tabs` et la dépendance `@radix-ui/react-tabs` | Primitive d’onglets ARIA sans consommateur ; les sections à URL utilisent `PageSectionNavigation`. Se réinstalle avec shadcn si des panneaux locaux deviennent utiles |
| `ResourceStateBoundary` | Aucun consommateur ; les pages composent `ContentState` et `PageState` selon leurs données |
| Composants de `features/internal-news/components` | Page, fil, carte et fenêtre de publication de l’actualité interne (`planned`), jamais branchés |
| `UserHistoryTab` et `useUserDetailAudit` | Section Activité de la fiche utilisateur retirée depuis le 10 octobre 2026, jamais atteinte |
