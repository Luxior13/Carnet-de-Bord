# Audit UX/UI du 24 septembre 2026 — page par page

> Rapport historique : résultats valables pour la passe décrite, non rejoués par
> la correction documentaire. Voir [l’index](README.md) et les [suivis courants](../qualite/pages/README.md).
> Les chemins indiqués comme historiques peuvent désigner des fichiers retirés.

## Suivi des corrections — 24 septembre 2026

Les huit corrections D01–D08 sont implémentées et vérifiées. Les constats page par page ci-dessous décrivent l’état observé **avant** ce passage de correction ; les propositions d’allègement visuel restent distinctes de ces huit défauts.

| ID | Changement effectué |
| --- | --- |
| D01 | `/systeme` redirige vers la première page Système autorisée pour le compte ; un visiteur non connecté est envoyé à la connexion. Le breadcrumb et le retour du journal ont ainsi une destination réelle. |
| D02 | La création utilisateur utilise la garde commune de navigation : liens, retour navigateur et fermeture/rechargement. Une saisie redevenue vide ou un compte créé ne déclenche plus de confirmation. |
| D03 | Fermer une publication modifiée demande de confirmer son abandon ; « Continuer la rédaction » conserve la saisie. Les champs obligatoires sont indiqués et les contrôles sont désactivés pendant l’envoi. |
| D04 | Fermer le menu mobile rend le focus à son bouton d’ouverture si l’adresse n’a pas changé. Une navigation vers une autre page conserve son propre déplacement du focus. |
| D05 | Les deux catégories d’autorisations s’empilent dans un espace étroit et leurs libellés peuvent revenir à la ligne. |
| D06 | Le bouton de récupération MFA prend la largeur disponible sur mobile, avec hauteur automatique et texte multiligne. |
| D07 | Les contrôles inconnus ou transitoirement échoués conservent le dernier état confirmé. Un état initial inconnu garde les destinations accessibles dans les menus, mais présente un réessai sur une page sans données confirmées. Seule une indisponibilité explicite masque la destination. Le contrôle dépend de l’identité du compte et ne lance pas de requêtes concurrentes ; les API gardent leurs contrôles d’accès. |
| D08 | L’état vide global du fil apparaît uniquement si les annonces épinglées et le fil courant sont tous deux vides. |

La vérification du bouton Retour a révélé un défaut supplémentaire dans la garde commune : son écouteur s’installait trop tard pour empêcher le routeur de retirer le formulaire. L’interception est maintenant installée avant l’hydratation, dans `src/instrumentation-client.ts`, et les formulaires s’y abonnent lorsqu’ils ont une saisie à protéger. Les parcours Précédent, Suivant, annulation et abandon ont été rejoués dans Chromium ; la création de personne et les paramètres ont aussi été contrôlés avec cette garde partagée.

Validation finale :

- **984 tests web + 21 tests database réussis** ; tests de régression sur les redirections selon les droits, les réponses de disponibilité, les quatre combinaisons de collections du fil et l’ordre d’interception de l’historique.
- Lint, types, budget d’architecture, compilation de production et budget de chargement validés. Après le dernier ajustement de la garde, la commande globale a rencontré une DLL Prisma verrouillée sous Windows au stade de sa régénération. Les tests et la compilation web ont été exécutés directement avec le client déjà généré ; le schéma n’a pas changé.
- **15 scénarios navigateur réussis** sur une instance compilée distincte, avec une base locale de test : navigation Système, sorties de brouillon, Précédent/Suivant, rechargement natif annulé, départ après création réussie, publication réelle, contrôles désactivés pendant l’envoi, focus du menu, géométrie à 390/320 px, erreur 429 initiale et après succès, indisponibilité explicite puis reprise. Les réponses de disponibilité ont été injectées côté navigateur pour contrôler ces états.
- [Résultats des scénarios](ux-ui-audit-2026-09-24/verification-corrections.json), [autorisations à 320 px](ux-ui-audit-2026-09-24/autorisations-corrigees.png), [bouton MFA à 320 px](ux-ui-audit-2026-09-24/mfa-corrigee.png), [actualité épinglée sans faux état vide](ux-ui-audit-2026-09-24/actualite-corrigee.png).

Ces vérifications ciblées ne remplacent pas les limites de couverture recensées à la fin du rapport, ni la remise à jour du scénario E2E historique.

## Verdict de l’audit initial

Le centrage dans **l’espace restant à droite de la sidebar** est le bon choix pour cette application. La structure commune mise en place — barre supérieure, titre de page, navigation locale, contenu — fonctionne. Il reste toutefois des défauts concrets : cet audit ne valide pas le site « sans rien à corriger ».

Les corrections prioritaires concernent les liens vers `/systeme`, la perte de saisie de deux formulaires, le focus du menu mobile et deux contrôles mal adaptés aux petites largeurs. La gestion d’une indisponibilité temporaire mérite aussi une correction : elle peut faire disparaître des destinations pourtant opérationnelles.

Ce document constitue un **audit**, pas une nouvelle livraison de corrections. Aucun fichier applicatif n’a été modifié pendant ce passage. Les modifications UX/UI du passage précédent restent présentes dans le workspace.

## Périmètre et preuves

- Application réelle en build de production, sur une instance locale distincte, avec une base PostgreSQL de test indépendante. Les 49 migrations ont été appliquées ; les comptes, annonces, notifications et personnes utilisés sont fictifs.
- Connexion réelle et activation MFA pour un superadmin et un utilisateur ordinaire. Pas de contournement de l’authentification.
- 21 vues privées, sections et page 404 parcourues à **390, 1 024 et 1 440 px**, soit 63 relevés de structure et d’accessibilité. Compléments à 320 px, avec menu replié, texte agrandi à 200 %, formulaires ouverts et données longues.
- 12 relevés supplémentaires d’accessibilité sur les étapes de connexion/MFA et les pages d’un utilisateur ordinaire.
- Inventaire automatique de **133 fichiers TSX et 985 occurrences d’éléments JSX** : champs, boutons, liens, sections, titres, composants de navigation, etc. Ce nombre inclut les primitives et les occurrences de composants ; il ne représente ni 985 éléments uniques ni 985 tests interactifs réussis.
- Aucune violation renvoyée par axe-core pour les tags WCAG 2 A/AA et 2.1 AA sur les 75 relevés. Certains contrôles de contraste et d’attributs ARIA restent **indéterminés**. Ce résultat ne constitue pas une certification d’accessibilité : le défaut de focus mobile et les éléments coupés ont été trouvés autrement.
- Aucune erreur JavaScript capturée dans les 63 relevés initiaux.

Une limite importante a été observée pendant le parcours rapide : les rechargements répétés atteignent la limite de 12 contrôles de disponibilité par minute. Certaines captures initiales du répertoire représentent donc son état « temporairement indisponible ». Le formulaire normal a ensuite été repris à 320, 390 et 1 440 px. Les mesures JSON gardent les titres effectivement observés ; elles ne masquent pas ce changement d’état.

Documents de contrôle :

- [Inventaire de chaque occurrence JSX](ux-ui-audit-2026-09-24/inventaire-elements.csv).
- [Mesures des 63 vues initiales](ux-ui-audit-2026-09-24/mesures-pages.json).
- [Proposition et décisions du passage précédent](../plans/UX_UI_PROPOSITION_2026-09-23.md).

Dans les tableaux : **V** = vérifié dans le navigateur ; **C** = examiné dans le code ; **P** = proposition UX/UI. Un contrôle visuel ne prouve pas toutes les variantes métier du composant.

## Défauts relevés lors de l’audit initial

| ID | Priorité | Constat et reproduction | Correction proposée |
| --- | --- | --- | --- |
| D01 | Haute | Depuis le journal, « Accueil du pôle », ou le lien « Système » du breadcrumb du journal/des paramètres : arrivée sur `/systeme`, qui affiche une 404. **V + C.** | Donner une destination réelle au pôle, partagée par le breadcrumb et les actions de retour. Soit rediriger `/systeme` vers une destination autorisée, soit supprimer le lien si ce niveau n’a pas de page. |
| D02 | Haute | Nouvelle fiche utilisateur : saisir un prénom puis cliquer « Annuler » quitte le formulaire immédiatement. Le brouillon est perdu sans confirmation. **V + C.** | Appliquer la garde de navigation déjà utilisée pour la création de personne. Protéger aussi les liens, le retour et le rechargement lorsque la saisie est modifiée. |
| D03 | Haute | Publication d’actualité : saisir titre et contenu, fermer avec Échap puis rouvrir. Les deux champs sont vides. **V + C.** | Confirmer l’abandon d’un brouillon ou le conserver pendant la session. Indiquer clairement les champs obligatoires et désactiver les champs pendant la publication. |
| D04 | Moyenne | Menu mobile : ouvrir puis fermer avec Échap. Le focus revient sur `body`, pas sur le bouton d’ouverture. **V + C.** | Relier explicitement le déclencheur et la fermeture du panneau, restaurer le focus au déclencheur si aucune navigation n’a eu lieu. |
| D05 | Moyenne | Fiche utilisateur, Autorisations, 390 px : « Autorisations administratives / Compte personnel » dépasse la largeur disponible. La barre des sections principale défile correctement ; c’est le sélecteur secondaire qui déborde. **V + C.** | Deux lignes ou une grille mobile, avec libellés pouvant revenir à la ligne. Ne pas forcer deux longs boutons `nowrap` dans une seule rangée. |
| D06 | Moyenne | Fiche utilisateur avec MFA activée, Sécurité, 320 px : le texte « Réinitialiser la double authentification » est coupé à gauche dans la carte. Le document ne déborde pas, car le contenu est masqué par la carte. **V + C.** | Bouton sur la largeur disponible, hauteur automatique et retour à la ligne ; ou libellé court explicite dans le contexte de la carte. |
| D07 | Moyenne | Après une réponse de disponibilité sans `checks` — notamment la limite de débit atteinte pendant les rechargements — Personnes et Activité peuvent disparaître des menus et de la recherche. La création de personne peut alors expliquer à tort que la migration ou la clé ne sont pas prêtes. **V + C.** | Distinguer « disponibilité inconnue / contrôle échoué » de « module confirmé indisponible ». Conserver la dernière disponibilité connue lors d’une erreur transitoire, proposer de réessayer, mutualiser les contrôles. Les API continuent à contrôler les droits. |
| D08 | Moyenne | Une actualité épinglée peut être affichée au-dessus du message « Aucune actualité pour le moment », lorsque le fil non épinglé est vide. **V + C.** | Afficher l’état vide global uniquement si les deux collections sont vides ; sinon masquer cet état ou écrire « Aucune autre actualité ». |

Localisation des causes :

- D01 : [route système](../../apps/web/src/app/systeme/[[...slug]]/page.tsx), journal — chemin historique : `apps/web/src/features/audit/SystemActivityJournalPage.tsx`, [paramètres](../../apps/web/src/features/settings/SystemSettingsPage.tsx).
- D02 : création utilisateur — chemin historique : `apps/web/src/app/administration/utilisateurs/nouveau/page.tsx`.
- D03 : [publication d’actualité](../../apps/web/src/features/internal-news/components/PublishAnnouncementDialog.tsx), fermeture via `handleOpenChange` et `reset`.
- D04 : [sidebar](../../apps/web/src/components/ui/sidebar.tsx), panneau mobile et déclencheur indépendants.
- D05 : [fiche utilisateur](../../apps/web/src/components/users/UserDetailPage.tsx), groupe « Catégorie d’autorisations ».
- D06 : [sécurité utilisateur](../../apps/web/src/components/users/user-detail/UserSecurityTab.tsx), bouton `onResetMfa`.
- D07 : [disponibilité des fonctionnalités](../../apps/web/src/shared/context/FeatureAvailabilityContext.tsx) et [limiteur du middleware](../../apps/web/src/middleware.ts).
- D08 : [fil d’actualité](../../apps/web/src/features/internal-news/components/InternalNewsFeed.tsx), condition `groupedItems.length === 0`.

Captures : [404 Système](ux-ui-audit-2026-09-24/systeme-404.png), [autorisations mobile](ux-ui-audit-2026-09-24/autorisations-mobile.png), [bouton MFA coupé](ux-ui-audit-2026-09-24/mfa-bouton-coupe.png), [annonce et état vide](ux-ui-audit-2026-09-24/actualite-et-etat-vide.png). Cette dernière capture a été prise pendant le désépinglage ; le message contradictoire est aussi expliqué par la condition de rendu du fil.

## 1. Cadre commun : sidebar, header, breadcrumb, colonne

| Élément | Analyse | Décision |
| --- | --- | --- |
| Centrage | V : colonne centrée dans le contenu disponible, y compris sidebar réduite. | Conserver `SidebarInset` puis `PageShell` centré dans ce panneau. Ne pas centrer la colonne par rapport à toute la fenêtre. |
| Largeur | C + V : largeur standard 76 rem, formulaires 52 rem, lecture 56 rem ; les limites incluent le padding du shell. | Conserver ces familles. Réserver 92 rem aux vues réellement denses ; ne pas l’utiliser systématiquement. |
| Marges | V : les petites largeurs restent lisibles, mais le navigateur de bureau réserve aussi de la place aux deux gouttières de scrollbar. | Vérifier sur un vrai mobile avant de diminuer les paddings. Garder une même ligne d’alignement pour titre, navigation et contenu. |
| Sidebar ouverte | V : groupes, lien actif, icônes, menu du compte. | Conserver une navigation stable ; corriger D07 pour éviter la disparition transitoire de pôles. |
| Sidebar réduite | V : repli et centrage corrects. C : sous-menus et intitulés accessibles prévus. | Conserver les infobulles et menus explicites pour les icônes. |
| Menu mobile | V : ouverture, fermeture, panneau en place après animation ; focus incorrect à la fermeture. | Corriger D04. [Capture stabilisée](ux-ui-audit-2026-09-24/menu-mobile.png). |
| Header | V : hauteur compacte, commandes disponibles, pas de débordement global aux largeurs principales. | Garder les commandes globales ici. Ne pas répéter le titre complet et toutes ses actions dans le header. |
| Breadcrumb | V : ellipsis utilisable pour les chemins profonds ; sur trois niveaux, un parent peut prendre la place du titre courant sur mobile. | Prioriser « Accueil → … → page actuelle » à petite largeur ; conserver l’accès au chemin complet. Corriger D01. |
| Hero | V : noms longs à la ligne, actions déplacées sous le titre si l’espace manque. | Conserver le titre aligné à gauche et une action principale. Réduire les badges décoratifs. |
| Navigation locale | V : sections sous le hero, liens URL réels, défilement horizontal local, section active. C : modificateurs clavier/clic conservés. | Conserver cette barre pour les fiches et Mon compte. Ne pas ajouter une deuxième navigation verticale. |
| Scroll et éléments fixes | V : header hors du scroll principal, navigation locale visible pendant le défilement. | Garder les éléments fixes utiles seulement ; éviter que la barre de sauvegarde couvre une grande partie du mobile. |
| Accès clavier | V : navigation rapide, cloche, gardes de sortie ; D04 trouvé. C : lien « Aller au contenu principal » et cible focusable présents. | Une vérification du focus reste nécessaire pour chaque nouveau dialogue, même avec Radix. |

## 2. Connexion — `/login`

| Élément | Analyse et proposition |
| --- | --- |
| Carte, identité et titre | V mobile : un titre principal, carte lisible, largeur adaptée. P : garder ce format autonome centré sur la fenêtre, puisqu’il n’y a pas de sidebar. |
| Identifiant | C + V : label, normalisation, autocomplétion utilisateur, saisie opérationnelle. |
| Mot de passe | V : affichage/masquage et soumission. C : autocomplétion appropriée et bouton avec nom accessible. |
| Appareil de confiance | C : option et durée expliquées, restriction du superadmin mentionnée. P : raccourcir le texte initial et garder l’explication détaillée à proximité. |
| Erreurs et attente | C : messages annoncés, soumission désactivée en cours, états d’authentification distincts. Pas de test exhaustif de verrouillage ou de panne pendant la connexion. |
| Configuration MFA | V : introduction, QR/code manuel, saisie du TOTP, activation et arrivée dans l’application. En mobile, le parcours est long mais se parcourt verticalement. |
| Codes de secours | V : affichage, case de confirmation et bouton Terminer ; téléchargement exercé au bootstrap du superadmin. Aucun code n’est reproduit dans le rapport. |
| Récupération | C : saisie de code de secours et retour aux identifiants. La consommation d’un code de secours n’a pas été rejouée dans cet audit. |
| Décision UI | Garder les étapes explicites. Alléger les badges et les trois vignettes décoratives de bas de carte. Ne pas compresser le QR ni les instructions au détriment de leur lisibilité. |

## 3. Accueil / Mon travail — `/`

| Élément | Analyse et proposition |
| --- | --- |
| Bonjour et description | V : hiérarchie claire et compacte. P : faire évoluer la description vers l’action du jour lorsque de vrais modules métier seront disponibles. |
| À traiter | V : compte MFA en attente détecté ; lien vers les comptes. C : alertes conditionnelles selon les droits et les données. |
| Activité récente | V : événements affichés, dates et accès au journal. P : garder trois événements ; éviter une accumulation de badges qui concurrence le libellé. |
| Grille | V : empilement mobile, contenu réparti quand il y a suffisamment de largeur. |
| Compte ordinaire | V : accueil accessible et état calme en l’absence de tâches administratives. |
| Vide, chargement, erreur | C : vide conditionné par les données, erreur et réessai prévus. P : prévoir un squelette explicite si une actualisation sans données devient perceptible. |
| Décision UI | Conserver une largeur standard, un hero discret et uniquement les cartes qui correspondent à une information utile. |

## 4. Répertoire — `/vie-interne/repertoire`

| Élément | Analyse et proposition |
| --- | --- |
| Titre et création | V : titre clair, action « Nouvelle fiche », empilement mobile correct. |
| Recherche | V : recherche par préfixe avec données fictives. C : saisie temporisée et URL conservée. |
| Statut et tri | V : filtrage « Dans la structure », retour à la première page. C : options de tri et remise à zéro. |
| Tableau | V : identité, statut, compteurs de coordonnées, dernière modification. P : conserver les coordonnées détaillées dans la fiche. |
| Version mobile | V : cartes/lignes lisibles ; le tableau bascule selon la place disponible, y compris à 1 024 px avec sidebar. |
| Pagination | V : 26 fiches d’un même groupe, page 1 de 25, page 2 de 1, retour, puis filtre donnant 13 fiches. |
| Retour depuis une fiche | C : `returnTo`, filtres et curseurs pris en charge. Le cycle de suppression testé revient au répertoire. |
| Vide et indisponibilité | V : liste initiale peu remplie et refus du compte ordinaire. D07 affecte le contrôle de disponibilité. C : erreur et réessai. |
| Décision UI | Conserver la largeur standard et la barre de filtres proche des résultats. Donner une explication utilisateur à une panne au lieu de parler de migrations ou de clés. |

## 5. Nouvelle personne — `/vie-interne/repertoire/nouveau`

| Élément | Analyse et proposition |
| --- | --- |
| Retour et titre | V : retour au répertoire, titre stable « Nouvelle fiche ». |
| Formulaire | V : pseudo ; C : prénom, nom et statut, absence volontaire de date de naissance à la création. Le texte explique qu’un pseudo suffit. |
| Validation | V : soumission vide, indication des champs invalides et focus sur le premier champ. |
| Annulation | V : brouillon protégé, Échap ferme la confirmation et conserve le texte. |
| Création | V : création réelle puis ouverture de la fiche. |
| Géométrie | V : état normal repris à 320, 390 et 1 440 px. [Capture desktop](ux-ui-audit-2026-09-24/creation-personne-desktop.png). |
| Décision UI | Garder la colonne formulaire de 52 rem et les informations minimales ; compléter les coordonnées dans la fiche. |

## 6. Fiche personne — `/vie-interne/repertoire/[id]`

| Élément | Analyse et proposition |
| --- | --- |
| Hero | V : nom très long, avatar, statut et breadcrumb. [Capture desktop](ux-ui-audit-2026-09-24/fiche-desktop.png). P : limiter la répétition pseudo + identité civile si le titre devient difficile à scanner. |
| Identité / Coordonnées | V : liens de section et rendu des deux sections. Conserver cette séparation. |
| Identité en lecture | V : valeurs, champs non renseignés, statut, dernière modification. P : garder les valeurs proches de leur label plutôt que dispersées sur toute la largeur. |
| Modification | V : modification du pseudo, sauvegarde et mise à jour du titre. C : conflit de version et conservation du brouillon. Le conflit concurrent n’a pas été réexercé avec le nouveau parcours. |
| Origine des champs | V : origine ouverte au clavier/en édition et fermeture Échap. C : chargement à la demande et message d’échec. P : proposer cette consultation aussi en lecture, sans devoir ouvrir Modifier. |
| Emails | V : fenêtre d’ajout, email et libellé, enregistrement et fermeture. C : principal, doublon, modification et suppression de coordonnée. |
| Téléphones | V : ajout d’un téléphone et libellé. C : validation et normalisation, principal et doublons. |
| Réseaux sociaux | V : ajout d’un profil et libellé. C : sélection du réseau, identifiant ou URL, profil principal par réseau. |
| Fenêtres de coordonnées | C : garde d’abandon, erreurs de champs, concurrence, actions pendant l’enregistrement. P : garder un pied de fenêtre stable et la confirmation proche de la donnée concernée. |
| Suppression | V : avertissement, confirmation, suppression réelle d’une fiche de test et retour au répertoire. P : afficher le nom précis de la fiche dans le dialogue de confirmation. |
| Absence / suppression en cours | V : identifiant inexistant → « Fiche introuvable ». C : état 410 distinct. |
| Décision UI | Garder le gabarit commun, les deux sections et les cartes de coordonnées. Ne pas ajouter une seconde colonne de navigation. |

## 7. Utilisateurs — `/administration/utilisateurs`

| Élément | Analyse et proposition |
| --- | --- |
| Hero | V : titre, description, action de création. |
| Comptages | V : comptes et actifs, états présents. C : informations de sécurité conditionnées par les droits. |
| Filtres | V : présence et géométrie ; C : recherche, état, rôle, tri, URL, reset et pagination serveur. Toutes les combinaisons de filtres n’ont pas été exécutées. |
| Lignes / cartes | V : identité longue, identifiant, rôle, actif et date de connexion ; bascule tablette correcte. |
| Ouverture | V : fiche de l’autre utilisateur ; C : son propre compte renvoie à Mon compte. |
| Restrictions | V : refus avec un utilisateur ordinaire. |
| Erreur et rafraîchissement | C : les dernières données peuvent rester visibles avec réessai et indication de rafraîchissement. |
| Décision UI | Garder le tableau sur les grandes largeurs et les lignes mobiles. Éviter de transformer les statistiques secondaires en grosses cartes séparées. |

## 8. Nouvel utilisateur — `/administration/utilisateurs/nouveau`

| Élément | Analyse et proposition |
| --- | --- |
| Hero et badges | V : titre stable pendant la saisie. P : garder un seul indicateur utile ; « Brouillon », rôle et « Mot de passe temporaire » en haut surchargent le mobile. |
| Identité | V : prénom et nom saisis ; C : champs obligatoires, longueurs et messages de validation. |
| Identifiant et contact | V : identifiant ; C : règles de format, email facultatif, distinction avec l’identifiant. |
| Rôle | C : choix d’administrateur réservé au superadmin et reconfirmation dédiée. Création ordinaire exercée ; création administrateur non finalisée. |
| Création | V : succès et remise du mot de passe temporaire. Aucun secret dans les captures conservées. |
| Erreurs | C : erreurs API via toast ; les erreurs métier ne sont pas toutes associées au champ concerné, et la validation locale n’oriente pas explicitement le focus comme le formulaire personne. P : harmoniser ces deux comportements. |
| Annulation et retour | V : perte de brouillon confirmée, D02. |
| Décision UI | Conserver 52 rem ; aplatir les cartes imbriquées « Création du compte / Identité / Accès initial » en sections clairement titrées. |

## 9. Fiche utilisateur — `/administration/utilisateurs/[id]`

| Section / élément | Analyse et proposition |
| --- | --- |
| Hero et retour | V : nom long, identifiant, rôle, retour aux utilisateurs. P : placer identifiant et badges sur une ligne secondaire cohérente avec Mon compte. |
| Profil | V : édition du prénom, tentative de sortie, garde, maintien de la saisie, sauvegarde et titre mis à jour. C : email, identifiant, suppression d’email selon permissions. |
| Navigation des quatre sections | V : Profil, Autorisations, Sécurité, Activité affichés sur trois largeurs. Conserver les liens de section. |
| Catégories d’autorisations | V : débordement D05. P : raccourcir les titres répétés et réserver les explications longues à une aide dépliable. |
| Éditeur d’autorisations | C : rôle, pôle, page, héritage, autoriser/refuser, reset, restrictions de délégation et dépendance à l’accès à la page. V : état initial et avertissement MFA, puis disparition de cet avertissement après activation du membre. |
| Sauvegarde des droits | V : pied visible pendant le défilement. C : garde des changements et avertissement de déconnexion. Mutation de chaque permission non exécutée. P : réserver la barre fixe au brouillon réellement modifié, particulièrement sur mobile. |
| Sécurité / mot de passe | V : états, ouverture et annulation de la confirmation de réinitialisation. Mutation finale non exécutée. |
| Sécurité / MFA | V : avant et après activation du membre ; bouton de reset coupé à 320 px, D06. C : dialogue de récupération et reconfirmation. |
| Sessions | V : aucune session puis session du membre affichée. C : détails et révocation individuelle/globale. Révocations non finalisées. |
| Désactivation / suppression | C : états et contraintes de suppression, confirmation. Pas de suppression d’utilisateur exécutée dans cet audit. |
| Activité | V : vue vide/chargée selon le compte ; C : filtres, groupes de dates, détails et pagination. P : réduire les badges de localisation et garder une phrase d’événement lisible. |
| Identifiant inconnu | V : « Utilisateur introuvable ». |
| Décision UI | Garder le gabarit de fiche, alléger surtout l’éditeur d’autorisations. La complexité vient ici du contenu et des contrôles, pas du centrage. |

## 10. Mon compte — `/mon-compte`

| Section / élément | Analyse et proposition |
| --- | --- |
| Hero | V : identité mise à jour, avatar, rôle et marqueur de compte racine. P : éviter de répéter « superadmin » et « compte racine » avec une même importance visuelle. |
| Profil | V : modification synchronisée avec le menu utilisateur ; lecture et édition distinctes. |
| Email | V : ouverture, brouillon, garde d’abandon, maintien de la saisie, confirmation avec mot de passe et sauvegarde. C : retrait d’email. |
| Mot de passe | V : fenêtre ouverte et annulée. C : ancien/nouveau/confirmation, force et erreurs. Changement final non exécuté. |
| Application et codes | V : fenêtres de remplacement et de nouveaux codes ouvertes, fermeture via leur bouton explicite. Échap est volontairement bloqué dans les parcours MFA ; ce n’est pas le même défaut que D04. |
| Sessions | V : session actuelle, absence d’autres sessions pour le superadmin et détails techniques dépliés. C : révocation avec confirmation. |
| Activité | V : section et filtres visibles ; C : perspectives « Sur mon compte / Mes actions », export et détails. P : afficher moins de badges sur chaque ligne, surtout à 390 px. |
| Navigation et agrandissement | V : sections, texte à 200 % sur Sécurité sans débordement global détecté. Ce contrôle ne remplace pas un test de zoom complet sur tous les navigateurs. |
| Décision UI | Conserver Profil / Sécurité / Activité. Garder les réglages sensibles dans les fenêtres contextuelles déjà prévues. |

## 11. Actualité interne — `/vie-interne/actualite-interne`

| Élément | Analyse et proposition |
| --- | --- |
| Hero | V : titre, description et publication. Colonne de lecture adaptée. |
| Publication | V : titre, contenu, épinglage, publication et retour au fil. D03 : perte de brouillon à la fermeture. C : compteurs de caractères. |
| Cartes | V : texte, auteur, heure, état épinglé ; contenus longs à la ligne. P : éviter une grosse icône par annonce si le fil devient dense. |
| Épinglage | V : épingler/désépingler et rafraîchissement. P : préférer une mise à jour locale du déplacement à un remplacement temporaire de tout le fil par des squelettes. |
| État vide | D08 : distinguer fil vide et absence de toute actualité. |
| Erreur et pagination | C : première page, réessai, chargement de la suite ; une erreur de rafraîchissement efface actuellement les annonces déjà affichées. P : conserver le dernier contenu fiable avec un message de réessai. |
| Compte ordinaire | V : lecture accessible, action de publication absente. |
| Décision UI | Garder 56 rem, groupes de dates et rubrique épinglée. Éviter de multiplier les colonnes pour le texte courant. |

## 12. Notifications — `/mes-notifications` et cloche

| Élément | Analyse et proposition |
| --- | --- |
| Hero et compteurs | V : titre, compteur, actualisation et action globale. P : réduire la hauteur du bloc d’actions mobile. |
| Filtres | V : Toutes / Non lues / Archivées ; groupe de boutons avec état sélectionné. Garder ce modèle de filtre. |
| Lignes | V : titre long, gravité, corps, date, source, lien et actions. P : déplacer l’icône ou les actions pour rendre au texte davantage de largeur sur mobile. [Capture](ux-ui-audit-2026-09-24/notifications-mobile.png). |
| Actions individuelles | V : lue, non lue, archiver, restaurer, liste cohérente après les opérations. |
| Action globale | V : tout marquer comme lu puis bouton désactivé. |
| Erreur | V : panne d’actualisation simulée au niveau HTTP, message de réessai, reprise après rétablissement. |
| Ouverture d’une destination | C : filtrage des destinations autorisées et marquage en lecture ; les échecs du marquage automatique sont ignorés. P : prévoir une resynchronisation après échec. |
| Chargement supplémentaire | C : curseur et déduplication. Cas de changement de filtre pendant une requête lente non reproduit ; vérifier que la réponse ne mélange pas deux filtres. |
| Cloche | V : ouverture, contenu, fermeture Échap et retour du focus correct. C : états de chargement, erreur et actualisation. |
| Décision UI | Conserver la liste divisée et la colonne de lecture. Raccourcir les actions répétées sans supprimer leurs noms accessibles. |

## 13. Journal d’activité — `/systeme/journal-activite`

| Élément | Analyse et proposition |
| --- | --- |
| Hero et breadcrumb | V : présentation correcte ; D01 pour « Système » et « Accueil du pôle ». |
| Activité / Connexions | V : contrôles présents ; C : flux et filtres distincts. |
| Recherche et période | V : champs accessibles ; C : filtre, période exacte et remise à zéro. P : remplacer le long placeholder tronqué sur mobile par un exemple plus court. |
| Filtres avancés | V : ouverture et fermeture, champs visibles. C : dépendance pôle/page et plages de dates. |
| Événements | V : événements issus des opérations de test et ouverture de leurs détails. P : limiter les métadonnées répétées ; garder acteur, action, cible et date au premier niveau. |
| Export | V : dialogue de preuve, mot de passe + TOTP, téléchargement CSV effectivement déclenché. JSON et gros volumes non exportés. |
| Erreurs / suite | C : anciennes données conservées, réessai et chargement par curseur. |
| Accès | V : refus au compte ordinaire. |
| Décision UI | Garder la largeur standard et les filtres avancés repliés au départ. Le bouton d’export doit rester secondaire. |

## 14. Paramètres système — `/systeme/parametres`

| Élément | Analyse et proposition |
| --- | --- |
| Titre, breadcrumb, actualisation | V : éléments accessibles. D01 sur le parent Système. |
| Groupes | V : Interface générale / Conservation des données. Bonne séparation. |
| Valeurs | V : nombre de lignes, unités, limites, recommandation, date ; valeur hors limites rejetée par l’interface. |
| Enregistrement | V : modification de 25 à 30 et sauvegarde du réglage de liste dans la base de test. |
| Annuler / recommandé | C : retour au réglage chargé et à la valeur recommandée. P : une seule action primaire par carte ; alléger la disposition sur mobile. |
| Actualiser avec brouillon | V : confirmation, choix de rester et brouillon préservé. |
| Réduction de conservation | V : avertissement et annulation de la réduction. C : preuve supplémentaire et traitement de concurrence. Réduction non finalisée. |
| Accès lecture seule | C : variante prévue ; V : refus global au compte ordinaire. Un rôle spécialisé pouvant lire sans modifier n’a pas été créé. |
| Décision UI | Conserver les explications d’impact près du réglage. Afficher les actions de sauvegarde de manière plus discrète lorsque rien n’a changé. |

## 15. Recherche de pages — `/recherche` et navigation rapide

| Élément | Analyse et proposition |
| --- | --- |
| Périmètre | V + C : recherche des destinations autorisées, pas des personnes ni de toutes les données métier. Le titre « Rechercher une page » convient. |
| Saisie et filtres | V : recherche sans résultat, remise à zéro et filtre « Compte personnel ». C : paramètres URL. |
| Résultats | V : liste entière cliquable, titres, descriptions, source et pôle. P : garder la flèche comme repère discret. |
| Navigation rapide | V : ouverture, saisie, flèche clavier puis Entrée vers les paramètres. |
| Droits | V : le compte ordinaire voit une sélection restreinte. D07 peut encore enlever des destinations sur un échec de disponibilité. |
| Décision UI | Conserver la colonne de lecture pour les résultats. Éviter deux libellés identiques « Rechercher une page » dans la fenêtre : le lien inférieur pourrait être « Tous les résultats et filtres ». |

## 16. Feuille de route — `/feuille-de-route`

| Élément | Analyse et proposition |
| --- | --- |
| Hero | V : titre et compteurs de chantiers, pôles cibles, étapes. P : garder les compteurs secondaires. |
| Explications | V : panneau des principes et étapes dépliable, contenu accessible. |
| Filtres | V : texte sans résultat, reset, choix d’étape. C : combinaison avec le pôle cible. |
| Groupes et cartes | V : densité adaptée sur desktop, empilement mobile. C : détails « Public, prérequis et suite ». |
| Navigation future | C : présentation du plan sans transformer les modules futurs en liens de navigation actifs. |
| Décision UI | Garder la largeur standard, les filtres avant le catalogue et les explications repliées. Ne pas assimiler les huit pôles cibles aux quatre espaces actuels. |

## 17. Pages transversales, chargements et dialogues

| État / composant | Analyse et proposition |
| --- | --- |
| 404 | V : message, titre et retour à l’accueil ; géométrie contrôlée aux trois largeurs. D01 reste un lien applicatif erroné vers cet état. |
| Accès refusé | V : utilisateurs, répertoire, paramètres et journal avec le compte ordinaire ; message et retour disponibles. |
| Fiche absente | V : états personne et utilisateur distincts. |
| Erreur de route | C : message générique, identifiant d’erreur, bouton Réessayer ; pas de panne du rendu serveur injectée. |
| Session absente / indisponible | C : redirection, attente et réessai. Connexion légitime exercée ; expiration en cours d’édition non forcée. |
| Squelettes | C : gabarits communs et chargements de sections. V : transitions rencontrées ; toutes les durées et toutes les pannes n’ont pas été forcées. |
| AlertDialog d’abandon | V : personne, profil utilisateur, email du compte et paramètres. Harmoniser tous les formulaires sur cette protection. |
| Dialog MFA | V : configuration, récupération affichée, remplacement/nouveaux codes ouverts. C : blocage volontaire d’Échap. Maintenir un bouton explicite de sortie lorsqu’elle est autorisée. |
| Popovers et tooltips | V : cloche et origine de champ. P : garder les informations indispensables visibles sans survol. |
| Select, switches, cases | V : interactions sur filtres, épinglage, MFA et statut. C : primitives Radix et labels. Les options de chaque permission n’ont pas toutes été déclenchées. |
| Toasts | V : retours de création, sauvegarde, publication et notifications. P : utiliser aussi des erreurs près des champs ; un toast seul ne suffit pas à expliquer quelle valeur corriger. |
| Alias historiques | V : `/administration` → utilisateurs ; `/tableau-de-bord` → accueil ; ancien chemin des notifications → boîte actuelle. `/systeme` ne redirige pas et constitue D01. |

## Ordre de réalisation conseillé

1. **Parcours et saisies** : D01, D02, D03. Aucune refonte graphique nécessaire pour les résoudre.
2. **Mobile et clavier** : D04, D05, D06 ; contrôler aussi les descendants coupés par une carte, pas seulement la largeur du document.
3. **États fiables** : D07 et D08 ; différencier vide, erreur, dernière donnée connue et indisponibilité confirmée.
4. **Allègement visuel** : formulaires utilisateur moins imbriqués, autorisations moins verbeuses, événements avec moins de badges, actions de notification plus compactes, breadcrumb mobile donnant la priorité à la page courante.
5. **Tests durables** : remettre le scénario E2E existant en cohérence avec les formulaires actuels, puis conserver les régressions de navigation, perte de saisie et focus trouvées ici.

Le scénario `e2e/admin-smoke.spec.ts` n’est pas validé tel quel : il attend notamment un ancien lien Mon compte dans l’accueil, l’ancien formulaire personne avec coordonnées dès la création, un ancien contrôle d’historique, et certaines réponses API désormais fournies au rendu serveur. Les essais ont révélé ces assertions obsolètes. Les parcours actuels ont ensuite été exercés avec des scripts d’audit séparés. Les checks unitaires/build réussis au passage précédent ne doivent pas être présentés comme un succès de ce scénario E2E.

## Ce qui reste hors de la validation complète

- Safari, Firefox, véritables appareils tactiles, lecteurs d’écran NVDA/VoiceOver et zoom navigateur sur toutes les pages.
- Toutes les combinaisons de permissions, un administrateur délégué, un compte désactivé/verrouillé ou forcé à changer de mot de passe.
- Toutes les mutations sensibles finales : suppression de compte, reset MFA administratif, rotation de l’application, régénération des codes, révocation des sessions et réduction effective de conservation.
- Tous les cas de concurrence, déconnexion réseau pendant une sauvegarde, expiration de session, changement de droits pendant l’édition et pagination sur de très grands volumes.
- Une mesure exhaustive des contrastes, des cibles tactiles et du focus de chaque état conditionnel. Les résultats axe indéterminés restent à examiner manuellement.

Ces limites sont des tâches de validation identifiées, pas des éléments considérés implicitement comme corrects. Toutes les pages actuelles ont une analyse dans ce document ; toutes les combinaisons possibles de leurs états ne sont pas déclarées testées.
