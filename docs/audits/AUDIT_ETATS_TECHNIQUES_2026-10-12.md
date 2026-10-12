# Erreur, page introuvable et chargement — revue du 12 octobre 2026

## Périmètre et départ

États techniques partagés du routeur : [erreur](../../apps/web/src/app/error.tsx),
[page introuvable](../../apps/web/src/app/not-found.tsx),
[chargement](../../apps/web/src/app/loading.tsx), squelettes des listes et
fiches actives, cadre public/privé et sorties proposées ;
[erreur racine](../../apps/web/src/app/global-error.tsx) ajoutée après la preuve
de panne. Départ propre au
commit `9731385`. Le [suivi courant](../qualite/pages/etats-techniques.md)
porte les décisions ; les rendus du 11 octobre restent des preuves historiques.

**Conforme sur le périmètre vérifié.** Treize scénarios client, cinq contrôles
HTTP sur les routes réelles et quatre sondes de rendu Next sont réussis.
ETAT-01 à ETAT-06 sont clos ou vérifiés à la portée décrite ci-dessous. Aucun nouveau
module, droit, schéma, mécanisme de notification ou fonction métier n'est requis.

## Sélection de la revue générale

| Sujets | Classement et raison |
| --- | --- |
| Q01–Q04 | À examiner : états compréhensibles, issues utiles, cadre partagé, clavier, focus, petits écrans et repères accessibles |
| Q05 | Hors impact : aucune recherche, collection métier ou pagination modifiée ; les squelettes ne présentent pas de résultats ni de totaux fictifs |
| Q06–Q07 | À examiner pour Réessayer, retour et annonces ; aucune saisie ou nouvelle mutation métier dans ces écrans |
| Q08 | Non applicable : pas de destinataire différé ni rappel à créer |
| Q09–Q11 | À examiner : garde privée, accès anonyme ou session invalide, absence de détail interne dans les messages et captures fictives |
| Q12–Q13 | Hors impact : aucun stockage, contrainte, format de donnée ou migration modifié |
| Q14 | À examiner à la portée de la reprise d'une lecture et du non-rejeu d'une écriture ; aucun contrat métier d'API ajouté |
| Q15 | Non applicable à un audit métier : une erreur technique ne crée pas à elle seule une nouvelle trace métier ; référence de diagnostic examinée en Q28 |
| Q16 | Hors impact : pas de retrait de route ; les alias existants et fonctions non livrées sont contrôlés sans réactivation |
| Q17–Q18 | À examiner à la portée du chargement et du coût des composants partagés ; aucun cache, polling ou optimisation de données sans besoin mesuré |
| Q19 | À examiner : séparation entre erreur de page, erreur du cadre et état d'attente ; compositions partagées seulement si elles servent ces responsabilités |
| Q20–Q26 | Non applicables : pas de pièce, import/export, date métier, tâche, gouvernance, relation esport ni montant dans les états techniques |
| Q27–Q28 | À examiner : rendu isolé distingué du vrai routeur, panne et reprise, message sûr et référence de diagnostic ; pas de qualification d'un déploiement de production |
| Q29 | Hors impact : aucun format de sauvegarde, fichier persistant ou purge modifié ; les bases de preuve isolées ne sont pas une restauration |
| Q30 | À examiner : suivi, références, contrôles et limites ; aucune dépendance nécessaire |

## Contrats et éléments examinés

| État | Comportement attendu et périmètre |
| --- | --- |
| Page introuvable | Expliquer qu'une destination n'existe pas ou a été déplacée, proposer l'accueil et rester utilisable au clavier ; ne pas afficher un faux état vide d'une fonction future |
| Erreur de page | Message générique, référence technique si disponible, bouton « Recharger la page » et sortie native vers l'accueil ; ne pas afficher `error.message`, pile ou données internes |
| Erreur du cadre racine | Vérifier ce que montre une vraie panne du layout ou de l'authentification et quelle issue fonctionne sans supposer les providers disponibles |
| Chargement global | Squelette sans données personnelles ni action métier, état d'attente annoncé sans surcharger les annonces |
| Listes Utilisateurs et Répertoire | Squelettes des composants de liste existants ; pas de nouveau gabarit ni de compteur inventé |
| Fiches Utilisateur et Personne | `PageDetailSkeleton` commun ; garder le contexte de retour sûr lorsqu'il est connu, ne pas proposer un faux retour statique pendant l'attente |
| Accès et destinations futures | La seule route publique est `/login` ; les pages privées gardent leurs contrôles. Une destination système non livrée reste introuvable et ne devient pas un écran fonctionnel |

Les routes sont examinées avec le
[layout racine](../../apps/web/src/app/layout.tsx), le
[cadre authentifié](../../apps/web/src/components/AuthenticatedLayout.tsx) et le
[middleware](../../apps/web/src/middleware.ts). Les alias existants restent
distincts d'une route absente : `/tableau-de-bord` renvoie à l'accueil,
`/administration` aux utilisateurs. Les anciennes notifications et
`/systeme/journal-activite` ont une redirection explicite vers la feuille de
route, où elles sont replanifiées. Les autres destinations non livrées,
sans alias de redirection, utilisent l'état introuvable. Le banc HTTP distingue
la réponse 404 d'une URL sans correspondance de l'état introuvable diffusé avec
un statut 200 par le catch-all ; le titre visible seul ne donne pas le statut.

Le contrat de reprise retenu le 12 octobre remplace le simple réaffichage du
boundary par un rechargement GET explicite du document. Le bouton se verrouille
dès l'activation pour éviter deux départs ; le lien accueil reste natif pour
fonctionner sans dépendre des providers ou du routeur client. Le composant
`RouteErrorState` partage cette présentation entre erreur de page et erreur
racine, avec titre focalisé et repère principal adapté au cadre. Il ne demande
aucune mutation métier automatique et ne promet ni sauvegarde ni annulation
d'une requête déjà traitée.

Ce composant est référencé dans le [catalogue partagé](../references/COMPOSANTS.md).
Il ne remplace pas les retours attendus d'API, les brouillons et les reprises
locales des formulaires. L'erreur racine fournit son document français, les
styles et les polices existants via `fonts.ts`, sans dépendre du layout qui
vient d'échouer ; aucune nouvelle dépendance n'est ajoutée.

La documentation Next consultée via Context7 correspond à la branche 15.1.11
pour les conventions `error`, `not-found` et la gestion des erreurs. Les extraits
canary ont été écartés. Sur la version 15.5.23 effectivement installée, la lecture
de `error-boundary.js` confirme que `reset` efface l'état d'erreur local sans
lancer lui-même une lecture serveur ; `app-render.js` prend en charge les assets
importés par `global-error`. La preuve navigateur ci-dessous reste nécessaire
pour conclure sur le comportement de ce projet.

La fiche personne conserve déjà un fil d'Ariane sans lien pendant son
chargement, puis la fiche rétablit son retour filtré. Le squelette utilisateur
lit déjà un `returnTo` sécurisé dans l'URL : ces deux comportements ne sont pas
confondus ni réécrits comme s'ils avaient le même défaut.

## Constats et suivi

| ID | Nature et scénario | Suite attendue | État |
| --- | --- | --- | --- |
| ETAT-01 | Limite de la revue du 11 octobre : boundary, réessai et route absente n'avaient pas été déclenchés sur Next réel | Routes privées et absentes, panne réelle de base, erreurs serveur/client et chargement réellement diffusé par Next | Clos après les cinq contrôles HTTP et les quatre sondes, ces dernières uniquement dans une copie temporaire |
| ETAT-02 · P2 | Le suivi promettait réessai et accueil, mais `error.tsx` ne rendait que Réessayer ; une erreur persistante n'avait pas cette sortie locale | Sortie native vers l'accueil, conservée après plusieurs erreurs | Clos après vérification client des commandes et navigations de document ; état racine également observé sur Next réel |
| ETAT-03 · P2 | Arrêt de PostgreSQL pendant une lecture du layout racine : HTTP 500 et écran Next blanc en anglais, référence technique mais aucune commande. Reprise possible seulement par rechargement manuel du navigateur après retour de la base. | Réponse racine française autonome, sans hypothèse sur les providers, avec rechargement et sortie explicites | Clos après panne et reprise réelles : page française, styles et polices chargés, titre focalisé, reprise par le bouton en un essai après redémarrage |
| ETAT-04 · P2 | Après remplacement d'un contrôle focalisé par l'erreur, le focus reste sur le document ; la branche publique du cadre n'offre pas de repère `main`. Reproduits dans le banc client | Repère de contenu adapté au cadre, focus perceptible vers l'erreur et reprise accessible sans doubler les repères dans le cadre privé | Clos après vérification client du focus, du clavier et des repères ; titre focalisé également vérifié dans la panne racine réelle |
| ETAT-05 · P2 | Après suppression de la panne de la sonde serveur, le callback `reset` réaffiche l'erreur sans envoyer de nouvelle requête ; un rechargement manuel permet alors la reprise | Rechargement GET complet explicitement nommé ; nouvelle lecture et reprise après disparition de la panne | Clos après reproduction avant/après sur Next réel ; la reprise de l'erreur client, déjà possible auparavant, reste réussie |
| ETAT-06 · P2 | Le nouvel état racine autonome ne recevait pas la meta viewport du layout en échec. Une première mesure mobile après passage par une page saine conservait pourtant 390 px : aucun défaut d'échelle n'est démontré | Déclaration `width=device-width, initial-scale=1` dans le document autonome | Omission corrigée et vérifiée : émulation mobile, navigation à froid, largeur 390 px et aucun débordement ; amélioration de robustesse sans défaut d'échelle revendiqué |

Le contrôle initial de chargement observe un `role=status` nommé, sans texte enfant.
Ce constat sémantique ne démontre pas à lui seul un échec d'annonce avec un
lecteur d'écran. L'ajout du texte masqué « Chargement de la page… » améliore
explicitement ce contenu accessible ; ce n'est pas un défaut d'annonce prouvé.

La référence de 512 caractères à 320 × 500 pixels reste contenue, et le message
interne de l'erreur n'est pas exposé. Ce contrôle déjà réussi n'est pas compté
comme un défaut corrigé.

## Preuves et limites

### Navigateur avec contexte simulé

Le banc initial comporte quatre contrôles : remplacement d'un contrôle par
l'erreur et absence de sortie accueil, branche publique sans `main`, état de
chargement nommé sans texte, puis digest long contenu et message interne
absent. Il monte les vrais états, CSS et cadre persistant avec session,
routeur et sous-parties de navigation simulés. Il ne provoque pas une panne
réelle de Next ni de PostgreSQL.

Le [banc client](etats-techniques-2026-10-12/banc-client/README.md) termine à
**13/13**, le 12 octobre à 21 h 02 Europe/Paris. Il vérifie les trois états à
320, 390, 768, 1 024, 1 440 et 1 920 px, les repères public/privé pertinents,
le focus du titre puis des deux actions, le retour natif et le rechargement
GET du document isolé. Deux activations synchrones ne lancent qu'un GET, y
compris après plusieurs erreurs persistantes. Le chargement conserve le focus
de navigation et son statut comporte désormais le texte annoncé.

Le digest de 512 caractères reste contenu à 320 × 250 px et les commandes sont
accessibles par défilement. Le texte porté à 200 % par la taille racine et le
mouvement réduit sont exercés ; ce n'est pas un zoom natif. Trente mesures
ciblées de contraste sur les surfaces opaques vont de 5,83:1 à 15,15:1, sans
constituer une certification WCAG globale. Les captures à 320 et 1 440 px
sont inspectées. Aucun appel API ni erreur JavaScript n'est observé.

Une passe intermédiaire avait reproduit deux GET avant l'ajout du verrou
synchrone : c'était une régression transitoire du correctif, désormais vérifiée.
Une autre assertion demandait à tort un `main` à une 404 publique inexistante
dans les parcours du produit ; cet oracle a été retiré sans inventer de défaut.
Le cadre de navigation, la session et le routeur sont simulés, avec Arial en
police de substitution. `global-error` n'est pas monté par ce banc et un GET
vers son serveur isolé ne démontre pas une nouvelle lecture RSC.

### Routes et panne de base avec Next réel

Le [protocole d'intégration](etats-techniques-2026-10-12/banc-integration/README.md)
décrit la préparation isolée, les commandes et leurs limites. La
[baseline HTTP](etats-techniques-2026-10-12/banc-integration/baseline-resultats.json)
compte cinq contrôles réussis et une observation du fallback initial, avec
Next 15.5.23 de production, Chromium 149.0.7827.55, PostgreSQL 17 isolé et les
52 migrations existantes. Connexion par mot de passe et TOTP, cookie CSRF,
route inconnue anonyme redirigée avec 307, route inconnue authentifiée à 404
avec `noindex` et retour accueil, catch-all et panne réelle de base sont exercés.
Le catch-all explicitement introuvable répond 200 après démarrage du flux,
tout en affichant l'état introuvable ; cela est distingué du 404 d'une URL
sans correspondance. Quatre largeurs sont contrôlées sur ce parcours :
320, 390, 768 et 1 440 pixels.

La [capture de panne racine](etats-techniques-2026-10-12/banc-integration/baseline-global-outage-390.png)
est inspectée : message anglais, digest, aucune action, sans secret de l'erreur
serveur. La base est redémarrée après cette injection ; l'absence de fuite
interne est déjà bonne avant correction.

Les [cinq contrôles HTTP finaux](etats-techniques-2026-10-12/banc-integration/final-resultats.json)
sont réussis sur le build corrigé, le 12 octobre à 21 h 11 Europe/Paris.
La panne racine rend toujours HTTP 500, mais affiche désormais le document
français avec un seul `main`, le titre focalisé, les styles sombres et les
polices Geist/Geist Mono chargées. Après redémarrage de la base, le bouton fourni
rétablit la page en une tentative et conserve les paramètres de l'URL. La
[capture finale](etats-techniques-2026-10-12/banc-integration/final-global-outage-390.png)
a été inspectée.

Une [passe intermédiaire](etats-techniques-2026-10-12/banc-integration/reprise-intermediaire.json)
avait encore reçu trois erreurs de connexion Prisma `P1017` après le redémarrage,
lors de trois clics de banc rapprochés sur 166 ms. Elles sont compatibles avec
des connexions du pool fermées, sans mesure interne de celui-ci. Les deux
commandes restaient disponibles. Le protocole final borne
la reprise à trois actions manuelles séparées d'une seconde ; une seule a été
nécessaire dans la passe finale. Aucun retry automatique n'a été ajouté au
produit et aucun délai universel de rétablissement du pool n'est garanti.

La première mesure à 390 px utilisait un contexte de bureau réduit. Un
[contrôle mobile intermédiaire](etats-techniques-2026-10-12/banc-integration/global-viewport-avant.json)
a confirmé l'absence de meta viewport dans le document autonome, tout en
conservant une largeur de 390 px après passage par une page saine. Il ne prouve
donc aucun élargissement à 980 px. La passe finale vérifie la meta explicite,
une largeur interne de 390 px et l'absence de débordement, y compris lors d'une
nouvelle navigation mobile directement vers la panne. Cette émulation Chromium
ne remplace pas une vérification sur Safari/iOS ou appareil physique.

### Erreurs de rendu et chargement dans une copie temporaire

Quatre sondes servent seulement à provoquer les chemins du framework, sans
introduire de route d'essai dans le produit : exception dans un composant
serveur, panne persistante, exception de rendu client et suspension serveur de
1 800 ms. Elles utilisent le vrai build optimisé Next 15.5.23 et les états du
projet, dans une copie temporaire. Les
[quatre contrôles avant](etats-techniques-2026-10-12/banc-integration/baseline-sondes-resultats.json)
et les [quatre contrôles après](etats-techniques-2026-10-12/banc-integration/final-sondes-resultats.json)
sont exécutés le 12 octobre à 21 h 09 et 21 h 10 Europe/Paris.
La comparaison initiale des sondes remet seulement `app/error.tsx` de `9731385`
dans la copie des sources corrigées : elle isole l'effet de `reset`, sans
présenter ce montage comme une reconstruction de tout l'ancien produit. La
session MFA du banc HTTP réel est réutilisée.

Avant correction, le bouton Réessayer de l'erreur serveur n'émet aucune nouvelle
requête après suppression de la panne : l'erreur reste affichée jusqu'au
rechargement manuel. Après correction, « Recharger la page » effectue un GET et
retrouve le contenu rétabli. Si la panne persiste, la nouvelle page d'erreur
conserve ses commandes et le retour accueil aboutit. L'exception de rendu client
est reprise avant comme après ; elle n'est pas présentée comme un nouveau défaut.
Le chargement global apparaît réellement pendant la suspension, puis laisse
place au contenu. Les erreurs internes fictives ne sont pas affichées. Le
statut initial 200 de l'erreur serveur diffusée reste distingué d'un HTTP 500
avant émission du flux.

Ces sondes démontrent les conventions de routage et la récupération du framework,
pas une panne métier de chacune des pages du site. Elles ne modifient ni le
schéma ni les routes conservées du dépôt.

### Contrôles généraux et limites restantes

Contrôles généraux : build Next 15.5.23 final, incluant la meta viewport, avec
lint et types réussi. **1 240 tests réussis et 163 ignorés** dans 102 fichiers
réussis et neuf ignorés ; cette exécution précède seulement l'ajout de cette
balise, sans changement de logique ensuite. Les budgets d'architecture et de
performance sont réussis, ces derniers rejoués sur le build final. Aucun schéma
ni migration modifié. Le premier build a été empêché par le téléchargement des
polices Google dans l'environnement restreint ; sa relance autorisée a réussi.
Cette limite d'environnement n'est pas qualifiée comme un défaut du produit.

Les intégrations utilisent un build optimisé isolé, sans déploiement. Le mode
développement de Next possède son overlay de diagnostic ; son comportement
n'est pas présenté comme celui du fallback de production exercé ici.

Aucun résultat ancien n'est annoncé comme rejoué. Les tests d'une base isolée
ne qualifient ni restauration ni incident de production. Lecteur d'écran humain,
Firefox, Safari/iOS, appareil physique, zoom natif et charge ne sont pas vérifiés
par cette passe. Les états d'erreur ne garantissent pas le résultat d'une mutation
métier antérieure ; chaque formulaire conserve ses propres règles de reprise.

Le nettoyage est confirmé : Next et PostgreSQL de preuve sont arrêtés, ports
3126 et 54630 libres, jonctions vérifiées puis retirées avant suppression des
copies et du cluster. Sessions, secret TOTP, clés, marker et autres fichiers
privés temporaires sont supprimés. Les neuf fichiers texte du banc HTTP ont été
contrôlés contre ses valeurs privées avant suppression, sans occurrence. Les
trois dossiers temporaires du banc client ont également été retirés. Aucune
base habituelle du projet n'a été consultée ni modifiée.
