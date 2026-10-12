# Navigation générale — revue du 12 octobre 2026

## Périmètre et départ

Sidebar, sélecteur Rubriques, header, fil d'Ariane et navigation rapide. Les
barres de sections ne sont reprises que pour leurs effets sur le contexte,
le défilement ou une garde de brouillon. La déconnexion est une commande du
menu du compte : son résultat serveur et sa reprise font partie du parcours.

Départ au commit `9731385`, avec les corrections locales de la passe des
[états techniques](AUDIT_ETATS_TECHNIQUES_2026-10-12.md) terminées et préservées.
Le [suivi courant](../qualite/pages/navigation-generale.md) porte les décisions ;
les anciennes preuves ne sont pas annoncées comme rejouées. **NAV-02 à NAV-07
sont clos ou réconciliés dans la portée des preuves ci-dessous.** La piste de
changement de section après long défilement reste non vérifiée et distincte.
La passe des états techniques a ensuite été commitée extérieurement : la
validation de navigation part du HEAD `84a1431` avec les corrections de cette
revue non commitées. Aucun ancien changement n'a été réécrit pour cette passe.

## Sélection de la revue générale

| Sujets | Classement et raison |
| --- | --- |
| Q01–Q04 | À examiner : destinations et contexte, composants, clavier, focus et petits écrans |
| Q05 | À examiner pour le catalogue local de recherche et son filtrage ; aucune pagination de données métier |
| Q06–Q07 | À examiner : saisie bornée, garde de brouillon, déconnexion, attente et retour d'erreur |
| Q08 | Non applicable : notifications retirées, aucun destinataire ou rappel à ajouter |
| Q09–Q11 | À examiner : catalogue autorisé, disponibilité, retrait de droits, changement de compte et session ; aucune recherche dans les données personnelles des modules |
| Q12–Q13 | Hors impact : aucune table, contrainte ou migration nécessaire à cette navigation |
| Q14–Q15 | À examiner pour la déconnexion : réponse HTTP, délai, résultat serveur et preuve de révocation ; pas de nouvelle trace métier créée par principe |
| Q16 | Hors impact prévu : pas de retrait de route ; alias et fonctions futures conservent leurs destinations |
| Q17–Q18 | À examiner pour rendu local, disponibilité et mémoire existante ; pas de cache ni d'optimisation sans défaut mesuré |
| Q19 | À examiner : catalogue partagé, cadre persistant et responsabilité des menus/gardes ; abstractions limitées à une responsabilité réelle |
| Q20–Q26 | Non applicables : pas de pièce, import/export, date métier, automatisation, gouvernance, relation esport ou montant dans ce périmètre |
| Q27–Q28 | À examiner : simulations distinguées de la vraie navigation et session, erreurs de déconnexion et reprise |
| Q29 | Hors impact : aucune sauvegarde modifiée ; mémoire de défilement facultative |
| Q30 | À examiner : références contradictoires à réconcilier, suivis et preuves ; aucune dépendance nécessaire |

## Inventaire et décisions

| Élément | Responsabilité et contrôle utile |
| --- | --- |
| Sidebar et Rubriques | Changer de pôle puis de page autorisée ; volet mobile, fermeture et focus cohérents avec une navigation acceptée ou refusée |
| Identité Noctambule | Retour vers l'accueil, nom accessible et cible utilisable ; aucune deuxième page d'accueil à créer |
| Menu du compte | Identité courante, Mon compte et Déconnexion ; un refus serveur ne doit pas devenir une déconnexion réussie |
| Header et fil d'Ariane | Contexte, ancêtres compacts accessibles, lien d'évitement et titre lisible ; aucune destination de pôle fictive |
| Navigation rapide | Pages disponibles et autorisées, recherche locale de 160 caractères, huit suggestions et dix résultats ; pas de recherche complète ni raccourci global réintroduit |
| Barres de sections | URLs existantes, garde de brouillon et contenu visible après long défilement ; pas de nouvelle refonte de leur style |
| Disponibilité et permissions | Même catalogue filtré pour sidebar et recherche ; contrôles serveur des destinations conservés |

Sources examinées : [Sidebar](../../apps/web/src/components/Sidebar.tsx),
[PoleNavigation](../../apps/web/src/components/layout/PoleNavigation.tsx),
[Header](../../apps/web/src/components/layout/Header.tsx),
[recherche rapide](../../apps/web/src/components/layout/GlobalSearch.tsx),
[catalogue](../../apps/web/src/features/search/search-catalog.ts),
[navigation canonique du code](../../apps/web/src/shared/constants/app.constants.ts),
[cadre persistant](../../apps/web/src/components/AuthenticatedLayout.tsx),
[garde de brouillon](../../apps/web/src/shared/hooks/useUnsavedNavigationGuard.ts)
et [contexte de session](../../apps/web/src/shared/context/UserContext.tsx).

La référence et le suivi décrivaient toujours une grille de quatre icônes,
alors que le composant présente un menu Rubriques déjà exercé le 10 octobre.
Le menu a d'abord été conservé par continuité pendant cette revue.
L'utilisateur a ensuite confirmé le 12 octobre son choix : **conserver le
menu « Rubriques » actuel**. La référence courante suit cette décision ;
l'ancienne grille reste datée dans l'historique. Aucune future rubrique n'est
activée. Les descriptions de Mon compte sont ramenées à « Profil et sécurité »
dans le menu et « Profil, sécurité et sessions de connexion » dans la recherche,
correspondant aux sections livrées ; aucun module Activité n'est ajouté.

## Constats et corrections

| ID | Constat et preuve actuelle | Suite | État |
| --- | --- | --- | --- |
| NAV-02 | Les anciennes revues ne prouvaient pas les parcours privés avec session réelle, brouillon et retrait de droits | Dix parcours Next/PostgreSQL vérifient les destinations, navigation acceptée/refusée, historique, compte limité et droits modifiés après navigation complète | Clos dans cette portée ; sections après long défilement non vérifiées |
| NAV-03 | Recherche de 36 px sur ordinateur contre décision de 40 px ; mesures initiale et finale dans le navigateur | Contrôle porté et mesuré à 40 px | Clos au périmètre mesuré |
| NAV-04 | Références courantes grille contre menu Rubriques actuel ; largeur du menu du compte encore annoncée à 18rem contre 16rem livré | Menu actuel confirmé par l'utilisateur le 12 octobre, références réconciliées et ancien choix gardé daté | Réconciliation documentaire effectuée |
| NAV-05 · P2 | Départ refusé depuis Sidebar ou recherche puis Rester : destination conservée mais volet/palette fermés et focus sur `body`, reproduit dans Chromium isolé | Contexte conservé jusqu'au départ accepté et focus visible, vérifiés dans les bancs client et Next | Clos au périmètre testé |
| NAV-06 · P1 | HTTP 403/500 traité comme succès par `logout`, qui ne vérifiait pas la réponse ; transport perdu entraînant tout de même la sortie et aucune borne de requête | Identité masquée, résultat non confirmé et reprise explicite vérifiés avec vraie session ; délai et courses exercés dans les tests du contexte | Clos au périmètre testé |
| NAV-07 · P2 | Focus sur `body` après passage du volet mobile au bureau ou fermeture du menu des ancêtres au changement de présentation ; deux reproductions Chromium | Repositionner le focus vers un contrôle ou repère visible de la nouvelle présentation, sans voler un focus du contenu | Clos sur les parcours client vérifiés |

NAV-01 (ancien budget sidebar) reste clos depuis le 10 octobre. La piste déjà
documentée de changement de section après long défilement reste à reproduire :
rendre visible le contenu après navigation acceptée, sans déplacer la page si
la garde refuse. Aucun nouveau défaut n'est déclaré avant ce contrôle.

### Déconnexion : contrat corrigé

Le compte est retiré de l'écran dès la demande. Le POST est borné à quinze
secondes et une seconde activation pendant l'attente est ignorée. Le helper
[session-logout](../../apps/web/src/shared/context/session-logout.ts) accepte le
contrat JSON de succès et le statut 401 de cette route, qui signifie une session
absente ; 403, 5xx, réponse invalide, délai et réseau perdu restent non confirmés.
Le contexte bloque les lectures silencieuses et les anciens résultats qui
réafficheraient l'identité pendant cette intention de sortie.

[SessionLogoutState](../../apps/web/src/components/layout/SessionLogoutState.tsx)
compose les primitives Card/Button dans un écran sans données privées, avec
titre focalisé et « Réessayer la déconnexion ». Ce n'est pas une exception de
rendu : `RouteErrorState` n'est pas utilisé. La reprise est un POST demandé par
l'utilisateur, sans boucle automatique. Une session déjà révoquée répond 401
et permet de terminer. Après confirmation, `replace('/login')` évite un retour
immédiat vers le cadre fermé ; une panne de navigation conserve le succès et
un lien natif vers la connexion.

Une nouvelle authentification explicite avec challenge valide remplace cette
intention, afin de préserver la vérification de session après une réponse MFA
incertaine. Aucun secret ni indicateur persistant supplémentaire n'est stocké.
Le verrou appartient au contexte monté ; il ne prétend pas révoquer une session
serveur si le transport n'a jamais atteint sa destination.

## Preuves et limites

### Reproductions navigateur et HTTP

Les [six contrôles client initiaux](navigation-generale-2026-10-12/banc-client/preuves/avant-6.json)
exercent les vrais composants avec contexte et navigation simulés. Quatre
reproduisent les pertes de contexte/focus de NAV-05 et NAV-07. La mesure desktop
confirme une recherche de 36 px (NAV-03). Le nom absent est déjà normalisé en
chaîne vide par le DTO et le prénom seul est correctement affiché : aucun faux
défaut de nom n'est retenu.

Après correction, **17 scénarios client réussissent**, selon le
[protocole client](navigation-generale-2026-10-12/banc-client/README.md) et ses
[observations finales](navigation-generale-2026-10-12/banc-client/preuves/apres-17.json).
Six compositions de
320, 390, 768, 1 024, 1 440 et 1 920 px couvrent les noms et chemins longs,
le clavier et Échap. Les parcours vérifient le refus puis l'acceptation du
départ depuis une page, Mon compte, Rubriques, Déconnexion, les ancêtres et
la recherche, y compris Entrée dans cette dernière. Le volet et le fil
d'Ariane conservent un focus visible dans les deux sens de leur changement
de présentation et respectent un focus déjà placé dans le contenu. Les
écrans de déconnexion sont exercés à 320 et 1 440 px avec états du contexte
simulés : cela ne constitue pas une preuve de POST ou de session réelle.
Les captures à 320 et 1 440 px ont été inspectées. Les contrôles d'attributs
`autocomplete` ne prouvent pas l'effet d'une extension Bitwarden installée.

La passe intermédiaire archivée conserve deux échecs réellement corrigés
pendant la revue : retour bureau → mobile focalisant `body`, et retour de
« Rester » depuis la recherche focalisant sa liste plutôt que la saisie.
Ils ne sont pas masqués par une attente de test affaiblie.

Le maintien du focus responsive est extrait dans
[sidebar-focus](../../apps/web/src/components/ui/sidebar-focus.ts), avec une
responsabilité propre et sans augmenter le plafond du composant. Les
composants publics et le seuil de présentation restent inchangés.

Le [protocole HTTP](navigation-generale-2026-10-12/banc-integration/README.md)
emploie Next 15.5.23 optimisé, Chromium 149.0.7827.55 et PostgreSQL 17 isolé avec
les 52 migrations. Les [neuf parcours initiaux](navigation-generale-2026-10-12/banc-integration/baseline-resultats.json)
passent déjà pour les six destinations, la recherche, le mobile, le brouillon,
les retours/historique et les droits. Ces assertions initiales ne prouvaient
pas encore la conservation du contexte/focus ajoutée à la passe finale.

Les [trois caractérisations de déconnexion](navigation-generale-2026-10-12/banc-integration/baseline-logout-resultats.json)
prouvent le faux succès après un **403 CSRF réel** et un **500 injecté avant
le handler** : GET `/api/auth/me` répond encore 200. Dans le troisième cas,
le vrai POST reçoit 200 après commit, mais sa réponse est interrompue vers le
navigateur : la session courante est supprimée, un seul audit LOGOUT ajouté
et GET me répond 401. Ce cas établit qu'une perte de réponse ne signifie pas
l'absence de mutation.

Après correction, les [dix parcours de navigation](navigation-generale-2026-10-12/banc-integration/final-resultats.json)
et les [trois parcours de déconnexion](navigation-generale-2026-10-12/banc-integration/final-logout-resultats.json)
réussissent sur le build optimisé. La connexion par mot de passe puis TOTP,
les cookies, le middleware, les routes et la base isolée sont réels.

| Parcours HTTP final | Résultat démontré |
| --- | --- |
| Destinations | Les cinq pages principales et Mon compte s'ouvrent depuis recherche et sidebar/menu du compte ; recherche mesurée à 40 px sur ordinateur |
| Recherche et mobile | Entrée navigue, Entrée sur Effacer efface seulement, Échap rend le focus ; aucun appel d'API de recherche. Changer de rubrique conserve le volet, choisir une page le ferme |
| Brouillon de création Personne | « Rester » conserve saisie, palette/volet et focus ; confirmer rejoint la destination. Annuler Déconnexion garde le menu et la session, sans envoyer le POST |
| Ancêtres et historique | Retour au Répertoire avec filtres, Back/Forward et refus du départ depuis le menu compact conservent le contexte |
| Compte limité | Destinations non autorisées masquées, trois accès API directs refusés 403 ; retrait d'un droit visible après une navigation complète, puis déconnexion normale 200 suivie de GET me 401 |
| Déconnexion refusée | 403 CSRF réel puis 500 injecté avant le handler : état non confirmé, identité absente, session toujours valide et aucun rejeu automatique |
| Réponse de déconnexion perdue | Vrai commit 200 interrompu vers le navigateur : session supprimée et un audit LOGOUT ; nouvelle tentative explicitement demandée reçoit 401 puis rejoint la connexion |

Les captures réelles de navigation mobile et de déconnexion ont été inspectées.
Aucune erreur JavaScript navigateur n'est relevée dans les dix parcours.
La première exécution finale avait deux attentes de banc incorrectes : elle
interdisait aussi le GET de disponibilité de l'application et cherchait un
nom accessible supposé du menu compte. Le contrôle final distingue cette lecture
de santé d'une API de recherche et utilise le nom réellement exposé ; les
assertions de focus et de session restent exécutées.

### Tests ciblés et contrôles de code

Les cinq régressions ciblées échouaient avant correction : faux succès 403,
500 et réponse 200 invalide, sortie après transport perdu, attente toujours
active après quinze secondes. Après correction, **37 tests ciblés réussis**
incluent huit nouveaux cas : refus, résultat incertain, répétition, borne,
réponse tardive, démontage, navigation échouée après succès et reprise d'une
authentification explicite. La régression existante de refresh pendant logout
utilise désormais le vrai contrat JSON et vérifie qu'aucun GET ne rétablit le
compte ni ne bloque la sortie confirmée. Commande depuis `apps/web` :
`bun run test src/__tests__/user-context.test.ts src/__tests__/user-context-logout-race.test.ts`.
Hooks et réseau simulés :
ces tests ne démontrent pas la révocation en base.

La suite générale réussit avec **1 248 tests réussis et 163 ignorés**, dans
102 fichiers réussis et neuf ignorés, avant les deux dernières retouches de
description de Mon compte. Après celles-ci, **38 tests de navigation réussissent**
à nouveau avec `bun run test src/__tests__/sidebar-ux-contracts.test.ts src/__tests__/guarded-navigation.utils.test.ts src/__tests__/global-search.test.ts src/__tests__/navigation.constants.test.ts`.
Il s'agit d'une relance ciblée, pas de 38 tests supplémentaires. Les trois échecs du premier passage
concernaient un ancien mock de réponse/routeur et deux assertions de texte
source devenues obsolètes ; leurs contrats ont été adaptés sans retirer la
protection de course ou de garde de brouillon.

Le build optimisé Next 15.5.23, le lint complet, TypeScript, les budgets
d'architecture et de performance passent. Le premier contrôle d'architecture
signalait 978 lignes pour une limite de 900 dans la primitive sidebar :
l'extraction du focus responsive règle ce dépassement sans relever le budget.
UserContext reste sous son plafond existant de 800 lignes. Cette passe n'ajoute
aucune capacité métier, dépendance ou migration ; les 52 migrations existantes
ont été appliquées au seul environnement d'intégration isolé.
Le build a été rejoué après les deux retouches de description ; le
[contrôle final des libellés](navigation-generale-2026-10-12/banc-integration/libelles-finaux.json)
et ses captures confirment le menu et la recherche sur ce dernier build. Les
treize parcours fonctionnels ne sont pas annoncés comme une seconde campagne
après ce seul changement de texte.

### Limites conservées

- Les deux profils isolés et les destinations livrées ne qualifient pas toutes
  les combinaisons futures de permissions. Le retrait de droit est vérifié
  après navigation complète, sans promesse de propagation instantanée dans
  tous les onglets.
- La borne de quinze secondes, les courses, le démontage et les réponses
  tardives de déconnexion sont prouvés par tests simulés du contexte, pas par
  une campagne HTTP de charge ou de réseau mobile.
- Le verrou d'intention ne dure que dans le contexte monté : un rechargement
  complet peut retrouver une session serveur dont la fermeture n'a pas été
  confirmée. Aucun stockage persistant supplémentaire n'est ajouté.
- Firefox, Safari/iOS, appareils physiques, lecteur d'écran, zoom natif et
  extensions de gestionnaire de mots de passe ne sont pas vérifiés. Les
  contrôles sémantiques et de focus ne constituent pas une certification.
- Les changements de sections après long défilement ne sont pas rejoués ;
  `PageSectionNavigation` n'a pas été modifié. Les modules futurs restent absents
  de la navigation active.

### Nettoyage

Next et PostgreSQL temporaires sont arrêtés ; les ports 3127 et 54640 ont été
vérifiés libres. Le dossier de l'intégration a été supprimé après vérification
de son chemin exact et de l'absence de jonction, avec cluster, configuration
privée, secrets TOTP, journaux et marker. Le scan des onze fichiers texte du
banc ne retrouve aucune valeur privée. Les sept temporaires du banc client
ont également été supprimés. Aucun accès à la base habituelle ni modification
du fichier `.env` habituel n'a été nécessaire. Scripts, résultats et captures
de données fictives restent archivés.
