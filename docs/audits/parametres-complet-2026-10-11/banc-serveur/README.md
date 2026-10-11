# Paramètres — banc serveur

Revue commencée le **11 octobre 2026**, validations exécutées le **12 octobre**
(heure de Paris). État initial : `c67e055`, arbre propre. Ce dossier complète
le suivi de `/systeme/parametres` sans remplacer les preuves historiques.
[Résultats structurés](observations.json).

## Défauts confirmés et corrections

Avec une valeur JSON invalide dans `SystemSetting`, le GET renvoyait `1095`
comme une durée ordinaire. Pourtant, la procédure SQL refusait toute purge :
la valeur de repli n’était donc pas une conservation appliquée. Une écriture
du défaut proposé réparait aussi la ligne et réactivait la conservation sans
preuve récente, car elle n’était pas considérée comme une réduction.

Deux régressions SQL reproduites avant correction : signal d’invalidité absent ;
réparation sans preuve répondant 200 au lieu du refus attendu. La purge refusait
bien la valeur invalide et conservait l’événement ancien pendant cette preuve.

Le DTO GET/PUT comporte maintenant `isStoredValueInvalid`, obligatoire. Quand
il vaut `true`, `value` est uniquement le défaut proposé pour la réparation.
La version stockée reste disponible pour le contrôle de concurrence. La
réparation demande une preuve récente de mot de passe et écrit réellement la
valeur, même si elle égale ce défaut proposé. Sa réponse remet le marqueur à
`false`. Le client est adapté séparément à ce contrat.

L’audit de réparation conserve la version et un état antérieur borné
`{ isStoredValueInvalid: true, value: null, version }`, puis la nouvelle
valeur/version. Aucun JSON invalide brut n’est exposé par l’API ou recopié dans
l’audit. La valeur brute reste dans la ligne jusqu’à réparation réussie.

Les bornes **365–3650 jours**, le défaut **1095 jours**, la portée globale et la
procédure de purge restent inchangés. L’enregistrement ne lance aucune purge.
Aucune migration ni extraction de service ajoutée.

La véritable commande Bun a ensuite révélé une erreur distincte : l’appel
paramétré de `purge_expired_audit_logs` transmettait un `bigint`, alors que la
fonction SQL attend un `integer`. PostgreSQL refusait la maintenance avec le
code `42883`. Le [script de maintenance](../../../../apps/web/scripts/run-maintenance.ts)
convertit désormais explicitement le paramètre par `::integer`. Les premiers
tests de procédure possédaient déjà cette conversion dans leur helper et ne
couvraient donc pas le défaut du script livré.

Une régression importe maintenant ce script complet sous Vitest, en conservant
le client Prisma de la base isolée. Elle exerce son interpolation exacte et
toutes ses étapes de maintenance. Le lancement dans un véritable processus
Bun est documenté séparément par le banc d’intégration.

## Environnement et reproduction

- PostgreSQL 17 local, port `54597`, base dédiée `settings_service_test` fournie
  avec **52 migrations appliquées**. Aucune base distante consultée ou modifiée.
- [Test PostgreSQL](../../../../apps/web/src/__tests__/system-settings-postgres.test.ts) :
  URL explicite dans `SETTINGS_TEST_DATABASE_URL`, garde sur l’hôte local et le
  nom exact de base. Sans cette variable, les scénarios SQL sont ignorés.
- Fixtures exclusivement fictives : comptes, réglages, audits et détails.
  `SystemSetting` est réinitialisée entre scénarios dans cette base réservée au
  test. Les événements ne sont retirés que par la procédure de conservation
  lorsque le scénario le demande ; aucun nettoyage d’audit par contournement.
- Les triggers temporaires injectant une panne d’insertion d’audit sont ciblés
  sur le compte fictif et retirés dans un `finally`.

Depuis la racine, avec le cluster isolé déjà démarré et migré :

```powershell
$env:SETTINGS_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:54597/settings_service_test?schema=public'
Push-Location apps/web
bun run test src/__tests__/system-settings-postgres.test.ts src/__tests__/system-settings-routes.test.ts
Pop-Location
Remove-Item Env:SETTINGS_TEST_DATABASE_URL
```

Le script ne démarre ni ne migre PostgreSQL. Ne jamais remplacer cette cible
par la base courante du projet. Un autre port n’est admissible que pour un autre
cluster local isolé et la même base réservée au test.

## Vérifications exécutées

**16 scénarios PostgreSQL réussis**, regroupant :

- Refus anonyme et refus d’un rôle USER même avec des anciennes attributions
  individuelles de droits de paramètres ; contrôles de permission réels.
- Catalogue fermé : défaut de la ligne absente ; anciennes clés et clés
  inconnues ignorées en lecture et refusées en écriture.
- JSON malformé, champ inconnu, version absente, type incorrect, fractions et
  bornes refusés ; no-op valide sans changement de version ni faux audit.
- Audit de création/modification avec acteur et versions ; une seule réussite
  pour deux premières créations ou deux mises à jour concurrentes.
- Preuve récente uniquement requise pour une baisse normale ; preuve absente,
  périmée ou datée du futur refusée. Réparation invalide toujours protégée.
- Échec d’audit : création et mise à jour du réglage entièrement annulées.
- Valeurs stockées invalides : signal local, repli numérique, purge fermée,
  réparation/version/audit ; ancienne durée attendue refusée sans suppression.
- Purge : événements de part et d’autre de la limite (**±1 seconde**), cascade
  des détails PLAIN et ENCRYPTED, restauration du contexte SQL de suppression
  et refus d’une suppression ordinaire hors procédure.
- Rollback des événements et de leurs détails si une erreur survient après la
  purge dans la même transaction.
- Attentes réellement observées dans `pg_locks` : purge bloquée par une
  augmentation existante, purge bloquée par la création de la première durée,
  modification du réglage bloquée par une purge en cours. Une purge devenue
  périmée refuse ensuite son ancien seuil et conserve les données.
- Script complet : retrait des fixtures expirées d’audit, session, quota,
  challenge MFA et enrôlement ; conservation de l’audit, de la session et du
  quota actuels ; présence du compte rendu de maintenance.

**21 tests de routes** réussis, dont trois nouveaux cas d’état invalide,
preuve de réparation et audit borné. **7 contrats** de catalogue et de frontière
de suppression réussis. TypeScript et lint ciblé réussis.

## Limites

- Handlers, permissions effectives, preuve récente, schémas, Prisma,
  PostgreSQL, procédures et audit sont réels. La source de session et les
  en-têtes sont simulés ; le quota API est autorisé. La connexion, les cookies,
  le CSRF et l’interface sont vérifiés séparément par le banc d’intégration.
- Les détails ENCRYPTED contiennent des octets fictifs conformes aux contraintes
  SQL. Le test prouve la cascade, pas le chiffrement ni la restauration d’un
  secret. Aucune clé réelle n’est utilisée.
- Les échéances sont comparées de part et d’autre du seuil ; aucune égalité
  exacte n’est revendiquée entre la précision `timestamp(3)` des événements et
  celle de l’horloge transactionnelle PostgreSQL.
- Le rollback de purge est exécuté dans une transaction réelle avec une panne
  injectée ensuite. Le module complet de maintenance est exécuté sous Vitest
  avec un client SQL isolé ; ce banc ne lance pas de processus Bun séparé et
  ne vérifie pas de planificateur déployé. Les fixtures d’enrôlement MFA sont
  fictives : seul leur retrait à expiration est vérifié ici.
- Aucun test de charge, restauration de sauvegarde ou qualification juridique
  des durées. La réussite sur ces fixtures n’établit pas une capacité à fort
  volume ni le bon fonctionnement du planificateur d’un déploiement.

Les erreurs liées à l’environnement et les premières corrections de fixtures
ne sont pas présentées comme des défauts produit. Les défauts retenus reposent
sur les deux reproductions avec une fixture SQL valide et sur l’erreur de
résolution de fonction observée au lancement de la véritable commande Bun.
