# Suivi — Composants partagés

## État courant — clôture du socle du 13 octobre 2026

La [revue finale du socle](../../audits/AUDIT_CLOTURE_SOCLE_2026-10-12.md) est
terminée au périmètre livré, pour poursuivre le développement métier. Ses
preuves et limites ne constituent pas une qualification de déploiement.

Les composants utiles aux pages actuelles restent partagés ; aucune variante ou
abstraction universelle n’est ajoutée sans besoin. UI-C10 est réconcilié par les
preuves complémentaires client, SQL et HTTP de la clôture, sans prétendre que
chaque état de chaque consommateur a été parcouru par HTTP. UI-C11 reste ouvert
pour les moteurs et aides techniques non exercés.

Les décisions et preuves datées ci-dessous restent conservées. Une nouvelle
revue répond à un changement, un défaut constaté ou une règle nouvelle.

## Périmètre et décision courante

Décision utilisateur du 11 octobre 2026 : examiner les composants un par un,
réutiliser ceux qui servent les pages actuelles et préparer leur extension sans
multiplier les variantes. La barre de la fiche Utilisateur sert de référence aux
actions d'enregistrement du site.

Le [catalogue](../../references/COMPOSANTS.md) porte le choix des composants ;
le [design system](../../references/DESIGN_SYSTEM.md) porte leurs règles visuelles.
L'[audit du 11 octobre](../../audits/AUDIT_COMPOSANTS_2026-10-11.md) conserve
les constats, scénarios et limites de cette passe.

## Champs — harmonisation du 17 octobre 2026

Demande du propriétaire : retrouver dans Carnet de Bord le rendu des champs
validé sur les fiches Tournois du site Noctambule. La règle durable appartient
au [design system](../../references/DESIGN_SYSTEM.md#4-espacements-et-arrondis).

Livré : police système pour les saisies, labels et menus de formulaire,
rayons de 8 px, hauteurs de 40/44 px et valeurs de 16 px sous 1024 px puis 13 px.
Les champs en édition directe utilisent un fond opaque et le contour commun
de formulaire défini ci-dessous. Dates natives, erreurs, désactivation et focus restent portés par
les primitives. Les sélecteurs de fiche et de coordonnées du Répertoire
utilisent la variante par défaut ; les filtres et recherches des annuaires
conservent leur densité. Les autres tableaux compacts restent adaptés à leur tâche.

Consommateurs repérés : identité/création de personne, coordonnées, profil et
création d’utilisateur, compte, connexion/MFA, paramètres et dialogues partagés.
Vérification navigateur : **12 scénarios client** avec composants réels,
identité fictive et réseau intercepté ; quatre largeurs (320, 390, 768, 1440 px),
portées standard/indigo, saisie de date, sélection au clavier, états erreur et
désactivé, fenêtre mobile et focus en couleurs forcées. Aucun débordement
horizontal ni erreur JavaScript observé dans ce périmètre.

Contrôles du dépôt après application : **59 tests réussis** dans les quatre
suites design system, autocomplétion, sémantique des contrôles et frontières
shadcn ; TypeScript sans émission et lint des sept fichiers TSX modifiés
réussis. Liens documentaires et diff vérifiés.

[Mesures](../../audits/champs-2026-10-17/resultats.json) ·
[Ordinateur](../../audits/champs-2026-10-17/champs-1440.png) ·
[Mobile](../../audits/champs-2026-10-17/champs-390.png) ·
[Fenêtre mobile](../../audits/champs-2026-10-17/champs-dialogue-390.png).
Il s’agit d’un banc de composants et du groupe réel d’identité, avec provenance
masquée : pas de recette HTTP des pages complètes, de sauvegarde réelle,
de Safari/iOS ni de lecteur d’écran. UI-C11 conserve sa portée.

### Contours précisés le 17 octobre 2026

Le propriétaire a relevé un écart avec l’onglet Informations de Noctambule :
la première harmonisation avait conservé le contour #6f86a5 de Carnet de Bord.
Les formulaires reprennent maintenant le contour **#435978 sur 1 px**, le
survol **#5b7699**, le focus **#698cdd** et son anneau de 2 px à 13 %.
La règle appartient au design system ; les variables sont dans globals.css,
utilisées par Input, Textarea et Select par défaut.
Le menu de formulaire reprend lui aussi le contour adouci. Les filtres compacts
et recherches gardent leur présentation dédiée.

Contrôles Chromium avec données fictives et réseau intercepté : **18 cas** sur
les composants, dont le groupe réel d’identité du Répertoire, et **10 cas** sur
UserDetailPage. Largeurs 320, 390, 768 et 1440 px ; styles calculés au repos,
survol et focus, saisie, menu au clavier, erreur, annulation, désactivation,
dialogue mobile, contraste renforcé et couleurs forcées selon les scénarios.
Les mesures confirment les couleurs attendues ; aucune erreur JavaScript ni
débordement horizontal observé. Pas de recette HTTP authentifiée ni de
sauvegarde réelle dans ces bancs.

[Composants](../../audits/champs-2026-10-17/contours-composants.json) ·
[Fiche utilisateur](../../audits/champs-2026-10-17/contours-fiche-utilisateur.json) ·
[Ordinateur](../../audits/champs-2026-10-17/contours-fiche-utilisateur-1440.png) ·
[Mobile](../../audits/champs-2026-10-17/contours-fiche-utilisateur-390.png).
Les premières mesures et captures de cette journée restent la preuve de l’état
précédent ; elles ne représentent plus le contour courant.

### Point commun et vérification du site local

Pour modifier les champs de toutes les pages consommatrices, partir des
primitives [Input](../../../apps/web/src/components/ui/input.tsx),
[Textarea](../../../apps/web/src/components/ui/textarea.tsx),
[Select](../../../apps/web/src/components/ui/select.tsx) et
[Label](../../../apps/web/src/components/ui/label.tsx) dans le dossier components/ui.
Les couleurs et la police commune viennent de
[globals.css](../../../apps/web/src/app/globals.css). Une page compose ces
éléments ; elle ne recopie pas leur présentation. Les adaptations utiles
(filtres compacts, champs numériques composés, codes MFA) restent explicites.

Le 17 octobre 2026, vérification complémentaire sur le **serveur local existant**
(http://localhost:3001/login) : la page de connexion affiche les nouvelles
primitives à 1440 et 390 px, avec les hauteurs, tailles de texte, rayons et police
attendus, sans débordement horizontal. Le changement est donc bien servi par
l’application, au-delà du banc isolé. Aucun identifiant saisi ni formulaire
soumis ; les pages privées et leurs mutations ne sont pas couvertes par ce contrôle.
[Mesures réelles](../../audits/champs-2026-10-17/connexion-live.json) ·
[Ordinateur](../../audits/champs-2026-10-17/connexion-live-1440.png) ·
[Mobile](../../audits/champs-2026-10-17/connexion-live-390.png).

### Reprise de la fiche utilisateur

Le contrôle de connexion ci-dessus ne couvrait pas les styles locaux des pages
privées. Après le signalement du propriétaire, la fiche utilisateur a été
reproduite avec ses vrais composants : les anciens libellés réduits, la police
monospace de saisie de l’identifiant et le rôle compact limitaient l’harmonisation.
Ces adaptations ont été retirées au profit des primitives communes ; les filtres
de permissions conservent leur format compact. Dix cas client isolés réussissent,
dont quatre largeurs et les interactions de formulaire au clavier.
Voir le [suivi de la fiche utilisateur](systeme-utilisateurs.md#fiche--harmonisation-des-champs--17-octobre-2026)
pour les preuves et limites. Les autres pages ne sont pas déclarées vérifiées.

### Corrections après revue de code — 17 octobre 2026

Une revue de code du diff a relevé dix écarts. Corrigés :

- Panneau et options de `Select` par défaut : styles déplacés du module CSS
  (hors couche, prioritaire sur Tailwind) vers des utilitaires. Le `className`
  d'un appelant reprend la main, notamment pour les filtres du Journal.
  Règles du viewport communes aux deux variantes, au lieu de deux copies.
- Taille de saisie : **16 px jusqu'à 1024 px**, 13 px au-delà (et non plus
  dès 640 px), pour éviter le zoom de Safari iOS en paysage et sur tablette.
- `SectionForm.quietField` retiré : il recopiait les états d'Input et les aurait
  écrasés en cas d'évolution. Le module CSS n'avait pas d'autre consommateur.
- Recherche de liste : Geist rendu par `font-sans` dans `ListSearchField`, au
  lieu d'une surcharge CSS de `font-family`.
- Labels réduits et atténués retirés aussi de Mon compte et de la création
  d'utilisateur. Sélecteurs Pays, Réseau et Nouveau principal en pleine largeur.
- Sous-titres de la fiche utilisateur et badge des droits liés au rôle :
  voir le [suivi Utilisateurs](systeme-utilisateurs.md#autorisations--présentation-allégée--17-octobre-2026).
- Design system : focus des champs (§4/§6) et seuil de taille mis en cohérence.

Contrôles : 13 suites de tests liées réussies (138 tests), dont l'assertion
ajoutée sur l'absence de badge pour un droit lié au rôle ; TypeScript, lint des
fichiers modifiés et budget d'architecture réussis. **Pas de nouveau contrôle
navigateur** : les mesures et captures de cette journée précèdent ces corrections.
Rendu à vérifier visuellement (menus de formulaire et filtres du Journal).

## État livré

- `SectionActionBar` commune : création, édition, conflits et réglage inline.
  Soumission native ou callback exclusifs, distinction enregistrement/actualisation,
  explication d'un blocage et conservation des actions contextuelles.
- Sur petit écran ou faible hauteur, la barre reste dans le flux pour laisser
  les champs visibles. Les modales conservent leur pied adapté au dialogue.
- `ListSearchField` et `ListPagination` partagés par les deux annuaires ;
  effacement avec retour du focus, attentes et erreurs cohérentes avec les lignes.
- Primitives : attente des boutons, type explicite pour soumettre, focus commun,
  case à cocher mixte visible, textes longs contenus.
- Le formulaire reste propriétaire de sa validation, de ses droits, de sa version
  serveur et du brouillon. La barre ne lance ni requête ni navigation implicite.
- Les primitives existantes adaptées restent en place. Aucun constructeur
  universel de formulaires ni composant métier rendu artificiellement générique.

## Points ouverts et reprise

Vérification du 11 octobre : 84 scénarios Chromium et 1 084 tests web réussis
(25 ignorés), types/lint, build et budgets réussis. Les scénarios navigateur
utilisent les composants réels avec API/contextes simulés ; les preuves et la
couverture exacte appartiennent à l'audit, sans certification globale du site.

| ID | État et limite | Prochaine vérification | Responsable |
| --- | --- | --- | --- |
| UI-C10 | **Réconcilié le 13 octobre au périmètre livré** : sauvegarde, conflit, révocation et navigation sont éprouvés par des preuves complémentaires client, SQL et HTTP, reliées au rapport de clôture | Lors d'un changement, rejouer les consommateurs touchés ; chaque dialogue et combinaison d'erreur n'est pas déclaré parcouru de bout en bout HTTP | Reprise selon le changement |
| UI-C11 | À vérifier : autres moteurs et lecteur d'écran | Avant qualification accessibilité étendue, vérifier Safari/iOS, annonces, ordre de lecture et zoom réel ; Chromium clavier/tactile ne suffit pas | À attribuer |

UI-C11 reste une limite de qualification, pas un défaut reproduit. Les anciennes
preuves d'intégration gardent leur date ; l'état du 13 octobre et le rapport de
clôture distinguent les contrôles effectivement rejoués des preuves antérieures.

## Pour la prochaine page

Choisir les composants dans le catalogue, vérifier leurs consommateurs, puis
documenter uniquement la composition ou la règle propre à la page. Une nouvelle
variante répond à un besoin observé ; sa vérification couvre au moins l'usage
existant et le nouveau. Les contrôles d'interface n'attestent jamais seuls
l'autorisation serveur.
