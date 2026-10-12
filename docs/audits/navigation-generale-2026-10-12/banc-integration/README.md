# Navigation générale — parcours HTTP du 12 octobre 2026

[Rapport](../../AUDIT_NAVIGATION_GENERALE_2026-10-12.md) ·
[Parcours de navigation](run.cjs) · [Parcours de déconnexion](run-logout.cjs) ·
[Authentification partagée du banc](auth.cjs).

## Périmètre

Next **15.5.23** en production, Chromium **149.0.7827.55**, PostgreSQL **17**
avec les **52 migrations**. Point de départ : `84a1431`. Le serveur utilise
`127.0.0.1:3127`, la base fictive `navigation_test` sur `127.0.0.1:54640`.
Les scripts refusent les autres cibles. Aucun fichier `.env` habituel modifié,
aucun appel à la base habituelle du projet, aucune route de diagnostic ajoutée.

Les deux comptes sont fictifs : racine protégé et USER limité. Mot de passe,
enrôlement et vérification TOTP, cookies, contrôle CSRF, chargement Next et
politiques des API sont réels. Le compte limité est préparé par Prisma dans
cette seule base ; sa permission Répertoire est ensuite retirée par fixture
SQL, puis les effets sont observés après une nouvelle navigation complète.
Cette injection ne prétend pas éprouver l'écran de gestion des autorisations.

Le catalogue compte cinq destinations de sidebar et Mon compte dans les outils
globaux. Chacune est parcourue depuis la recherche et depuis la sidebar ou le
menu compte. Le menu déroulant **Rubriques** courant est testé ; son maintien
a été confirmé par l'utilisateur pendant cette passe.

Les gardes utilisent le vrai formulaire de création Personne. Le brouillon
reste local : aucun POST de création n'est envoyé. Le bouton **Rester** doit
conserver la saisie ; la confirmation d'abandon doit rejoindre la destination.
Les scénarios finaux renforcent le contrôle de la palette, du volet, des menus
compte/ancêtres et du focus. Entre scénarios indépendants, une navigation
complète peut accepter le dialogue natif `beforeunload` pour remettre le banc
à zéro ; ce nettoyage n'est pas présenté comme un test de ce dialogue natif.

## Résultats

| Preuve | Résultat |
| --- | --- |
| [Navigation initiale](baseline-resultats.json) | **9/9** : authentification, six destinations par les deux accès, recherche au clavier, volet mobile, deux gardes de brouillon, retour filtré et historique natif, droits limités et révocation. |
| [Déconnexion initiale](baseline-logout-resultats.json) | **3 caractérisations** : refus CSRF 403 réel et 500 simulé affichant un faux succès malgré GET `/api/auth/me` 200 ; réponse perdue après commit réel avec session supprimée et audit ajouté. |
| [Navigation finale](final-resultats.json) | **10/10** : parcours initiaux, conservation de la palette, du volet, des menus et du focus après annulation, garde de déconnexion sans POST, sortie normale du compte limité avec POST 200 puis GET me 401. |
| [Déconnexion finale](final-logout-resultats.json) | **3/3** : refus 403 et 500 explicites, ancien compte masqué, réponse perdue après commit puis nouvelle tentative volontaire 401 vers la connexion. |
| [Libellés finaux](libelles-finaux.json) | Contrôle ciblé après la dernière compilation : menu « Profil et sécurité » et recherche « Profil, sécurité et sessions de connexion. ». Les treize parcours ne sont pas recomptés. |

La mesure du déclencheur de recherche passe de **36 à 40 px** sur ordinateur.
La navigation de base et la conservation du brouillon passent déjà ; ces
preuves ne démontrent pas la conservation initiale du contexte et du focus des
menus, ajoutée aux assertions finales.

Les **13 parcours finaux passent**, sans erreur JavaScript observée dans le
runner de navigation. Les [résultats intermédiaires](intermediaire-oracles-resultats.json)
conservent deux attentes de banc erronées : le GET de disponibilité
`/api/health/ready` du shell avait été compté comme une requête de recherche ;
le menu compte était cherché par son `aria-label` alors que son nom accessible
réel est **Menu utilisateur de E2E Admin**, via `aria-labelledby`. La capture
montrait déjà le menu ouvert. Le ciblage par son action Déconnexion et son
snapshot accessible confirment la visibilité et le focus ; aucun correctif
produit supplémentaire n'a été nécessaire pour ces deux attentes.

Captures inspectées : [shell à 1440 px](final-shell-1440.png),
[recherche à 1440 px](final-search-1440.png), [volet à 390 px](final-drawer-390.png)
et [déconnexion non confirmée](final-logout-csrf.png). Le toast « Connexion
réussie » encore visible sur certaines captures provient de la connexion
effectuée juste avant le scénario ; aucun succès de déconnexion n'est affiché
après un refus dans le build corrigé.
Après la dernière retouche de texte, le [contrôle ciblé](check-final-copy.cjs)
produit deux captures supplémentaires inspectées :
[menu compte](final-account-menu-1440.png) et
[résultat Mon compte](final-search-account-1440.png).

## Méthode des refus et réponses perdues

Le cas CSRF ne fabrique pas un refus serveur : `route.fetch()` transmet le POST
avec un en-tête CSRF volontairement incorrect, puis renvoie son vrai **403** au
navigateur. Aucune déconnexion n'est exécutée. Le **500** est injecté avant le
handler ; la session serveur doit également rester valide.

Pour la réponse perdue, `route.fetch()` exécute le vrai POST de déconnexion et
reçoit **200** après commit. Le retour au navigateur est ensuite interrompu.
Le banc vérifie la suppression de la seule session courante et l'ajout d'un
seul audit `LOGOUT`, puis GET `/api/auth/me` **401**. Le rejeu final doit être
explicite et recevoir **401**, signifiant ici une session déjà absente.

Sur le build final, les refus 403 puis 500 et la réponse perdue sont enchaînés
via **Réessayer la déconnexion**, sans recharger la page pour réafficher le
compte. La déconnexion normale du compte limité est également vérifiée. Les
contrôles du délai de 15 secondes et des courses de réponses appartiennent aux
tests du contexte, pas à cette campagne HTTP bornée. Le banc client montre les
états d'attente et d'incertitude injectés, sans exécuter l'API de déconnexion.

## Reproduction et limites

Créer un nouveau cluster exclusif aux cibles ci-dessus et préparer le compte
racine via `bun apps/web/scripts/e2e-setup.mjs`, avec `E2E_DATABASE_URL`
explicitement locale. Le script de préparation refuse une cible identique à
`DATABASE_URL` ; la variable d'application doit donc être retirée de ce seul
processus de préparation. Pour construire ou démarrer Next, l'injecter ensuite
explicitement depuis `E2E_DATABASE_URL`.

`AUDIT_ENV_FILE` désigne un `env.json` privé dans un dossier temporaire
`noctambule-navigation-*`, avec URL E2E, mot de passe fictif, clés audit/MFA et
origine du serveur. Les secrets TOTP sont conservés dans ce même dossier,
jamais dans les résultats. Après démarrage de Next en production :

```powershell
node docs/audits/navigation-generale-2026-10-12/banc-integration/run.cjs final
node docs/audits/navigation-generale-2026-10-12/banc-integration/run-logout.cjs final
```

Les phases `baseline` nécessitent le build initial. Le script de navigation a
été enrichi après les neuf parcours initiaux : les compteurs des JSON archivés
font foi, sans transformer rétrospectivement les nouveaux contrôles en preuves.

HTTP local sans proxy, appareils physiques, Safari/iOS, lecteur d'écran ou
extension Bitwarden. Les dimensions 390 et 1440 px ne constituent pas un audit
complet de tous les breakpoints. Les menus/catalogues sont réels et l'historique
navigateur est natif ; aucune recherche métier globale ou capacité future n'est
activée. La révocation est vérifiée après actualisation, pas instantanément
dans chaque onglet inactif. Aucun benchmark de charge n'est revendiqué.
Le changement de section d'une fiche après un long défilement n'est pas
exercé : cette piste de `PageSectionNavigation` reste distincte de la navigation
globale et conserve son état « à vérifier ».

## Nettoyage

Les treize parcours et le contrôle final des libellés sont terminés. Next 3127
et PostgreSQL 54640 ont été arrêtés et leurs ports vérifiés libres. Le chemin
temporaire exact, ses cibles locales et l'absence de jonction ont été contrôlés
avant suppression récursive. Le cluster, le fichier privé, les deux secrets
TOTP, les journaux et le marker ont été supprimés. Onze fichiers texte du banc
ont été comparés aux valeurs privées avant suppression : aucune occurrence.
Seuls scripts, résultats structurés et captures fictives restent archivés.
