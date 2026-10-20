# Paramètres système — revue complète commencée le 11 octobre 2026

## Périmètre et départ

Poursuite demandée de la revue page par page après Mon compte. Page retenue :
`/systeme/parametres`, réglage `audit.retentionDays`, API, confirmation de
réduction, preuve de mot de passe et consommation par la purge du journal.
L'[ancienne passe](2026-10-11-parametres.md) reste historique ; le
[suivi courant](../pages/systeme/parametres.md) porte les décisions.

Départ propre au commit `c67e055`, projet en développement. Pas de changement de
durée par défaut ni de politique de conservation décidé par cet audit. Aucun
nouveau réglage, notification ou planificateur à ajouter pour remplir une grille.
Le sens de chaque valeur, la reprise et l'intégrité importent autant que le rendu.

PostgreSQL 17 jetable sur `127.0.0.1:54597`, bases `settings_service_test` et
`settings_audit_test`, 52 migrations existantes appliquées. Les essais de purge
concernent exclusivement des fixtures fictives ; aucune connexion à la base
habituelle ni suppression de données du projet. Environnement : Windows,
Node 24.14.0, Bun 1.4.2, Next 15.5.23, React 19.1.8, Prisma 6.19.3.

## Sélection de la revue générale

| Sujets | Classement et justification |
| --- | --- |
| Q01–Q04 | À examiner : valeur effective, portée, états, composants, focus et responsive |
| Q05 | Hors impact : catalogue fermé d'un seul réglage ; aucun besoin de recherche/pagination |
| Q06–Q07 | À examiner : entier, bornes, édition, confirmations, attentes et erreurs |
| Q08 | Non applicable : aucune notification différée requise pour cette correction |
| Q09–Q12 | À examiner : accès administrateur, preuve récente, portée du journal, version du réglage et cascade des détails |
| Q13 | Hors impact tant qu'aucune correction de schéma n'est nécessaire ; migrations existantes appliquées aux seules bases d'essai |
| Q14–Q16 | À examiner : écriture versionnée, concurrence avec purge, audit atomique et suppression de conservation |
| Q17–Q19 | À examiner : requêtes bornées, verrou, absence de cache de durée et responsabilités client/serveur |
| Q20–Q21 | Non applicable : aucun fichier métier, import ou export sur cette page ; sauvegarde examinée en Q29 |
| Q22–Q23 | À examiner : frontières temporelles et maintenance ponctuelle qui consomme la durée ; pas de nouveau service externe |
| Q24 | Hors impact : aucune nouvelle politique juridique ou de gouvernance décidée ici |
| Q25 | À examiner uniquement pour l'historique des personnes supprimé avec l'audit parent |
| Q26 | Non applicable : aucun montant, contrat ni engagement financier traité |
| Q27 | À examiner : distinguer preuve client simulée, SQL et parcours réel |
| Q28–Q29 | À examiner : maintenance, refus sûr, rollback et limites de restauration ; pas de modification d'un déploiement |
| Q30 | À examiner : contrat, variables de tests et documentation, sans dépendance supplémentaire attendue |

## Résultat et corrections

**Conforme sur le périmètre vérifié**, avec validations finales le **12 octobre
2026**, Europe/Paris. Les parcours essentiels ont été exécutés avec le serveur
Next de production, des sessions réelles et PostgreSQL isolé. Les limites
ci-dessous restent explicites. Le schéma actuel, ses contraintes, la version
optimiste et la cascade des détails répondent aux besoins exercés : aucune
migration nécessaire.

| ID | Défaut et impact | Correction et preuve | État |
| --- | --- | --- | --- |
| PAR-C01 · P1 | La vraie commande de maintenance échouait avec `42883` : Prisma transmettait un `bigint` à la procédure qui attend un `integer`. Aucun nettoyage ne pouvait aboutir par cette commande. | Conversion explicite du paramètre SQL ; commande Bun réellement exécutée, ancien audit supprimé et événement récent préservé. [Intégration](parametres-complet-2026-10-11/banc-integration/README.md). | Clos après vérification |
| PAR-C02 · P1 | Valeur stockée invalide présentée comme défaut appliqué, alors que la purge était bloquée ; réparation du défaut possible sans preuve récente. | Marqueur obligatoire `isStoredValueInvalid`, diagnostic et durée proposée distincts ; confirmation et preuve récente pour toute réparation ; audit borné sans JSON invalide brut. SQL, routes, navigateur et réparation réelle vérifiés. | Clos après vérification |
| PAR-C03 · P2 | Une réponse d'enregistrement incertaine permettait une reprise insuffisamment explicite. | Conservation du brouillon, blocage de nouvelle écriture et vérification volontaire avant choix de reprise ; vrai PUT validé en base puis réponse perdue, sans renvoi automatique. | Clos après vérification |
| PAR-C04 · P2 | Anciennes valeurs encore visibles après refus de lecture ; des requêtes pouvaient rester sans fin et une réponse tardive concernait une ancienne portée. | Retrait des données après 401/403, attentes bornées à 15 s en lecture et 30 s en écriture, verrou de requête et portée de l'acteur. Retrait réel d'ADMIN vers USER, simulations et tests de contrôleur. | Clos après vérification |
| PAR-C05 · P2 | Focus perdu après accès retiré ou preuve refusée, et rendu au champ derrière le dialogue lors du passage réduction → preuve. | Focus explicite sur l'état refusé, transfert entre dialogues protégé et refocalisation après réactivation du champ partagé. Mot de passe réel, variantes MFA simulées et preuves avant/après. | Clos après vérification |

Les responsabilités réseau, versions et brouillons sont regroupées dans
`useSystemSettings`, contrôleur local de cette page. La composition réutilise
les composants existants ; l'action d'enregistrement reste dans la ligne de
réglage qui porte sa propre mutation. Aucun composant générique, dépendance,
cache ou réglage supplémentaire n'a été créé pour anticiper des pages futures.
Les budgets d'architecture restent inchangés.

Le défaut **1095 jours**, les bornes **365–3650 jours**, la portée globale du
journal et la preuve de mot de passe récente sur réduction restent applicables.
Enregistrer ne supprime rien immédiatement. La maintenance relit la durée et
contrôle sa cohérence sous verrou ; augmenter ne restaure pas les événements
déjà supprimés. Le statut invalide signifie « nettoyage bloqué », jamais
« défaut appliqué » ; sa réparation peut réactiver la conservation et demande
donc une confirmation et une preuve récente.

## Validation

| Contrôle exécuté le 12 octobre | Résultat et portée |
| --- | --- |
| [Banc client](parametres-complet-2026-10-11/banc-client/README.md) | **30/30** parcours Chromium ; composants et styles réels, API/session simulées ; clavier, focus, mobile, confirmations, reprise et dialogue partagé |
| [Banc serveur](parametres-complet-2026-10-11/banc-serveur/README.md) | **44 contrôles réussis**, dont 16 PostgreSQL, 21 routes et 7 contrats ; audit obligatoire, limites de purge, cascades, script de maintenance et concurrence avec attentes constatées dans `pg_locks` ; session simulée, base migrée réelle |
| [Intégration Next + PostgreSQL](parametres-complet-2026-10-11/banc-integration/README.md) | **11/11** parcours ; authentification MFA, cookies, CSRF, mutations, preuve de mot de passe, conflits, réponse perdue et vraie CLI |
| Suite globale | **1 235 tests réussis, 84 ignorés** ; 15 scénarios SQL Paramètres inclus. Les 84 tests d'autres intégrations n'ont pas reçu leur URL dédiée ; ils ne sont pas comptés comme validés. Passe exécutée avant l'ajout de la régression CLI, vérifiée ensuite séparément dans le banc serveur. |
| Build de production | Compilation, types et lint réussis ; vrai serveur lancé depuis ce build pour l'intégration. Le correctif CLI ultérieur est exécuté directement par Bun et n'entre pas dans le bundle Next. |
| Budgets d'architecture et de performance | Réussis ; route système mesurée à **259 904 octets gzip**. Aucun relèvement de seuil. Cette mesure du bundle n'est pas une mesure de charge serveur. |
| Vérification finale des types, du lint et des documents | Types et lint réussis sur les packages modifiés ; package partagé relu depuis le cache. `docs:check`, ses 6 tests et `git diff --check` réussis. |

Les tests du contrôleur couvrent aussi l'attente bornée et l'ignorance d'une
réponse tardive. Les scénarios SQL prouvent l'absence de modification sans audit,
le refus d'une durée périmée après attente du verrou et le rollback de la purge
et de ses détails. Les preuves ENCRYPTED testent la cascade avec des octets
fictifs, pas un déchiffrement.

Les fichiers texte modifiés ont été comparés aux secrets temporaires de ce
banc : aucune présence détectée. Le serveur Next et le cluster PostgreSQL
dédiés ont été arrêtés après les contrôles ; leur dossier temporaire, les bases
jetables et les secrets d'essai ont été supprimés. Seules les preuves expurgées
du dépôt sont conservées.

## Limites et suivi

- Chromium uniquement ; aucun lecteur d'écran, Safari/iOS, clavier virtuel ou
  extension Bitwarden réelle. Les attributs d'autocomplétion sont contrôlés.
- Petites fixtures isolées : pas de test de charge, de restauration de
  sauvegarde ni de seuil de volume garanti par cette passe.
- La commande ponctuelle est vérifiée. Aucun ordonnanceur de déploiement,
  alerte de production ou exécution planifiée n'est certifié par cet audit.
- Aucune qualification juridique des durées ; la politique conserve les choix
  existants. La séparation future des durées par finalité reste un sujet de
  gouvernance, sans schéma ajouté préventivement.

Les points durables et les déclencheurs de reprise restent dans le
[suivi courant](../pages/systeme/parametres.md), notamment PAR-S-01 à
PAR-S-04 et les limites restantes de PAR-S-07. Les anciens rapports gardent
leurs dates et leurs résultats ; cette passe ne les réécrit pas.
