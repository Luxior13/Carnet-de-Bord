# Comportements d’interface

[Système de design](README.md) · [Composants](composants.md) ·
[Formulaires](../references/formulaires-actions.md) ·
[Accessibilité](../references/accessibilite.md)

Ce fichier décrit les comportements visibles communs. Les contrats serveur
(validation, concurrence, audit) restent dans les [fiches du guide](../REFERENCE_GENERALE.md#2-points-à-examiner) ;
les preuves de chaque comportement sont dans les fiches de page et les audits.

## Focus et états

- L'épaisseur du focus est un jeton : `--ring-width`, appliqué avec
  `ring-[length:var(--ring-width)]`. Préciser `length:` pour que Tailwind
  interprète la variable comme une épaisseur et non comme une couleur ;
  la couleur reste fournie par `ring-ring` ou le token sémantique adapté.
  Exception : `Input`, `Textarea` et `SelectTrigger` par défaut utilisent un
  anneau de 2 px `ring-ring-form` avec une bordure `--primary`
  ([espacements et arrondis](fondations.md#espacements-et-arrondis)).
- Un élément interactif a toujours : `hover`, `focus-visible`, `disabled` et,
  si pertinent, `aria-invalid`.
- Le focus est visible au clavier et masqué à la souris quand le navigateur le
  permet, sans jamais être supprimé.
- Un contour global de secours couvre les liens natifs. Les primitives peuvent
  le remplacer par leur anneau ; `forced-colors` rétablit un contour système.
- Les champs en édition directe utilisent les primitives sans surcharge :
  l'ancienne classe `SectionForm.quietField` a été retirée le 17 octobre 2026,
  car elle ne faisait plus que recopier leurs états.
- `SelectTrigger` conserve l'anneau partagé pendant l'ouverture du menu, même
  quand le focus passe aux options. L'état invalide garde sa teinte d'erreur.
  Les variantes discrètes et les filtres de listes ne doivent pas masquer cet
  état ouvert. Les options utilisent le survol/focus et la sélection des primitives.

## Survol et sélection

- Survol d’une ligne ou d’une option : changement de fond (`surface-row-hover`,
  `surface-tile-hover`) ou de bordure, sans translation ni agrandissement.
- Une ligne sélectionnée garde `surface-selected`, quelle que soit sa parité.
- Une action icône a un nom accessible et, si utile, une infobulle accessible au
  survol et au focus, refermable par Échap (`TooltipContent`).
- Un repère de brouillon (point de la barre de sections) explique son sens en
  infobulle : « Modifications non enregistrées ».

## Listes, recherche et pagination

Références : [liste du Répertoire](../pages/membres/repertoire/liste.md) et
[liste des Utilisateurs](../pages/systeme/utilisateurs/liste.md).

- Recherche large et prioritaire (`ListSearchField`), filtres alignés sur la
  même ligne lorsque la largeur le permet ; effacer rend le focus au champ.
- Recherche côté serveur, bornée en longueur, accents et casse normalisés, mots
  d’identité dans n’importe quel ordre lorsque le module le prend en charge.
- Une recherche locale dans un éditeur (autorisations) suit le même esprit :
  chaque mot tapé doit apparaître, dans n’importe quel ordre ; petits mots
  (« de », « la », « les »…) ignorés ; singulier et pluriel équivalents ;
  libellé, rubrique, description, page et pôle consultés. Jamais une phrase
  exacte (décision du 26 octobre 2026).
- Critères dans l’URL ; un changement de critère repart au début de la liste.
  Les filtres actifs restent visibles : bouton enfoncé pour un filtre rapide,
  valeur affichée pour un menu. La réinitialisation rend le focus à la
  recherche ; un filtre rapide garde le focus sur son bouton.
- Filtres rapides (décision du 20 octobre 2026) : boutons à bascule
  (`aria-pressed`) sous la recherche, à la place d’une carte de synthèse et du
  menu équivalent. Un filtre se combine aux autres critères. Ses compteurs
  sont **à facettes** (décision du 20 octobre 2026) : calculés par le serveur
  dans le périmètre autorisé, avec la recherche et les filtres des autres
  groupes, mais sans celui de leur propre groupe. Ils restent donc toujours
  affichés, égalent le résultat que le filtre montrerait, et la ligne de
  filtres ne se décale pas quand on sélectionne. Avant la première réponse,
  aucun nombre ; le nom accessible du bouton porte ce nombre.
- Plusieurs dimensions : un groupe par dimension, précédé d’un libellé visible
  court (« Statut », « Coordonnées », « État », « Rôle ») pour qu’un « Tous »
  enfoncé ne semble pas contredire un filtre d’un autre groupe. La première
  dimension garde « Tous » et un seul choix ; une dimension secondaire est faite
  d’interrupteurs (un second appui retire le filtre), comme « Sans coordonnées »
  ou les rôles.
- Un filtre rapide enfoncé porte une bordure et un texte d’accent sur un fond
  teinté : les critères actifs se repèrent d’un coup d’œil.
- Pagination à 25 lignes (`PAGINATION.DEFAULT_LIMIT`, partagé client et
  serveur) ; une exception de densité se justifie dans la fiche. Le nombre de
  lignes n’est pas un paramètre système.
- Une réponse obtenue pour d’autres critères n’est jamais affichée sous les
  nouveaux ; attente et erreur ne font pas avancer le numéro de page ; après une
  pagination réussie, défilement et focus reviennent au début des résultats.
- Retour depuis une fiche : un seul instantané de navigation par onglet,
  limité à 30 minutes, lié au compte, aux droits et aux critères ; il restaure
  critères, page, position et lien focalisé, puis s’efface. Aucune copie des lignes.
- Un refus 401/403 retire les lignes, compteurs et dates déjà affichés.

## Saisie, brouillon et enregistrement

- Un formulaire possède sa base enregistrée, son brouillon, sa version de
  concurrence et son verrou synchrone : une seule requête par action.
- Une erreur conserve la saisie et reste affichée près du champ ou du
  formulaire ; un toast ne la remplace jamais.
- Un conflit de version propose une relecture qui conserve les champs modifiés
  localement et reprend les nouvelles valeurs des autres ; écrire demande ensuite
  une nouvelle confirmation.
- Les réponses d’une ancienne cible ou tardives sont ignorées.
- Les réglages globaux sont en saisie directe dans une carte qui regroupe
  portée, champ et aide unique ; la barre n’apparaît qu’avec un brouillon, une
  réparation, une attente, une erreur ou un conflit (refonte des Paramètres du
  14 octobre 2026, qui remplace l’ancien mode « Modifier » à la demande).
- La barre commune est décrite dans [Barre d’enregistrement commune](#barre-denregistrement-commune).

## Navigation protégée et changement de section

- `UnsavedNavigationDialog` protège les liens et les changements de section tant
  qu’un brouillon existe ; « Rester » conserve URL, saisie et défilement.
- `PageSectionNavigation` consulte la garde une seule fois, conserve le mode de
  navigation demandé (remplacement d’URL) et, après acceptation, remet en vue le
  début du nouveau contenu sous la barre en gardant le focus sur le lien activé.
- Montage, retour et avance du navigateur, clics modifiés et section déjà active
  ne déclenchent aucun repositionnement vertical.

## États d'interface

Chaque écran couvre les états pertinents pour ses capacités, avec les composants dédiés :

- chargement initial : `Skeleton` ;
- actualisation : non bloquante ;
- résultat : le contenu ;
- vide : `ContentState` avec l'action qui permet de le remplir ;
- erreur : `ContentState` avec nouvelle tentative ;
- accès refusé : `AccessDeniedState` avec retour ;
- conflit de version : message et rechargement ;
- changement non enregistré : `UnsavedNavigationDialog`.

### Barre d’enregistrement commune

`SectionActionBar` est la référence partagée, issue de la fiche
`/systeme/utilisateurs/[id]`, pour les pages actuelles et futures demandant
Enregistrer/Annuler. Les créations, profils, autorisations et réglages composent
cette barre ; les pieds de modale conservent leur composition adaptée.

- États distincts : formulaire inchangé, brouillon, enregistrement, conflit et
  actualisation de version. Une raison d’indisponibilité reste visible et liée
  au bouton ; actualiser ne signifie pas enregistrer.
- Choisir `onSave` pour un callback ou `saveType="submit"` pour une soumission
  native. `saveForm` associe un formulaire extérieur, par exemple avec un portail.
  L’API exclut le cumul des deux déclenchements.
- Le formulaire garde validation, brouillon, version, permissions et verrou
  synchrone des opérations. Une erreur conserve la saisie ; une actualisation
  de conflit demande une nouvelle confirmation avant écriture. Les réponses
  d’une ancienne cible ne doivent pas remplacer la fiche courante.
- La barre est collante uniquement avec un brouillon et une place suffisante :
  au moins 768 px de largeur et plus de 600 px de hauteur. Sur écran plus étroit
  ou moins haut, elle reste dans le flux pour ne pas masquer les champs.
  `placement="inline"` sert aux réglages locaux ; un formulaire inchangé reste
  également dans le flux. `cancelDisabled={false}` permet de refermer un éditeur
  de réglage ouvert sans modification.
- Une section dont seul un interrupteur s’enregistre (état du compte) n’affiche
  la barre que lorsque la valeur diffère de l’enregistrée.
- Les actions supplémentaires restent contrôlées par leur propriétaire, y
  compris leurs permissions et leur indisponibilité pendant une requête.

`Button loading` fournit l’indicateur d’attente, `aria-busy` et la désactivation
du bouton ordinaire tout en conservant son libellé. Le formulaire fournit le
texte d’attente et protège la requête des doubles appels. Pour une navigation,
`Button asChild` conserve un vrai lien ; `loading` et `disabled` ne sont pas des
props disponibles dans ce mode.

### Attente, résultat incertain et reprise

Une attente doit avoir une issue. Les requêtes interactives bornent aussi la
lecture du corps de réponse ; les actions sensibles actuelles utilisent une
borne de 30 secondes. Un délai dépassé ou une réponse perdue ne prouve pas que
l'écriture a été annulée : afficher un résultat incertain et une vérification
explicite, conserver le brouillon utile, puis libérer les commandes de reprise.
Ne pas relancer automatiquement une mutation. Un avertissement de résultat
incertain reste disponible après changement d'onglet jusqu'à sa résolution.

## Retours immédiats

Le choix entre retour local, toast, notification, alerte et rappel suit la
[politique des retours](../references/feedback.md) et la fiche
[Toasts et retours immédiats](../references/toasts-feedback.md). Un résultat
déjà visible dans la page ne reçoit pas de toast supplémentaire.

Un réglage qui en modifie d’autres (prérequis accordés, dépendants retirés)
le dit sous le réglage touché (« Accordé aussi : … », « Retiré aussi : … »)
avec « Annuler », tant que le brouillon est celui qu’il a produit. Les
réglages modifiés et non enregistrés portent un point ambre, comme leur page
dans la navigation (décision du 26 octobre 2026).

Le résultat d’une action lancée depuis une carte (secret émis, échec à
vérifier, résultat expiré) s’affiche **dans cette carte, à la place de son pied
d’action**, jamais dans un panneau séparé en haut de la section : un encart
d’alerte compact (`rounded-control`, ton d’avertissement), un champ limité à sa
largeur utile, puis un pied de carte avec la confirmation à gauche et l’action
finale à droite. Une copie réussie se lit sur le bouton (« Copié ») ; seul un
échec reste écrit en clair. Référence : mot de passe temporaire de la
[fiche utilisateur](../pages/systeme/utilisateurs/fiche-securite.md) (préférence
du 25 octobre 2026).

## Fenêtres et panneaux

- `Dialog` et `AlertDialog` utilisent `surface-panel`, `border-content` et un
  rayon de 10 px ; leur hauteur est plafonnée et leur contenu défile ; les
  actions longues s’empilent sur mobile ([mouvement et accessibilité](fondations.md#mouvement-et-accessibilité)).
- Le focus revient au déclencheur ou à un élément utile après fermeture, y
  compris pour une ouverture sans `DialogTrigger`.
- Une confirmation se verrouille pendant sa mutation bornée ; une issue
  incertaine peut fermer la fenêtre seulement si la section porte l’explication
  et la relecture.
- Une fenêtre ouverte au-dessus d’une autre laisse une seule zone active.
- Décisions et preuves : [suivi des modales](../pages/transverse/modales.md).

## Lecture seule et droits

- Une commande refusée par les droits disparaît ou explique sa raison ; une
  raison d’indisponibilité est visible et reliée au bouton. Dans une liste de
  réglages, la raison s’affiche sur la ligne, pas seulement au survol ; partagée
  par plusieurs lignes, elle s’affiche une fois en haut et chaque ligne garde
  un cadenas (26 octobre 2026).
- Un état acquis non modifiable (« Fourni par le rôle Administrateur ») est une
  mention avec cadenas, sans commande ni aide d’édition.
- Une donnée masquée est distinguée d’une donnée absente (« Masquée », « Identité protégée »).
- Le compte protégé porte un seul nom visible : « Superadmin » comme étiquette
  ou nom affiché, « superadmin » dans une phrase (« Seul le superadmin peut… ») ;
  « compte racine » reste un terme de documentation technique.
- Une confirmation par mot de passe a la même exigence pour deux suppressions
  irréversibles comparables (compte, fiche du Répertoire).
- Le serveur refuse l’écriture dans tous les cas ; masquer un bouton ne
  remplace jamais le contrôle d’accès.

## Mobile et petites fenêtres

- Cibles tactiles de 44 px sous 640 px ; champs de saisie à 16 px sous 1024 px.
- Sous 740 px de conteneur, le tableau d’une liste devient une liste de cartes
  qui garde les relations libellé/valeur.
- La sidebar devient un volet mobile sous 1024 px.
- Les filtres rapides d’une liste passent à la ligne et prennent 44 px de haut
  sous 640 px ; la réinitialisation masquée n’y réserve plus de place, le tri
  occupe toute la ligne.
- La barre d’enregistrement reste dans le flux en faible largeur ou hauteur.

## Autocomplétion

Décision du propriétaire du 25 octobre 2026 (REV-07), qui remplace la règle
des 10 et 11 octobre : un gestionnaire de mots de passe favorise des mots de
passe longs et uniques, il peut donc remplir **les seuls champs
d'authentification** :

| Champ | Jeton |
| --- | --- |
| Identifiant de connexion | `username` |
| Mot de passe actuel (connexion, confirmations) | `current-password` |
| Nouveau mot de passe et sa confirmation | `new-password` |
| Code à 6 chiffres de l'application | `one-time-code` |

Tout autre champ reste exclu, **codes de secours compris** (usage unique).
`Input` n'accepte que ces jetons ou `off`, vérifiés aussi à l'exécution ;
sans jeton valide, il impose `autoComplete="off"` et les attributs d'exclusion
Bitwarden/1Password/LastPass après les props du parent. `Textarea` et
`CommandInput` restent toujours exclus. Les formulaires gardent
`autoComplete="off"` : le jeton d'un champ l'emporte sur celui du formulaire.
Les jetons ne sont admis que dans les fichiers d'authentification listés par
`autofill-contracts.test.ts` ; toujours aucun champ invisible d'association.
Les listes de choix métier restent utiles.
Ces attributs expriment la politique du site ; une extension peut les ignorer
selon sa version et ses réglages. Ne pas annoncer un blocage garanti sans
essai de l'extension concernée. [Contrôle et limites](../audits/2026-10-11-autocompletion.md).

## Mouvement et préférences système

Transitions de 150 à 200 ms sur couleur, bordure et ombre ;
`prefers-reduced-motion`, `prefers-contrast` et `forced-colors` sont pris en
charge par `globals.css` ([fondations](fondations.md#mouvement-et-accessibilité)).
