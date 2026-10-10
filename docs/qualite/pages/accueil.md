# Suivi — Accueil / Mon travail

## État courant — 10 octobre 2026

- Route `/`, page privée du pôle Aujourd’hui, libellé de navigation « Mon travail ».
- [Implémentation](../../../apps/web/src/app/page.tsx) : salutation et texte
  d’attente dans le gabarit partagé. Aucun tableau de tâches ou synthèse métier
  n’est rendu actuellement.
- Le chantier « Mon travail & espace personnel » reste une extension dans la
  [feuille de route](../../references/FEUILLE_DE_ROUTE.md). Une page accessible
  ne signifie pas que ses futures capacités sont livrées.

## Décisions et questions au prochain changement

Les futures vues personnelles consulteront les données des modules propriétaires
avec leurs droits ; elles ne créeront pas de copies de tâches, documents ou dates.
Définir d’abord l’action utile du compte connecté, la fraîcheur des chiffres,
leurs sources et le comportement quand aucune donnée n’est disponible.

Pour modifier le contenu actuel : Q01–Q04, Q09, Q19 et Q27. Toute agrégation
ajoutée réactive Q05/Q17 ; une action ou donnée personnelle demande aussi les
fiches correspondantes. Les notifications et traitements différés ne sont pas
imposés par le nom « Mon travail ».

## Vérifications et points ouverts

La [cartographie du 10 octobre](../../audits/COMPREHENSION_PROJET_2026-10-10.md)
constate le code actuel et la redirection anonyme vers la connexion. Aucun
parcours authentifié de l’accueil n’a été exécuté pendant cette passe.

| ID | Point et preuve | Suite / déclencheur | Responsable / état |
| --- | --- | --- | --- |
| ACC-01 | Un ancien scénario E2E attend un lien Mon compte dans le contenu principal, absent de la page actuelle ; constat de code | Réconcilier le scénario avec la navigation réelle puis l’exécuter sur environnement E2E isolé lors de la reprise de cette suite | À attribuer / ouvert |
| ACC-02 | Les vues métier personnelles restent futures | Cadrer source, droits et critère de livraison à l’ouverture de ce chantier | À attribuer / à cadrer |

Ce suivi documente l’état observé ; il ne clôt aucun parcours privé non exercé.
