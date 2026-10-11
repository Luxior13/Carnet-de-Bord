# Banc client — création d’un utilisateur, 11 octobre 2026

Ce banc charge la vraie page `/systeme/utilisateurs/nouveau`, ses composants,
`useCreateUser`, le garde de navigation, les dialogues et les feuilles de style
du dépôt. API, contexte de session, navigation Next, layout authentifié et
presse-papiers sont simulés. Toutes les identités et tous les mots de passe
visibles dans les captures sont **fictifs**. Aucun compte ou service réel n’est
contacté.

Depuis la racine du dépôt, avec les dépendances et Chromium déjà installés :

```powershell
node docs/audits/creation-utilisateur-2026-10-11/banc-client/run.cjs
```

Une exécution écrit son dossier temporaire en première ligne, avec observations
JSON et captures. Le serveur et Chromium se ferment à la fin. Pour isoler un
parcours, définir `AUDIT_ONLY` avec une partie de son nom, puis retirer cette
variable avant une passe complète.

## Verdict et périmètre

La [passe finale](preuves/observations.json) contient **28 scénarios réussis**.
Les scénarios de composition et de focus sont répétés à 320, 390, 768, 1 440 et
1 920 px ; les autres sont exécutés à 390 px. Les modifications produit prises
en compte sont celles de la page et du contrôleur de création du 11 octobre.
Le formatage ultérieur des fichiers du banc ne modifie pas les scénarios.

- Formulaire et succès : aucun débordement du document ou du contenu principal,
  prénom/nom/identifiant/contact longs, radios sélectionnables par flèches,
  désactivation du bouton tant que les champs minimaux sont vides.
- Saisie : attribut `autocomplete="off"`, nom facultatif, validation locale avant
  POST et focus du prénom invalide, erreur serveur liée à l’identifiant avec
  conservation du formulaire et focus du champ.
- Navigation : brouillon protégé, retour du focus sur Annuler après Rester,
  confirmation avant effacement du secret non conservé, retour au prénom après
  remise à zéro, conservation du `returnTo` filtré et rejet d’une URL externe.
- Envoi : deux soumissions dans le même événement produisent un seul POST,
  champs verrouillés et avertissement explicite avant départ pendant l’envoi.
- Reprise : erreur 500, recherche exacte `limit=1&loginName=camille.exemple`,
  absence puis relance explicite, compte trouvé sans secret récupérable, refus
  403 sans possibilité de relance aveugle. Horloge Chromium accélérée pour les
  délais POST de 30 s et vérification de 15 s ; aucun deuxième POST automatique.
- Succès : focus du titre, copie sans cocher la conservation, confirmation avant
  départ puis départ direct après conservation, échec de copie expliqué, ancien
  résultat asynchrone de copie A ignoré après remise à zéro et création B.
  Aucun mot de passe temporaire présent dans localStorage/sessionStorage.
- Accès : administrateur absent pour un créateur délégué, brouillon effacé à la
  révocation puis réattribution, réponse en attente ignorée après perte des
  droits, secret effacé après changement de compte. Ces assertions contrôlent
  le rendu et les réactions du client, pas l’autorisation du serveur.
- Défi administrateur : retour au bouton de soumission après annulation et
  focus du titre de succès après confirmation simulée du mot de passe/MFA.

Le lint ciblé de `app/systeme/utilisateurs/nouveau/page.tsx` passe. Les tests du
contrôleur, les contrôles globaux et l’intégration réelle sont consignés
séparément par la revue principale.

## Défaut et correction vérifiés

Après annulation du défi administrateur, le bouton de création perdait le focus.
Le [scénario avant correction](preuves/avant-focus-admin.json) échoue ; la
[passe ciblée après correction](preuves/apres-focus-admin.json) réussit pour
l’annulation et la confirmation suivie du succès.

La page reprend explicitement le focus du bouton de soumission s’il est encore
disponible. Pendant la relance, le bouton désactivé n’est pas refocalisé ; le
contrôleur peut placer le focus sur le succès ou l’erreur. Le retour fourni par
le garde de navigation est également branché au dialogue de départ.

Les retours après Rester dans le dialogue de brouillon et dans la confirmation
« Créer un autre » fonctionnaient déjà aux cinq largeurs avant correction ; ils
ne sont pas présentés comme des défauts résolus. La composition de
`CreateUserParts`, `CreationFeedback` et `NewUserSuccess` est conservée.

Le texte du contact ne promet plus une récupération de compte : il rappelle son
rôle de contact, distinct de l’identifiant de connexion, conformément à la règle
courante. Ce changement rédactionnel ne crée aucun parcours d’authentification.

## Captures et limites

[Succès fictif à 320 px](preuves/succes-fictif-320.png) ·
[Succès fictif à 1 440 px](preuves/succes-fictif-1440.png).

Le cadre simulé réserve 240 px à la navigation à partir de 1 024 px et utilise
Arial ; il ne remplace pas le vrai shell Next, sa police, le menu mobile ou les
mesures d’intégration. La session, PostgreSQL, les permissions du serveur, le
CSRF, le vrai presse-papiers, les preuves mot de passe/MFA et la première connexion
ne sont pas validés ici. Aucun lecteur d’écran, zoom natif, appareil tactile réel
ou gestionnaire de mots de passe externe n’est utilisé. Les attributs du site ne
prouvent pas qu’une extension respectera la demande de désactivation.
