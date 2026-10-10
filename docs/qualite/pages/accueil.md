# Suivi — Accueil / Mon travail

## État courant — 11 octobre 2026

- Route `/`, page privée du pôle Aujourd’hui, libellé de navigation « Mon travail ».
- [Implémentation](../../../apps/web/src/app/page.tsx) : salutation et texte
  d’attente dans le gabarit partagé, avec accès direct « Mon compte ». Aucun tableau de tâches ou synthèse métier
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

Le [contrôle du 11 octobre](../../audits/AUDIT_PAGES_RESTANTES_2026-10-11.md)
ajoute le lien « Mon compte » au bandeau partagé. Rendu du composant à 320,
390, 768 et 1 440 px sans débordement ni erreur JavaScript dans le navigateur
isolé ; contexte de session et cadre simulés. La suite web réussit, mais l’ancien
E2E authentifié n’a pas été rejoué. Aucun indicateur métier fictif n’est ajouté.

| ID | Point et preuve | Suite / déclencheur | Responsable / état |
| --- | --- | --- | --- |
| ACC-01 | Le lien Mon compte est désormais présent et son rendu vérifié le 11 octobre dans le banc isolé | Rejouer l’E2E avec la session dédiée lors de la reprise de cette suite | À attribuer / corrigé, intégration à vérifier |
| ACC-02 | Les vues métier personnelles restent futures | Cadrer source, droits et critère de livraison à l’ouverture de ce chantier | À attribuer / à cadrer |

Ce suivi documente l’état observé ; il ne clôt aucun parcours privé non exercé.
