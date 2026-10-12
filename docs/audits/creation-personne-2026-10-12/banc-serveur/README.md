# Création Personne — banc serveur du 12 octobre 2026

Ce banc exerce `POST /api/personnes` avec une base PostgreSQL 17 entièrement
migrée. Les **16 scénarios SQL réussissent**, ainsi que 53 tests existants
ciblés. Le défaut REP-N05, limité aux indices d’avertissement des profils sociaux
initiaux, est reproduit avant correction puis revérifié. Départ : `5706bba`,
arbre propre. [Résultats structurés](observations.json).

## Environnement et reproduction

- Base jetable dédiée `person_creation_service_test`, loopback `127.0.0.1`,
  port `54610`. Elle est distincte de la base du navigateur `person_creation_test`.
  Les 52 migrations existantes ont été appliquées avec le wrapper
  `packages/database/scripts/safe-migrate-deploy.ts` et une `DATABASE_URL`
  explicitement dirigée vers la base jetable. Aucun changement de schéma.
- Le [test exécutable](../../../../apps/web/src/__tests__/person-creation-postgres.test.ts)
  exige `PERSON_CREATION_TEST_DATABASE_URL` et refuse une autre cible. Sans
  variable, il est ignoré. Il ne crée ni ne migre automatiquement une base.
- Comptes, personnes, coordonnées, sessions et clés sont fictifs. Les cookies
  et en-têtes Next sont simulés ; le contrôle de session lit réellement SQL.
  Les sessions MFA sont préparées comme fixtures : ce banc ne rejoue pas le
  mot de passe ni la saisie TOTP du formulaire de connexion.
- Les protections d’accès, permissions effectives, limiteur SQL, validation,
  disponibilité des clés, service de création, chiffrement et audits sont réels.
  Aucun mock du service métier ni de la transaction.
- Aucun vidage de table ni suppression de données préexistantes. Les fonctions
  et triggers de panne sont limités à l’acteur fictif du scénario et retirés
  dans un `finally`. Les fixtures et audits restent dans cette base jetable
  jusqu’au nettoyage du cluster par le banc d’intégration.

Depuis la racine, après préparation de cette base et des migrations :

```powershell
$env:PERSON_CREATION_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:54610/person_creation_service_test?schema=public'
Push-Location apps/web
bun run test src/__tests__/person-creation-postgres.test.ts src/__tests__/persons-schemas-normalization.test.ts src/__tests__/persons-routes-permissions.test.ts src/__tests__/person-duplicate-detection.test.ts src/__tests__/person-user-isolation.test.ts src/__tests__/person-audit-encryption.test.ts
Pop-Location
Remove-Item Env:PERSON_CREATION_TEST_DATABASE_URL
```

## Vérifications exécutées

| Scénario | Résultat SQL observé |
| --- | --- |
| Anonyme | 401, aucune fiche |
| Lecture seule et création sans droit de lecture | Deux cas 403, aucune fiche ; `persons:create` dépend bien de `persons:view` |
| Droit de création retiré en session | Requête suivante refusée 403 |
| Compte désactivé, version de sécurité périmée, mot de passe temporaire | Trois refus 401/401/403, aucune fiche |
| Pseudo seul | Trim, normalisation de recherche, statut extérieur par défaut, version 1 ; aucune création de compte User |
| Identité civile | Prénom/nom sans pseudo acceptés ; naissance bissextile conservée comme date civile |
| Validation | Identité absente/incomplète, pseudo vide ou trop long, dates invalides/futures, champ inconnu et onzième email refusés ; aucune fiche partielle |
| Homonymes concurrents | Deux créations 201, identifiants distincts, deux audits, aucun faux avertissement de doublon d’identité |
| Coordonnées initiales | Normalisation email, pays du téléphone, principale automatique ; coordonnées partagées acceptées avec avertissement sans identifiant d’une autre personne |
| Réseaux intercalés | Avertissement rattaché à l’indice d’entrée correct ; choix explicite de la principale conservé |
| Panne d’AuditLog puis panne d’AuditFieldChange | Deux scénarios : rollback de l’identité, des coordonnées, de l’audit et de l’historique ; nouvelle tentative explicite ensuite réussie |
| Clé d’audit absente | 503, aucune fiche |

L’audit du pseudo est déchiffré avec la clé fictive pour comparer la valeur
conservée ; ses colonnes en clair sont nulles. Le statut demeure un champ
d’historique non sensible. La réponse exclut les colonnes internes de recherche.

La dernière commande du 12 octobre à 19 h 37, heure de Paris, réussit avec
**69 tests sur six fichiers : 16 SQL et 53 existants**. TypeScript, lint ciblé
et contrôle du diff réussissent également.

## REP-N05 avant et après

L’API accepte déjà des coordonnées initiales, même si le formulaire actuel ne
présente que l’identité et le statut. Pour une entrée de réseaux
`[discord, instagram, discord]`, avec doublon sur le deuxième élément,
`normalizeInitialSocialPrimaries` regroupait les réseaux et déplaçait cet élément.
L’API annonçait `socialProfiles.2.identifier` au lieu de
`socialProfiles.1.identifier` : le test SQL échouait avant correction.

Le helper choisit maintenant la principale par réseau sans réordonner l’entrée.
Le même test passe ; la règle de principale et le contrat du DTO ne changent pas.
Les correspondances par identifiant de coordonnée étaient déjà correctes ; aucune
fuite d’identité n’a été constatée dans cet avertissement.

## Contrôle complémentaire du chargement de fiche

REP-N06 concerne le retour immédiat après création : le squelette de fiche
proposait un lien Répertoire statique, avant de connaître le contexte `returnTo`.
Un clic à cet instant pouvait perdre les filtres. Le libellé reste désormais
sans lien pendant ce chargement ; la page prête conserve son retour contextuel.

Le [test de rendu](../../../../apps/web/src/__tests__/person-loading-navigation.test.ts)
utilise les vrais `BreadcrumbTrail` et `PageDetailSkeleton`, avec le cadre
d’authentification simulé. Il échoue avant correction sur la présence du lien
statique et réussit après. Ce contrôle ne prouve pas à lui seul la transition
Next réelle, traitée dans le banc d’intégration.

```powershell
Push-Location apps/web
bun run test src/__tests__/person-loading-navigation.test.ts src/__tests__/person-pages-permissions.test.ts src/__tests__/person-search-ux.test.ts
Pop-Location
```

Le 12 octobre à 19 h 44 : **26 tests réussis sur trois fichiers**, types et lint
ciblé réussis. Ces tests de rendu et contrats sont distincts des 16 scénarios SQL.

## Limites et décisions

Les homonymes restent autorisés. Les avertissements concernent les coordonnées,
pas une identité équivalente ; ils ne constituent pas une garantie d’unicité lors
d’écritures simultanées. La création ne possède pas de clé d’idempotence : répéter
la soumission peut créer une autre fiche. Le traitement client du résultat
incertain doit empêcher un rejeu involontaire et demander une vérification ;
aucune table ou règle de fusion automatique n’est ajoutée.

Ce banc ne valide pas le middleware HTTP/CSRF, le transport des cookies, la perte
d’une réponse, le navigateur, le rendu ou un volume de charge. Ces contrôles
relèvent des autres bancs de la revue. Les migrations complètes sont présentes,
mais ces scénarios ne remplacent pas une vérification exhaustive de toutes les
contraintes du schéma. Aucune mesure de performance ni audit des fiches de détail
n’est revendiqué.
