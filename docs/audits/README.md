# Audits : rapports datés et preuves

[Guide général](../REFERENCE_GENERALE.md) · [Méthode d’audit](../methode/audit.md) ·
[Modèle de rapport](../methode/modeles/rapport-audit.md) · [Tests et contrôles](../systeme/tests.md)

Pour un nouvel audit, suivre la [méthode commune](../methode/audit.md),
sélectionner les points via la [référence générale](../REFERENCE_GENERALE.md),
puis utiliser le [modèle de rapport](../methode/modeles/rapport-audit.md) si un
document permanent est utile. Ne pas créer un rapport complet pour chaque
correction de texte. Lire uniquement les rapports du périmètre retenu.

## Lire les résultats datés

**Un rapport décrit l’état examiné à sa date ; ce n’est pas une validation
permanente du code actuel.** Les [fiches des pages](../pages/README.md) portent
les décisions et l’état actif des constats ; chaque rapport conserve le verdict
de sa campagne sans devenir une seconde liste de travail. Un ancien succès ne
vaut pas contrôle rejoué ; les commandes, règles et noms d’un ancien rapport
restent historiques.

## Rapports d’octobre 2026

| Rapport | Périmètre et portée |
| --- | --- |
| [Organisation complète de la documentation — 19 octobre 2026](2026-10-19-organisation-complete.md) | Réorganisation sur le modèle du site Noctambule : référence générale en 36 points, dossiers par nature, une fiche par page et par section, système de design, cartographie du système, contrôleur étendu. Périmètre documentaire ; aucun comportement applicatif revalidé |
| [Autorisations du site actuel — 15 octobre 2026](2026-10-15-autorisations-site.md) | Examen droit par droit, puis corrections après accord : catalogue 27/7, coordonnées séparées, provenance minimale et racine masquée ; 1 335 tests web réussis (142 ignorés), 33 database, 82 SQL inclus et cinq parcours Chromium réels. Migration appliquée après sauvegarde signée, aucune en attente |
| [Schéma Prisma — revue exhaustive du 13 octobre 2026](2026-10-13-schema-prisma.md) | 562 lignes, 19 modèles et 12 enums examinés ; catalogue PostgreSQL confronté aux 53 migrations, version de paramètre et précontrôle de déchiffrement corrigés ; 12 scénarios SQL, 20 tests Paramètres, 33 tests database et restauration 7/7. Migration ensuite appliquée à la base de travail avec sauvegarde signée ; aucune migration en attente |
| [Clôture du socle existant — 12–13 octobre 2026](2026-10-12-cloture-socle.md) | **Socle actuel clos pour poursuivre le développement métier** : onze pages, quatre familles de défauts corrigées, 1 482 tests dont 218 SQL sans aucun ignoré, smoke et 14 scénarios intégrés réussis, restauration signée 4/4 ; limites explicites, aucune réouverture sans déclencheur |
| [Création d'utilisateur, autorisation et reprise — complément ciblé du 12 octobre 2026](../pages/systeme/utilisateurs/creation.md#création--autorisation-à-lexécution-et-reprise--complément-du-12-octobre-2026) | Autorisation à l'exécution et focus tardif corrigés, USR-N13/N14 clos au périmètre testé ; six parcours client, onze SQL création, treize SQL sessions et trois HTTP réussis. Trace ciblée sans requalifier les anciennes preuves |
| [Sessions administratives — complément ciblé du 12 octobre 2026](../pages/systeme/utilisateurs/fiche-securite.md#sessions-administratives--complément-ciblé-du-12-octobre-2026) | Requêtes bornées, reprise sans rejeu, autorisation concurrente et focus corrigés ; onze parcours client, treize SQL ciblés et quatre HTTP réussis. USR-D20 à USR-D22 clos au périmètre testé, sans nouvel audit complet ni reprise des resets |
| [Mon compte, attente et reprise des sessions — complément ciblé du 12 octobre 2026](../pages/mon-compte/securite.md#sécurité--attente-et-reprise-des-sessions--complément-ciblé-du-12-octobre-2026) | Trace ciblée : attentes bornées, reprise sans rejeu, focus et autorisation concurrente corrigés ; huit parcours client, neuf SQL ciblés et trois HTTP réels réussis. COMPTE-10 à COMPTE-12 clos au périmètre testé, preuves du 11 octobre conservées |
| [Sections après long défilement — complément ciblé du 12 octobre 2026](../pages/transverse/navigation-generale.md#changement-de-section-après-long-défilement--revue-ciblée-du-12-octobre-2026) | Trace dans le suivi existant, sans nouvel audit complet : début masqué, focus et confirmation respectant replace corrigés ; huit parcours client et neuf Next réels réussis sur les trois consommateurs. NAV-08/NAV-09 clos, restauration native du scroll explicitement limitée |
| [Navigation générale — 12 octobre 2026](2026-10-12-navigation-generale.md) | Menu Rubriques confirmé par l'utilisateur, focus et garde de départ corrigés, déconnexion non confirmée et reprise explicite ; 17 parcours client, dix parcours Next/MFA, trois reprises HTTP de déconnexion et 1 248 tests web réussis. Limites de profils et de sections précisées |
| [Erreur, page introuvable et chargement — 12 octobre 2026](2026-10-12-etats-techniques.md) | Erreur racine autonome, reprise par GET et focus corrigés ; treize scénarios client, cinq contrôles HTTP réels et quatre sondes Next en copie isolée réussis. ETAT-01 à ETAT-06 clos ou vérifiés selon leur portée |
| [Fiche personne — 12 octobre 2026](2026-10-12-fiche-personne.md) | Identité, coordonnées, provenance, portée et suppression fiabilisées ; 30 parcours client, treize HTTP avec connexion/MFA/PostgreSQL, trente SQL et 1 240 tests web réussis ; REP-D01 à REP-D10 clos ou amélioration vérifiée, limites et contrôles finaux dans le rapport |
| [Création d'une personne — 12 octobre 2026](2026-10-12-creation-personne.md) | Reprises, navigation jusque dans le chargement, focus, brouillon et indice d'alerte API corrigés ; 28 parcours simulés, onze Next/session/PostgreSQL, 16 SQL et 1 236 tests web réussis ; REP-N01 à REP-N06 clos, reprise manuelle sans garantie d'idempotence |
| [Accueil / Mon travail — 12 octobre 2026](2026-10-12-accueil.md) | Prénom au retour et version du profil après MFA corrigés, ancien tableau de bord inutilisé retiré ; huit parcours client simulés, huit Next/PostgreSQL réels et 1 235 tests web réussis, build et budgets validés ; fonctions métier futures inchangées |
| [Connexion et MFA — 12 octobre 2026](2026-10-12-connexion.md) | Attentes, réponses tardives, reprise après réponse perdue, collage et expiration corrigés ; 30 parcours client, 17 tests PostgreSQL et 12 parcours Next/MFA réels réussis ; suite web, build et budgets validés, limites précisées |
| [Feuille de route — 12 octobre 2026](2026-10-12-feuille-de-route.md) | Catalogue et matrice vérifiés ; détails accessibles et reprise du focus corrigés, recherche harmonisée ; 18 parcours client, huit Next/MFA réels et 1 230 tests web réussis ; FDR-01 à FDR-04 clos |
| [Paramètres système — revue complète des 11–12 octobre 2026](2026-10-11-parametres-complet.md) | Valeur invalide, reprise, focus et vraie commande de maintenance corrigés ; 30 parcours client et 11 intégrations Next/PostgreSQL réussis, purge et concurrence isolées vérifiées |
| [Mon compte — 11 octobre 2026](2026-10-11-mon-compte.md) | Version de session manquante, contact, brouillons, déconnexion et dialogues corrigés ; 23 parcours simulés, douze Next/MFA/PostgreSQL, 23 SQL ; 1 232 tests web réussis |
| [Fiche utilisateur — 11 octobre 2026](2026-10-11-fiche-utilisateur.md) | USR-D10 à USR-D19 clos : nom vide, versions, portée, sessions, reprise MFA et refactorisation ; 43 parcours simulés, treize Next/MFA/PostgreSQL, quinze SQL ; 1 199 tests web réussis |
| [Création d'utilisateur — 11 octobre 2026](2026-10-11-creation-utilisateur.md) | Copie tardive, focus ADMIN et texte contact corrigés ; service extrait, générateur partagé testé directement ; 28 scénarios simulés, neuf parcours réels dont première connexion/MFA/changement de mot de passe, cinq transactions SQL ; 1 161 tests web réussis |
| [Utilisateurs — 11 octobre 2026](2026-10-11-utilisateurs.md) | Liste corrigée : recherche SQL bornée, pagination, retours et accessibilité ; 42 scénarios simulés puis reprise ciblée, dix parcours Next/MFA/PostgreSQL, 19 contrôles d'invariants SQL et mesures jusqu'à 10k comptes ; 1 145 tests web réussis |
| [Répertoire — 11 octobre 2026](2026-10-11-repertoire.md) | Liste corrigée, 41 scénarios Chromium simulés et neuf parcours réels, mesures jusqu’à 10k fiches ; complément schéma/refactorisation, concurrence et propriété des coordonnées corrigées, 29 contrôles SQL et migration additive vérifiée |
| [Composants partagés — 11 octobre 2026](2026-10-11-composants.md) | Revue des primitives et de leurs consommateurs ; actions, recherche et pagination mutualisées, conservation des brouillons et comportements clavier corrigés ; preuves Chromium avec API simulées et limites d'intégration |
| [Barres de sections — 11 octobre 2026](2026-10-11-navigation-sections.md) | Sélection, arrondis, flèches conditionnelles et infobulle partagés ; trois pages et 20 scénarios Chromium isolé, puis 10 scénarios dédiés à l'ombre en position collée ; intégration Next/session et lecteur d'écran non rejoués |
| [Autocomplétion — 11 octobre 2026](2026-10-11-autocompletion.md) | Exceptions d'authentification et champs invisibles supprimés ; règle commune aux champs, zones de texte, recherche et formulaires ; tests du contrat et limites des extensions |
| [Fenêtres modales — 11 octobre 2026](2026-10-11-modales.md) | Inventaire des parcours actifs ; surfaces, focus, brouillons, conflits et erreurs corrigés ; navigateur à quatre largeurs avec API simulées ; intégration sensible à compléter |
| [Pages restantes — 11 octobre 2026](2026-10-11-pages-restantes.md) | Accueil, connexion, Mon compte, création de personne, feuille de route et états techniques ; 58 scénarios navigateur isolé, 1 046 tests réussis ; intégration authentifiée à compléter |
| [Paramètres système — 10–11 octobre 2026](2026-10-11-parametres.md) | Présentation, confirmations, focus et réponses tardives corrigés ; 32 scénarios Chromium isolé ; aucune purge ni mutation réelle |
| [Autorisations de la fiche utilisateur — 10 octobre 2026](2026-10-10-autorisations-utilisateur.md) | Éditeur et autonomie harmonisés ; dépendances, catalogue affiché et aperçu corrigés ; 36 combinaisons Chromium isolé ; mutations authentifiées non rejouées |
| [Menus déroulants — 10 octobre 2026](2026-10-10-menus.md) | Audit transverse des onze consommateurs actifs ; focus, ouverture et arrondis harmonisés ; 60 combinaisons navigateur isolé, puis présentation filtre/fiche alignée et comparée à quatre largeurs ; 1 036 tests réussis, 25 ignorés ; parcours authentifiés non rejoués |
| [Fiche utilisateur — 10 octobre 2026](2026-10-10-fiche-utilisateur.md) | Audit puis correction : USR-D01 à USR-D08 corrigés et vérifiés, synthèse compactée ; 1 036 tests réussis, 25 ignorés, build/budgets réussis ; onze scénarios Chromium sur PostgreSQL isolé, step-up réel ; preuves et limites explicites |
| [Création d'utilisateur — 10 octobre 2026](2026-10-10-creation-utilisateur.md) | Analyse puis corrections USR-N01 à USR-N07 ; sept largeurs dans Next réel, créations USER/ADMIN, TOTP, réponse perdue et reprise sur PostgreSQL isolé ; 1 028 tests réussis, preuves et limites datées |
| [Utilisateurs — 10 octobre 2026](2026-10-10-utilisateurs.md) | Analyse puis corrections USR-09 à USR-17 ; 1 018 tests web réussis, build et budgets réussis ; Chromium à neuf largeurs sur Next/PostgreSQL isolés et sessions préparées ; connexion/MFA, charge et accessibilité complète non validés |
| [Répertoire — 10 octobre 2026](2026-10-10-repertoire.md) | Audit, corrections et quatre améliorations UX ; 112 tests du périmètre, PostgreSQL isolé et navigateur ; session réelle complète non exécutée |
| [Organisation documentaire — 10 octobre 2026](2026-10-10-organisation-documentaire.md) | Corrections, méthode enrichie et validation du corpus ; aucun verdict de fonctionnement global du site |
| [Compréhension du projet — 10 octobre 2026](2026-10-10-comprehension-projet.md) | Cartographie code/site, contrôles techniques et limites ; état avant la réorganisation documentaire |

## Relevés historiques

Traces antérieures à la série d'audits d'octobre 2026. Plusieurs parcours ou
chemins cités ont depuis évolué ou été retirés. Ces rapports documentent leur
passe d'origine uniquement ; ne pas les utiliser comme référence courante.

| Rapport | Périmètre et portée |
| --- | --- |
| [Interface Utilisateurs — 26 septembre 2026](2026-09-26-ui-utilisateurs.md) | Audit visuel historique, complété depuis par le suivi Utilisateurs |
| [URL — 24 septembre 2026](2026-09-24-urls.md) | Relevé historique des routes et redirections |
| [UX/UI — 24 septembre 2026](2026-09-24-ux-ui.md) | Revue historique ; plusieurs parcours ont évolué ou ont été retirés |
| [Feuille de route — 22 septembre 2026](2026-09-22-feuille-de-route-long-terme.md) | Diagnostic de conception antérieur au catalogue courant |
| [Design](2026-09-22-design.md) | Relevé historique ; les règles courantes sont dans le [système de design](../design/README.md) et les fiches |
| [Primitives UI](2026-09-22-shadcn.md) | Inventaire historique des composants ; certains chemins cités ont été retirés |
| [Typographie](2026-09-22-typographie.md) | Inventaire historique ; ne remplace pas les tokens et décisions courantes |

Ces trois rapports du 22 septembre 2026 n’avaient pas de date dans leur nom ; elle
vient de leur titre (renommage du 19 octobre 2026).
Les pièces d’audit conservées documentent seulement leur passe d’origine. Les
chemins supprimés restent cités comme texte historique, sans lien cassé ni fichier
factice. Une correction de lien ne rejoue pas la preuve correspondante.

## Dossiers de preuves

Les preuves d’une campagne (protocoles, scripts de banc, résultats JSON,
captures) vivent dans un dossier nommé `<périmètre>-<date>/` à côté des
rapports, par exemple [accueil-2026-10-12](accueil-2026-10-12/banc-client/README.md).
**Ces dossiers ne sont pas renommés** : leurs scripts et résultats citent leur
propre chemin. Les rapports, eux, suivent depuis le 19 octobre 2026 le nommage
`AAAA-MM-JJ-<périmètre>.md` ; la correspondance des anciens noms est dans le
[rapport de réorganisation](2026-10-19-organisation-complete.md#déplacements).
Les dossiers `autorisations-visuel-2026-10-17/`, `autorisations-cartes-2026-10-18/`
et `champs-2026-10-17/` n’ont pas de rapport propre : ils sont cités par les fiches
[Autorisations](../pages/systeme/utilisateurs/fiche-autorisations.md) et
[Composants partagés](../pages/transverse/composants-partages.md).

## Entretenir l’historique

1. Définir audit ciblé, complet ou transverse, version, environnement,
   périmètre et exclusions.
2. Examiner et corriger dans le cadre de la demande et des décisions déjà
   données ; conserver les suggestions hors périmètre dans la fiche ou les
   [propositions](../propositions/README.md).
3. Consigner preuves, résultats, échecs et contrôles non exécutés. Une revue
   documentaire ne revalide aucune page applicative.
4. Dans une même campagne, dater les reprises et préciser la version retestée.
   Pour une nouvelle campagne, créer un nouveau rapport et conserver le
   précédent comme historique.
5. Ajouter le rapport dans cet index et actualiser la fiche de page avec un
   lien ; les nouvelles règles communes rejoignent leur document propriétaire.
6. Exécuter `bun run docs:check` : il vérifie que chaque rapport daté est relié
   depuis cet index, sans valider le contenu des preuves.

Nommage : `AAAA-MM-JJ-<périmètre>.md`, avec `-v2` si plusieurs campagnes ont
lieu le même jour. Le périmètre peut être une page, un module, une API ou un
sujet transverse.
