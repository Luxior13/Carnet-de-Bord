# Catalogue des composants partagés

Toute page nouvelle ou modifiée réutilise les composants adaptés à sa tâche.
Ce catalogue précise lequel choisir et ce que la page doit encore prendre en
charge. Le [design system](DESIGN_SYSTEM.md) porte les couleurs, dimensions et
états communs ; le [suivi des composants](../qualite/pages/composants-partages.md)
porte les décisions et points ouverts. Les contrôles datés restent dans
[l’audit du 11 octobre 2026](../audits/AUDIT_COMPOSANTS_2026-10-11.md).

La référence de liste est le Répertoire, complétée par Utilisateurs. La référence
des barres d’enregistrement est la fiche `/systeme/utilisateurs/[id]` : toutes
les pages ayant ce besoin utilisent `SectionActionBar`. La présentation est
commune ; le formulaire conserve la validation, les autorisations et les requêtes.

## Cadre et composition des pages

| Besoin | Composant à choisir | Contrat et adaptation |
| --- | --- | --- |
| Largeur, marges, conteneur de page | [PageShell et PageCanvas](../../apps/web/src/components/ui/page-shell.tsx) | Choisir la largeur selon la tâche ; garder le contenu réductible. Ne pas recréer un centrage propre à chaque page. |
| Identité et titre de page | [PageIdentityHero](../../apps/web/src/components/layout/PageIdentityHero.tsx) | En-tête canonique, variante `compact` pour une fiche ou un formulaire. Texte intégral et actions longues peuvent revenir à la ligne. |
| Ancien en-tête compact | [PageHero](../../apps/web/src/components/layout/PageHero.tsx) | Conservé pour ses consommateurs actuels ; une nouvelle composition part de PageIdentityHero. La présence du composant ne justifie pas une seconde variante locale. |
| Contenu avec synthèse secondaire | [PageAsideLayout](../../apps/web/src/components/layout/PageAsideLayout.tsx) | Rail à partir de 118rem ; sinon synthèse entre le bandeau et le contenu. Vérifier l’utilité et la densité de cette synthèse avant de l’ajouter. |
| Fiche avec sections dans l’URL | [EntityDetailLayout](../../apps/web/src/components/layout/EntityDetailLayout.tsx) | Compose identité, navigation et contenu. Les sections, destinations et règles métier appartiennent à la fiche. |
| Section titrée, description et actions locales | [SectionPanel](../../apps/web/src/components/layout/SectionPanel.tsx) | Compose Card ; fournir une hiérarchie de titre et un `titleId` cohérents. Les descriptions longues restent contenues. |
| Surface ou carte sémantique | [Card et ses sous-composants](../../apps/web/src/components/ui/card.tsx) | `as` pour article/section, `asChild` pour une carte-lien. Les séparateurs appartiennent à CardHeader/CardFooter, sans doublon adjacent. |
| Détails secondaires à la demande | [Disclosure](../../apps/web/src/components/layout/Disclosure.tsx) et [Collapsible](../../apps/web/src/components/ui/collapsible.tsx) | Disclosure apporte bouton et chevron ; Collapsible sert aux compositions différentes. Pour des commandes répétées dans des cartes, fournir un `aria-label` qui reprend le libellé visible et précise l'objet concerné. Ne pas y cacher une erreur ou une action indispensable. |
| Séparation simple | [Separator](../../apps/web/src/components/ui/separator.tsx) | Séparer des groupes existants ; ne pas ajouter des cartes et bordures emboîtées pour un simple espacement. |

## Navigation et recherche globale

| Besoin | Source | Comportement à préserver |
| --- | --- | --- |
| Barre de sections avec destinations propres | [PageSectionNavigation](../../apps/web/src/components/layout/PageSectionNavigation.tsx) | Vrais liens, section active, indication du brouillon, défilement et flèches uniquement en cas de débordement. Ombre discrète uniquement en position collée, sans variation de hauteur. La page fournit la garde de navigation. |
| Panneaux locaux alternatifs | [Tabs, TabsList, TabsTrigger, TabsContent](../../apps/web/src/components/ui/tabs.tsx) | Rôles d’onglets et navigation clavier adaptés à des panneaux locaux. Ne pas remplacer les liens de section par des onglets ARIA. Aucun consommateur de page actuel n’en impose l’ajout. |
| Fil d’Ariane | [Breadcrumb](../../apps/web/src/components/ui/breadcrumb.tsx) | Hiérarchie et destinations réelles ; conserver le chemin complet accessible sur petit écran. |
| Navigation principale | [Sidebar](../../apps/web/src/components/Sidebar.tsx), [primitives sidebar](../../apps/web/src/components/ui/sidebar.tsx), [Header](../../apps/web/src/components/layout/Header.tsx) | Réutiliser le cadre existant, sa version mobile, son focus et ses contrôles d’ouverture. La visibilité des liens ne remplace pas les permissions serveur. |
| Changement de pôle | [PoleNavigation](../../apps/web/src/components/layout/PoleNavigation.tsx) | Consomme le catalogue de navigation et ses permissions ; ne pas recopier ses destinations dans les pages. |
| Recherche globale et commandes | [GlobalSearch](../../apps/web/src/components/layout/GlobalSearch.tsx) et [Command](../../apps/web/src/components/ui/command.tsx) | Command fournit les interactions ; le catalogue décide des résultats autorisés et de leur classement. Un filtrage applicatif conserve `shouldFilter={false}` pour éviter un second filtrage. |

Une recherche de liste utilise ListSearchField. Un menu d’actions utilise
DropdownMenu. Le choix dépend de la tâche, même si plusieurs composants
affichent un panneau avec des lignes sélectionnables.

## Listes et pagination

| Besoin | Source | Responsabilité de la page |
| --- | --- | --- |
| Liste de gestion avec outils, tableau et cartes mobiles | [DataTableSection](../../apps/web/src/components/ui/data-table-section.tsx) et [directory.module.css](../../apps/web/src/components/ui/directory.module.css) | Colonnes, légende, cartes mobiles, états, filtres et actions autorisées. Reprendre le socle commun sans imposer les colonnes du Répertoire. |
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
| Valeur parmi des options connues | [Select](../../apps/web/src/components/ui/select.tsx) | Déclencheur et contenu utilisent ensemble `variant="compact"` lorsque la présentation des filtres de référence convient. Préserver focus ouvert, sélection clavier, état invalide et options désactivées. |
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
| Confirmation explicite | [AlertDialog](../../apps/web/src/components/ui/alert-dialog.tsx) | Action et conséquence précises ; issue d’annulation. Pour une requête asynchrone, conserver la fenêtre ouverte après erreur au lieu de la fermer au clic. |
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

## Retours et éléments de lecture

| Besoin | Source | Choix |
| --- | --- | --- |
| Vide, erreur, attente ou avertissement dans le contenu | [ContentState](../../apps/web/src/components/layout/ContentState.tsx) | `kind` et présentation compacte/panneau selon la place ; description et action de reprise utiles. Compose Alert ou Empty. |
| Page entière indisponible ou accès refusé | [PageState et AccessDeniedState](../../apps/web/src/components/layout/PageState.tsx) | Titre de page, explication et retour ; ne pas présenter un refus comme une liste vide. |
| Alerte ou état vide de composition particulière | [Alert](../../apps/web/src/components/ui/alert.tsx), [Empty](../../apps/web/src/components/ui/empty.tsx) | Primitives de ContentState ; préserver les textes longs et choisir les annonces sans répétition excessive. |
| Chargement initial | [Skeleton](../../apps/web/src/components/ui/skeleton.tsx), [PageDetailSkeleton](../../apps/web/src/components/layout/PageDetailSkeleton.tsx) | Structure décorative avec un état de chargement nommé. Ne pas simuler une valeur réelle ; une actualisation peut garder les données déjà affichées. |
| Statut ou métadonnée courte | [Badge](../../apps/web/src/components/ui/badge.tsx) | Texte explicite ; teinte sémantique seulement si elle signifie quelque chose. Ne pas donner l’apparence d’un bouton à une information passive. |
| Image d’identité et repli | [Avatar](../../apps/web/src/components/ui/avatar.tsx), [DiceBearAvatar](../../apps/web/src/components/ui/dicebear-avatar.tsx) | Image locale déterministe pour DiceBear, repli et nom accessibles. Le module fournit identité et couleur métier. |
| Icône de section | [ServiceIcon](../../apps/web/src/components/ui/service-icon.tsx) | Contenant visuel neutre ; rendre l’icône décorative quand le texte donne déjà son sens. |
| Retour immédiat après une commande | [Toaster](../../apps/web/src/components/ui/sonner.tsx) | Appliquer la [politique de feedback](FEEDBACK.md). Un toast ne remplace pas une erreur persistante, une confirmation ou l’audit serveur. |

[ResourceStateBoundary](../../apps/web/src/components/layout/ResourceStateBoundary.tsx)
est disponible mais sans consommateur actuel. Ne pas y transférer automatiquement
les chargements des pages : vérifier d’abord leurs données conservées, erreurs
d’actualisation, permissions et possibilités de reprise.

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
