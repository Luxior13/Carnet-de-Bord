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
- Critères dans l’URL ; un changement de critère repart au début de la liste.
  Les filtres actifs sont visibles et retirables un par un ; reset et retrait
  rendent le focus à la recherche.
- Les compteurs de la synthèse portent sur le périmètre global autorisé ; un
  compteur cliquable ouvre exactement son sous-ensemble, en effaçant les autres
  filtres et en conservant le tri.
- Pagination à 25 lignes (`PAGINATION.DEFAULT_LIMIT`, partagé client et
  serveur) ; une exception de densité se justifie dans la fiche. Le nombre de
  lignes n’est pas un paramètre système.
- Une réponse obtenue pour d’autres critères n’est jamais affichée sous les
  nouveaux ; attente et erreur ne font pas avancer le numéro de page ; après une
  pagination réussie, défilement et focus reviennent au début des résultats.
- Retour depuis une fiche : un seul instantané de navigation par onglet,
  limité à 30 minutes, lié au compte, aux droits et aux critères ; il restaure
  critères, page, position et lien focalisé, puis s’efface. Aucune copie des lignes.
- Un refus 401/403 retire les lignes, synthèses et dates déjà affichées.

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
  raison d’indisponibilité est visible et reliée au bouton.
- Un état acquis non modifiable (« Fourni par le rôle Administrateur ») est une
  mention avec cadenas, sans commande ni aide d’édition.
- Une donnée masquée est distinguée d’une donnée absente (« Masquée », « Identité protégée »).
- Le serveur refuse l’écriture dans tous les cas ; masquer un bouton ne
  remplace jamais le contrôle d’accès.

## Mobile et petites fenêtres

- Cibles tactiles de 44 px sous 640 px ; champs de saisie à 16 px sous 1024 px.
- Sous 740 px de conteneur, le tableau d’une liste devient une liste de cartes
  qui garde les relations libellé/valeur.
- La sidebar devient un volet mobile sous 1024 px ; le rail de synthèse passe
  au-dessus du contenu sous 118 rem, en version compacte.
- La barre d’enregistrement reste dans le flux en faible largeur ou hauteur.

## Autocomplétion

Autocomplétion du navigateur et des gestionnaires de mots de passe
**désactivée partout, sans exception**, y compris connexion, mots de passe et
MFA (règle du propriétaire du 10 octobre 2026, réaffirmée le 11 octobre).
`Input`, `Textarea` et `CommandInput` imposent `autoComplete="off"` et les
attributs d'exclusion Bitwarden/1Password/LastPass après les props du parent.
Les formulaires portent également `autoComplete="off"`. Aucun opt-in
`allowPasswordManager`, jeton d'autocomplétion positif ou champ invisible
d'association compte/mot de passe. Les listes de choix métier restent utiles.
Ces attributs expriment la politique du site ; une extension peut les ignorer
selon sa version et ses réglages. Ne pas annoncer un blocage garanti sans
essai de l'extension concernée. [Contrôle et limites](../audits/2026-10-11-autocompletion.md).

## Mouvement et préférences système

Transitions de 150 à 200 ms sur couleur, bordure et ombre ;
`prefers-reduced-motion`, `prefers-contrast` et `forced-colors` sont pris en
charge par `globals.css` ([fondations](fondations.md#mouvement-et-accessibilité)).
