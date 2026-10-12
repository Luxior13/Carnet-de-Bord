# Suivi — Accueil / Mon travail

## État courant — 12 octobre 2026

- Route `/`, page privée du pôle Aujourd’hui, libellé de navigation « Mon travail ».
- [Implémentation](../../../apps/web/src/app/page.tsx) : salutation du compte
  courant dans `PageIdentityHero`, identité « Mon travail », texte explicite
  d'espace en préparation et accès direct « Mon compte ». Aucun tableau de
  tâches ou synthèse métier n'est rendu actuellement.
- Le prénom suit `useUser`, initialisé par le layout serveur et actualisé par
  Mon compte. Il n'est plus conservé dans un ancien rendu de l'accueil lors
  d'un retour navigateur. Repli « Bienvenue » si le prénom est absent ou vide.
- L'accueil reste protégé par le layout serveur ; le droit `dashboard:view`,
  toujours actif dans le socle, et les alias de navigation sont conservés.
- L'ancien composant de tableau de bord, son API `/api/dashboard`, son service
  et ses types sans consommateur ont été retirés. Aucun schéma, donnée ou
  règle de permission n'a changé.
- Le parcours connexion MFA → accueil → Mon compte utilise désormais la
  version du profil après l'écriture de dernière connexion. La première
  sauvegarde ne provoque plus un conflit artificiel dû à une ancienne version
  dans la réponse MFA ; les vrais conflits concurrents restent contrôlés.
- Le chantier « Mon travail & espace personnel » reste une extension dans la
  [feuille de route](../../references/FEUILLE_DE_ROUTE.md). Une page accessible
  ne signifie pas que ses futures capacités sont livrées.

## Décisions et questions au prochain changement

Les futures vues personnelles consulteront les données des modules propriétaires
avec leurs droits ; elles ne créeront pas de copies de tâches, documents ou dates.
Définir d’abord l’action utile du compte connecté, la fraîcheur des chiffres,
leurs sources et le comportement quand aucune donnée n’est disponible.

Le contenu actuel tient dans un bandeau partagé et une action de navigation :
ni tableau, onglets, formulaire ni barre d'enregistrement ne sont nécessaires.
Le texte du registre alimente aussi la recherche globale ; conserver une
description propre à l'accueil évite de le confondre avec la destination
Mon compte. La salutation utilise l'identité commune, sans nouvelle requête
de synthèse ni copie locale du profil.

Pour modifier le contenu actuel : Q01–Q04, Q09–Q11, Q19 et Q27. Toute agrégation
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

La [revue du 12 octobre](../../audits/AUDIT_ACCUEIL_2026-10-12.md) reproduit
réellement le prénom obsolète après modification dans Mon compte et retour
navigateur, puis corrige sa source et retire la chaîne inutilisée. Les résultats
du banc client sont **8/8 réussis**, avec identité et navigation simulées :
six largeurs, lien au clavier, prénom long, repli et changement du compte
courant. **Huit parcours Next/PostgreSQL réels réussissent** après connexion
MFA, dont la première sauvegarde de profil sans conflit indu (ACC-06), le
retour navigateur avec prénom à jour et les refus d'accès. Le cadre complet
est contrôlé à sept largeurs. Le retrait compte 175 tests ciblés réussis ;
la version de profil, 72 tests ciblés dont deux nouvelles régressions simulées.
La suite web finale compte **1 235 réussis, 117 ignorés** ; build, types, lint,
architecture et budget de performance passent. Les validations des 10 et
11 octobre ci-dessus gardent leur portée historique ; lecteur d'écran,
appareils physiques et synchronisation instantanée entre appareils ne sont
pas qualifiés par cette passe.

| ID | Point et preuve | Suite / déclencheur | Responsable / état |
| --- | --- | --- | --- |
| ACC-01 | Lien Mon compte et accès privé vérifiés après connexion MFA réelle le 12 octobre | Réexaminer lors d'une évolution de navigation ou de la garde privée | Clos après vérification |
| ACC-02 | Les vues métier personnelles restent futures | Cadrer source, droits et critère de livraison à l’ouverture de ce chantier | À attribuer / à cadrer |
| ACC-03 | Ancien prénom au retour navigateur corrigé par la lecture du contexte courant ; nouveau prénom observé immédiatement au retour puis après rechargement réel | Réexaminer si la source d'identité ou la navigation change | Clos après vérification |
| ACC-04 | Chaîne de synthèse sans consommateur et treize tests devenus sans objet retirés ; références, tests ciblés, build, ancienne API en 404 et absence de chargement de synthèse contrôlés | Cadrer le besoin avant toute nouvelle agrégation métier | Clos après vérification |
| ACC-05 | Identité Mon travail et texte d'espace en préparation clarifiés, sans fonction métier ajoutée | Bandeau, lien et rendu vérifiés dans les bancs client et réel ; amélioration, pas défaut bloquant | Réalisée et vérifiée le 12 octobre |
| ACC-06 | Projection du profil après écriture de session utilisée dans la réponse MFA ; version exacte et premier PATCH 200 vérifiés en réel, deux régressions simulées ajoutées | Réexaminer si création de session ou projection de connexion change | Clos après vérification |

Les clôtures concernent les scénarios exercés et les limites du rapport ; elles
ne valident pas les vues métier encore prévues sous ACC-02.
