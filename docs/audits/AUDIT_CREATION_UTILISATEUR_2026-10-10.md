# Audit — Création d'utilisateur — 10 octobre 2026

## Périmètre et verdict

Demande : passer à `/systeme/utilisateurs/nouveau`, après les corrections de
liste et la couleur des avatars. **Analyse de la page et de son POST ; aucun
code produit corrigé pendant cette passe. Corrections nécessaires.** Le gabarit
est cohérent avec la référence, mais certains états du formulaire restent fragiles.

- Base de travail : commit `2f8db36`, avec les modifications locales précédentes
  de liste, navigation, radios de création, avatars et documentation conservées.
- Sources : [page](../../apps/web/src/app/systeme/utilisateurs/nouveau/page.tsx),
  [POST](../../apps/web/src/app/api/users/route.ts),
  [création transactionnelle](../../apps/web/src/shared/server/auth.ts),
  [validation partagée](../../apps/web/src/shared/utils/zod.utils.ts), garde de
  navigation, primitives et dialogue de confirmation d'identité.
- Suivi propriétaire : [Utilisateurs](../qualite/pages/systeme-utilisateurs.md).
  La liste, les mutations des fiches et la connexion ne sont pas réauditées ici.
- Chromium 149.0.7827.55 : vrais composants, CSS du dépôt et garde de navigation ;
  utilisateur, réponses API et routage Next simulés. Shell reproduit à 264 px
  de sidebar sur ordinateur et header de 56 px ; police de repli Arial.
- Sept largeurs, 1 920 / 1 440 / 1 120 / 1 024 / 768 / 390 / 320 px, hauteur
  900 px. Comptes et secret affiché entièrement fictifs. Aucune base consultée
  ni mutation réelle de compte, aucun message envoyé à une personne.

## Sélection des sujets

Niveau sensible : création d'accès et remise d'un secret. Les fiches pertinentes
ont été consultées après la revue générale ; les constats ne valent pas une
validation de l'ensemble de l'authentification.

| Classement | Sujets et raison |
| --- | --- |
| À examiner | Q01–Q04, Q06–Q07 : besoin, parcours, présentation, accessibilité, saisies et erreurs |
| À examiner | Q09–Q12, Q14–Q15 : droits, secret, données, contraintes, concurrence et audit |
| À examiner | Q17, Q19, Q27–Q28, Q30 : coût apparent, responsabilités, preuves, erreurs et suivi |
| Non applicable | Q05 : pas de liste à paginer ; Q08 : aucun envoi ou rappel requis par ce formulaire |
| Non applicable | Q18, Q21, Q23, Q26 : aucun besoin de cache, import/export, automatisation ou finance |
| Hors impact | Q13, Q16, Q20, Q22, Q24–Q25, Q29 : pas de migration, suppression, fichier téléversé, période métier, structure juridique, fiche Personne ou sauvegarde modifiée |

## Ce qui fonctionne sur le périmètre vérifié

- Champs utiles, compte distinct d'une personne ; prénom et identifiant requis,
  nom et contact facultatifs dans la validation métier. Normalisation des espaces
  et de la casse. Limites de taille et validation stricte également au serveur.
- Hero, carte unique, sections, badges et avatar partagé suivent la référence.
  Le formulaire reste défilant sur petit écran ; sa hauteur seule n'est pas un défaut.
- Erreur locale : focus placé sur le premier champ invalide ; aucune requête
  envoyée pour le scénario prénom blanc / identifiant trop court.
- Départ avec brouillon : dialogue d'alerte ; « Rester » conserve les valeurs.
  Le lien de fiche après création conserve le `returnTo` sûr vers la page 2.
- Droit `users:create` exigé par le POST ; un profil sans ce droit ne monte pas
  le formulaire dans le banc. Un administrateur non protégé ne voit que USER.
  Le serveur réserve ADMIN au compte protégé avec preuve MFA récente.
  L'ouverture du dialogue après `REAUTHENTICATION_REQUIRED` est vérifiée.
- Succès simulé sans nom : confirmation affichée, copie du secret via presse-papiers
  simulé, aucune sauvegarde de ce secret dans `sessionStorage` observée.
- Code serveur : mot de passe aléatoire haché, changement obligatoire à la première
  connexion, compte + réservation permanente d'identifiant + audit dans la même
  transaction. Collision de réservation et conflit d'unicité couverts par tests
  avec dépendances simulées ; aucun secret dans les métadonnées d'audit relues.
- Protections communes relues/testées : contrôle de session, CSRF, API privées
  sans cache et limitation des requêtes. Aucun test d'intrusion global revendiqué.

## Constats

Tous les points ci-dessous sont ouverts, responsable à attribuer. Les reproductions
et mesures brutes figurent dans les [résultats](utilisateur-nouveau-2026-10-10/resultats.json).

### USR-N01 — P2, défaut : radios masquées provoquant un débordement

`RoleOption` compose maintenant `Input` avec `sr-only`. La primitive apporte aussi
`w-full`, hauteur, bordure et padding de champ texte. Le contrôle masqué conserve
ainsi une largeur importante en position absolue : 787 px à une fenêtre de 1 120 px.
Le `main` déborde de **363 px** dans ce scénario ; 70 px à 1 440, 368 à 768,
13 à 320/390, aucun à 1 920. Le document global, lui, ne déborde pas.

Preuve d'isolation : imposer uniquement 1 × 1 px, padding et bordure nuls aux
radios dans le DOM ramène le débordement de 363 à **0 px**. Cette expérience
n'a pas modifié le code produit. Le focus clavier observé n'a pas déplacé
horizontalement le `main` ; ne pas lui attribuer un saut non reproduit.

La correction antérieure USR-10 validait les primitives et le choix au clavier,
pas ces dimensions. Adapter les radios à leur usage masqué, puis rejouer les
largeurs et la navigation clavier. [Capture à 1 120 px](utilisateur-nouveau-2026-10-10/radio-focus-1120.png).

### USR-N02 — P2, défaut : nom facultatif annoncé obligatoire au navigateur

Le label dit « Nom (facultatif) », alors que `#newLastName` conserve `required`.
Le formulaire utilise `noValidate` et sa validation accepte la chaîne vide :
ceci ne bloque pas la création, mais expose une sémantique contradictoire aux
technologies d'assistance. Retirer cet attribut sans rendre le nom obligatoire
côté serveur. L'optionalité est une décision explicite du projet.

### USR-N03 — P2, défaut : erreurs serveur absentes des champs et non persistantes

L'adresse `a..b@example.test` passe la regex du client, mais est refusée par le
schéma email Zod utilisé au serveur. La réponse contient `details.contactEmail` ;
la page ne lit que `error.message`. Résultat : « Données invalides » dans un toast,
`aria-invalid="false"` et aucune explication près du champ.

Même problème pour un identifiant déjà utilisé : aucune erreur dans le formulaire,
et le message n'est plus visible après 4,8 secondes dans le banc. Une erreur
réseau conserve bien la saisie, mais n'a aucune alerte locale persistante.
[État après disparition du toast](utilisateur-nouveau-2026-10-10/doublon-apres-toast.png).

Aligner la validation utile, afficher les détails sur les champs et garder une
erreur de commande persistante quand aucun champ ne convient. Réessayer avec
les valeurs conservées. Respecter la [politique de feedback](../references/FEEDBACK.md).

### USR-N04 — P2, défaut : focus perdu après succès et remise à zéro

Après disparition du bouton de soumission, `document.activeElement` est `BODY`.
Même résultat après « Créer un autre ». Aucun focus programmé sur le titre de
confirmation ou le premier champ. Sur le scénario mobile, la confirmation et
le secret restent visibles : aucune perte de défilement verticale affirmée.

Prévoir un focus utile après ces deux transitions sans ouvrir automatiquement
le presse-papiers. [Confirmation mobile](utilisateur-nouveau-2026-10-10/succes-390.png).

### USR-N05 — P2, défaut de message : quitter pendant une création

Durant un POST retardé, les champs et « Annuler » restent utilisables. Le dialogue
dit « Quitter sans enregistrer ? » alors que la demande est déjà partie. Il ne
mentionne pas l'opération en cours ; aucun protocole d'annulation serveur n'existe.
Le banc choisit « Rester » et reçoit ensuite le succès : il ne prouve pas une
création réellement abandonnée en base.

Distinguer brouillon et demande en cours, bloquer la répétition immédiate au
niveau du handler et préciser que quitter ne garantit pas l'annulation. Ne pas
présenter un simple abandon réseau comme un rollback du compte.

### USR-N06 — P2, risque de reprise : réponse perdue après validation serveur

Lecture du contrat : si l'écriture réussit mais que sa réponse est perdue, le
client annonce une erreur générique. Une nouvelle tentative avec le même
identifiant est refusée ; le secret initial n'est plus récupérable depuis cette
page. La contrainte unique évite un doublon, mais ne guide pas la récupération.
Scénario de commit puis coupure **non exécuté sur PostgreSQL pendant cet audit**.

Définir une reprise explicite : vérifier le compte créé puis proposer la voie
autorisée d'émission d'un nouveau mot de passe. Ne pas stocker le secret en clair
pour rendre le POST rejouable. Vérifier avec une base isolée avant de clore ce point.

### USR-N07 — suggestion : confirmer la remise du secret avant de l'effacer

« Créer un autre » efface immédiatement le secret et le succès ; aucune étape
ne vérifie sa remise. Le texte prévient déjà qu'il faut le communiquer une fois.
Envisager un repère de copie/remise et une confirmation ciblée avant effacement
si l'usage le justifie. Ce n'est pas une nouvelle obligation de confirmation pour
toutes les navigations, ni une demande d'ajouter un email automatique.

## Contrôles et limites

Depuis `apps/web`, sans cache Turbo :

```text
bun run test src/__tests__/users-access-hardening.test.ts src/__tests__/auth-transactions.test.ts src/__tests__/unsaved-navigation-history.test.ts src/__tests__/shadcn-boundaries.test.ts src/__tests__/api-auth.test.ts src/__tests__/middleware-security.test.ts
bun run typecheck
bunx eslint src/app/systeme/utilisateurs/nouveau/page.tsx src/app/api/users/route.ts
bun run check:architecture
```

**185 tests réussis sur six fichiers ; TypeScript, lint ciblé et architecture
réussis.** Ces suites couvrent aussi des routes voisines ; ce ne sont pas 185
scénarios navigateur du formulaire. Pas de nouveau build pour cette analyse.

Documentation : `bun run docs:check` réussi (176 fichiers, 898 liens locaux et
index contrôlés) et `git diff --check` réussi. Serveur et navigateur du banc
fermés, script temporaire retiré ; seules les preuves fictives sont conservées.

Chromium : sept largeurs, scénarios ci-dessus, aucune erreur JavaScript capturée.
Les essais ne valident ni session réelle, ni transaction PostgreSQL, ni défi MFA
complet, ni première connexion du compte créé. La copie utilise une simulation du
presse-papiers, pas les permissions d'un appareil réel. Aucun lecteur d'écran,
Safari réel, zoom natif, extension d'autocomplétion ou test de charge exécuté.

Les limites d'intégration et de confidentialité organisationnelle déjà suivies
restent ouvertes. La prochaine passe doit corriger les défauts observés puis
valider création USER/ADMIN, unicité, audit atomique et reprise sur base isolée.

Captures supplémentaires : [ordinateur](utilisateur-nouveau-2026-10-10/formulaire-1440.png),
[mobile](utilisateur-nouveau-2026-10-10/formulaire-390.png),
[320 px](utilisateur-nouveau-2026-10-10/formulaire-320.png),
[confirmation ordinateur](utilisateur-nouveau-2026-10-10/succes-1440.png).
