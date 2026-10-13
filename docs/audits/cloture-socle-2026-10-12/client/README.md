# Clôture du socle — contrôles client

Revue des **onze pages actives**, commencée le 12 octobre 2026 sur `c54e5d8`
propre, avec finalisation documentaire après minuit le 13 octobre. Les
[preuves de clôture](../) restent distinctes des anciens audits.
Les sources du dépôt ont été recompilées pour chaque banc ; aucun résultat
historique n'est compté comme une nouvelle réussite.

## Résultat et corrections

**18 bancs, 401 observations réussies**, puis **six nouveaux cas de reprise de
fiche réussis**. Une observation peut être une largeur ou une variante d'un
même parcours : ce ne sont pas 407 fonctions métier distinctes. Les reprises
ciblées d'un scénario déjà compté ne sont pas additionnées une deuxième fois.

Deux familles de défauts ont été reproduites et corrigées :

- Fiche utilisateur : GET de vérification sans borne après reset MFA incertain,
  quatre sauvegardes PATCH et suppression DELETE encore en attente à 31 secondes.
  Chaque requête est maintenant bornée à 30 secondes, lecture du corps comprise.
  Le timeout libère les commandes ; il ne prétend pas annuler une écriture
  serveur. Le brouillon et le résultat incertain restent visibles, et une
  relecture explicite précède toute nouvelle tentative. La suppression ne se
  rejoue pas automatiquement et demeure bloquée avant cette vérification.
- Fil d'Ariane : lorsque CSS masque le lien focalisé avant l'événement de
  redimensionnement, le focus revient à `body` et l'ancien test de propriété
  le perd. La destination précédemment focalisée est désormais mémorisée,
  effacée lors d'un déplacement hors navigation, puis remplacée par le contrôle
  visible. Les deux sens et la préservation d'une saisie extérieure passent.

Preuves avant : [GET](preuves/fiche-relecture-avant.json),
[quatre PATCH](preuves/fiche-sauvegardes-avant.json),
[DELETE](preuves/fiche-suppression-avant.json),
[fil d'Ariane](preuves/navigation-avant.json).
Après : [six reprises](preuves/fiche-six-reprises-apres.json),
[fiche complète](preuves/fiche-utilisateur-2026-10-11.json),
[navigation complète](preuves/navigation-generale-2026-10-12.json).

Le premier essai du cas de relecture cherchait « Annuler » au lieu du bouton
« Fermer » du résultat incertain, puis distinguait mal ce bouton de la croix.
Ces erreurs de sélecteur ne sont pas des défauts produit. Le vieux cas de focus
des sessions lisait `activeElement` avant la trame de restitution : il attend
maintenant explicitement le titre, au lieu d'un instant arbitraire. Les anciennes
preuves datées de ce banc sont inchangées.

## Inventaire fini des pages et parcours

| Page active | Parcours, états et consommateurs contrôlés | Preuve actuelle |
| --- | --- | --- |
| `/` | Salutation, prénom long/absent, actualisation du compte au même montage, lien Mon compte, six largeurs | [8](preuves/accueil-2026-10-12.json) |
| `/login` | Identifiants, MFA et secours, configuration, double soumission, expiration, réponses perdues, stockage refusé, collage, destination interne, clavier/modal obligatoire | [30](preuves/connexion-2026-10-12.json) |
| `/mon-compte` | Profil, fusion de conflit, contact/version figée, lecture seule, changement mot de passe normal/forcé, codes MFA/configuration, copie/départ, sessions | [23](preuves/mon-compte-2026-10-11.json) + [8 reprises sécurité](preuves/mon-compte-securite-2026-10-12.json) |
| `/systeme/utilisateurs` | Recherche, filtres/compteurs, pagination lente/erreur, droits/colonnes, retour, historique, refus JSON/non JSON, focus et noms longs | [42](preuves/utilisateurs-2026-10-11.json) |
| `/systeme/utilisateurs/nouveau` | Création USER/ADMIN, permissions, preuve, secret temporaire/copie/départ, doublons, reprise exacte, réponse ancienne/délai | [28](preuves/creation-utilisateur-2026-10-11.json) + [6 reprises/défi](preuves/creation-utilisateur-reprise-2026-10-12.json) |
| `/systeme/utilisateurs/[id]` | Profil/contact/identifiant, autorisations configurées et effectives, autonomie, état, conflits, versions, périmètre SSR/acteur, mot de passe/MFA, sessions et suppression | [46](preuves/fiche-utilisateur-2026-10-11.json) + [11 sessions](preuves/utilisateur-sessions-2026-10-12.json) + [6 délais](preuves/fiche-six-reprises-apres.json) |
| `/systeme/parametres` | Unique durée de conservation, bornes, retour au défaut, réduction/preuve, réparation invalide, conflit, perte de réponse, accès retiré, focus | [30](preuves/parametres-complet-2026-10-11.json) |
| `/systeme/feuille-de-route` | 39 cartes, pôles/étapes/recherche combinés, URL/historique, remise à zéro, noms des disclosures, clavier et lecture responsive | [18](preuves/feuille-de-route-2026-10-12.json) |
| `/membres/repertoire` | Données longues, recherche/filtres/synthèse, URL, pagination, réponse ancienne, refus, indisponibilité, vide et reprise | [41](preuves/repertoire-2026-10-11.json) |
| `/membres/repertoire/nouveau` | Identité minimale, statut, validation native/serveur, disponibilité sans perte, droits/compte, double soumission, départ, résultat incertain et succès sans navigation | [28](preuves/creation-personne-2026-10-12.json) |
| `/membres/repertoire/[id]` | Identité et coordonnées email/téléphone/social, validation, versions/fusion, principal, provenance, lecture seule, refus/scope/ancien résultat, suppression et clé de reprise | [30](preuves/fiche-personne-2026-10-12.json) |

## Composants transverses

| Famille | Consommateurs et couverture | Preuve actuelle |
| --- | --- | --- |
| Cadre, sidebar, Rubriques, compte, breadcrumb, recherche | Menu conservé pendant garde, annulation/confirmation, clavier, resize, déconnexion affichée sans identité | [17](preuves/navigation-generale-2026-10-12.json) |
| Navigation de sections | `PageSectionNavigation` dans le cadre réel et garde réelle ; trois fiches consommatrices exercées aussi dans leurs bancs | [8](preuves/navigation-sections-2026-10-12.json) |
| Champs et commandes | Input/Textarea/Label/Checkbox/Switch/Select/Command/Button ; focus, indéterminé, attente, collage, autocomplétion off, couleurs forcées et tactile | [14](preuves/composants-2026-10-11-banc-primitives.json) |
| Barres d'enregistrement | Créations, profil/accès/autonomie/état utilisateurs, profil Mon compte, identité personne, réglage inline ; submit, attente, Annuler et conflit | Bancs des pages ci-dessus |
| Dialogues et confirmations | Mot de passe forcé, MFA/setup/codes/récupération/admin, contact, coordonnées/principal, suppressions, garde de brouillon, preuve de réduction/réparation | Bancs des pages et de navigation ci-dessus |
| Erreur/404/chargement | Reprise native, focus, liens, message sûr/digest long, main public/privé, annonces, faible hauteur et texte agrandi | [13](preuves/etats-techniques-2026-10-12.json) |

Les schémas d'identité personne ont reçu une validation partagée supplémentaire
pendant la passe serveur. Les cas de validation des deux formulaires ont été
[rejoués en création](preuves/creation-personne-2026-10-12-cible.json) et
[en fiche](preuves/fiche-personne-2026-10-12-cible.json) après ce changement ; ils
restent inclus dans leurs totaux précédents, sans nouvelle addition.

## Exécution, état des sources et limites

```powershell
node docs/audits/cloture-socle-2026-10-12/client/run.cjs
node docs/audits/cloture-socle-2026-10-12/client/run-detail-recovery.cjs
```

Le premier script accepte des fragments de noms de banc comme arguments ;
`CLOSURE_ONLY` restreint les scénarios. Le second utilise le montage existant
de fiche, sans dupliquer ce banc ; `CLOSURE_BEFORE=1` charge uniquement le
composant historique de `c54e5d8` pour reproduire l'attente. Cette substitution
n'est jamais activée dans les contrôles finaux.

Les dates des dossiers désignent les anciens protocoles réutilisés. Les champs
externes `startedAt`/`completedAt` des nouvelles archives donnent l'exécution
effective ; certaines propriétés internes `date` sont des constantes anciennes
du runner et ne datent pas cette nouvelle exécution. Les sources client affectées
par les corrections ont été rejouées ensuite ; le [manifeste](synthese.json)
regroupe les résultats et empreintes des fichiers corrigés.

- Chromium seulement ; tailles regroupées de 320 à 1 920 px selon les bancs,
  avec états à faible hauteur, mouvement réduit, couleurs forcées et texte
  agrandi là où le protocole le prévoit. Aucun contrôle Safari/iOS, lecteur
  d'écran ni extension de gestion de mots de passe n'est revendiqué.
- Composants et CSS réels ; API, utilisateur, permissions reçues, disponibilité
  et navigation simulés. Certains bancs testent le cadre complet, d'autres un
  inset desktop de 240 px. Polices de Next absentes ou remplacées : les mesures
  finales du vrai cadre et de ses polices appartiennent à l'intégration root.
- Les horloges contrôlées exercent les délais et réponses tardives, sans prouver
  l'annulation d'une transaction ni la résistance à une charge réelle.
- Les redirections historiques, l'authentification serveur, les droits SQL,
  cookies/CSRF/CSP, le rechargement et l'historique Next réels, les migrations,
  la sauvegarde/restauration et les performances relèvent des bancs distincts.
- Actualités, journal global, historique utilisateur dormant et fonctions
  futures de Mon travail ne sont pas des pages livrées : aucun faux parcours
  ni écran futur n'a été ajouté pour les inclure dans ce contrôle.
- Quatre tests unitaires nouveaux du helper passent : délai des en-têtes et
  du corps, reprise avec durée de vie intacte, refus préservé pour preuve et
  500 incertain sans rejeu. Types, lint ciblé et budget d'architecture passent.

## Qualification complémentaire du smoke réel

Le smoke canonique injectait un second Échap dès l’autofocus de la confirmation
imbriquée d’une coordonnée, avant la fin de son ouverture. Le
[diagnostic initial](preuves/confirmation-qualification-avant.json) distingue
cette injection immédiate (confirmation conservée) d’un geste après ouverture
(confirmation fermée, saisie conservée). Aucun produit n’a été modifié pour ce cas.

Le [rejeu ciblé](preuves/confirmation-qualification-apres.json) attend les véritables
promesses `animation.finished`, sans délai fixe : deux parcours réussis à 390 et
1 280 px, avec deux cycles chacun (Échap puis Rester), retour du focus au champ,
brouillon conservé et sortie confirmée ensuite. Le
[runner](run-child-escape.cjs) réutilise les composants/CSS de la fiche Personne,
avec API/session/navigation simulées ; ces deux observations complémentaires ne
s’ajoutent pas aux 401 du manifeste. Le smoke réel conserve son assertion Échap et
la même synchronisation. Le double événement injecté dans la frame d’ouverture
n’est pas revendiqué comme un comportement validé.

Cette passe est conforme dans la portée contrôlée, sans défaut client confirmé
restant ouvert. Elle ne promet pas l'absence de tout bug. Aucune nouvelle
capture n'est conservée pour répéter un écran inchangé ; les observations DOM,
requêtes et transitions sont archivées. Les temporaires de cette passe sont
supprimés après archivage, sans toucher aux fichiers de travail des autres agents.
