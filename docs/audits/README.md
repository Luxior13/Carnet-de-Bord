# Audits et constats datés

Un rapport décrit l’état examiné à sa date. Pour les choix applicables et les
points ouverts, consulter les [suivis courants](../qualite/pages/README.md) et les
[références](../qualite/REFERENCES.md). Un ancien succès ne vaut pas contrôle rejoué.

Préparer une nouvelle passe avec la [méthode](../qualite/AUDITS.md), le
[modèle](../qualite/modeles/audit.md) et les [contrôles](../qualite/CONTROLES.md).
Ne pas créer un rapport complet pour chaque correction de texte.

| Rapport | Périmètre et portée |
| --- | --- |
| [Sections après long défilement — complément ciblé du 12 octobre 2026](../qualite/pages/navigation-generale.md#changement-de-section-après-long-défilement--revue-ciblée-du-12-octobre-2026) | Trace dans le suivi existant, sans nouvel audit complet : début masqué, focus et confirmation respectant replace corrigés ; huit parcours client et neuf Next réels réussis sur les trois consommateurs. NAV-08/NAV-09 clos, restauration native du scroll explicitement limitée |
| [Navigation générale — 12 octobre 2026](AUDIT_NAVIGATION_GENERALE_2026-10-12.md) | Menu Rubriques confirmé par l'utilisateur, focus et garde de départ corrigés, déconnexion non confirmée et reprise explicite ; 17 parcours client, dix parcours Next/MFA, trois reprises HTTP de déconnexion et 1 248 tests web réussis. Limites de profils et de sections précisées |
| [Erreur, page introuvable et chargement — 12 octobre 2026](AUDIT_ETATS_TECHNIQUES_2026-10-12.md) | Erreur racine autonome, reprise par GET et focus corrigés ; treize scénarios client, cinq contrôles HTTP réels et quatre sondes Next en copie isolée réussis. ETAT-01 à ETAT-06 clos ou vérifiés selon leur portée |
| [Fiche personne — 12 octobre 2026](AUDIT_FICHE_PERSONNE_2026-10-12.md) | Identité, coordonnées, provenance, portée et suppression fiabilisées ; 30 parcours client, treize HTTP avec connexion/MFA/PostgreSQL, trente SQL et 1 240 tests web réussis ; REP-D01 à REP-D10 clos ou amélioration vérifiée, limites et contrôles finaux dans le rapport |
| [Création d'une personne — 12 octobre 2026](AUDIT_CREATION_PERSONNE_2026-10-12.md) | Reprises, navigation jusque dans le chargement, focus, brouillon et indice d'alerte API corrigés ; 28 parcours simulés, onze Next/session/PostgreSQL, 16 SQL et 1 236 tests web réussis ; REP-N01 à REP-N06 clos, reprise manuelle sans garantie d'idempotence |
| [Accueil / Mon travail — 12 octobre 2026](AUDIT_ACCUEIL_2026-10-12.md) | Prénom au retour et version du profil après MFA corrigés, ancien tableau de bord inutilisé retiré ; huit parcours client simulés, huit Next/PostgreSQL réels et 1 235 tests web réussis, build et budgets validés ; fonctions métier futures inchangées |
| [Connexion et MFA — 12 octobre 2026](AUDIT_CONNEXION_2026-10-12.md) | Attentes, réponses tardives, reprise après réponse perdue, collage et expiration corrigés ; 30 parcours client, 17 tests PostgreSQL et 12 parcours Next/MFA réels réussis ; suite web, build et budgets validés, limites précisées |
| [Feuille de route — 12 octobre 2026](AUDIT_FEUILLE_DE_ROUTE_2026-10-12.md) | Catalogue et matrice vérifiés ; détails accessibles et reprise du focus corrigés, recherche harmonisée ; 18 parcours client, huit Next/MFA réels et 1 230 tests web réussis ; FDR-01 à FDR-04 clos |
| [Paramètres système — revue complète des 11–12 octobre 2026](AUDIT_PARAMETRES_COMPLET_2026-10-11.md) | Valeur invalide, reprise, focus et vraie commande de maintenance corrigés ; 30 parcours client et 11 intégrations Next/PostgreSQL réussis, purge et concurrence isolées vérifiées |
| [Mon compte — 11 octobre 2026](AUDIT_MON_COMPTE_2026-10-11.md) | Version de session manquante, contact, brouillons, déconnexion et dialogues corrigés ; 23 parcours simulés, douze Next/MFA/PostgreSQL, 23 SQL ; 1 232 tests web réussis |
| [Fiche utilisateur — 11 octobre 2026](AUDIT_FICHE_UTILISATEUR_2026-10-11.md) | USR-D10 à USR-D19 clos : nom vide, versions, portée, sessions, reprise MFA et refactorisation ; 43 parcours simulés, treize Next/MFA/PostgreSQL, quinze SQL ; 1 199 tests web réussis |
| [Création d'utilisateur — 11 octobre 2026](AUDIT_CREATION_UTILISATEUR_2026-10-11.md) | Copie tardive, focus ADMIN et texte contact corrigés ; service extrait, générateur partagé testé directement ; 28 scénarios simulés, neuf parcours réels dont première connexion/MFA/changement de mot de passe, cinq transactions SQL ; 1 161 tests web réussis |
| [Utilisateurs — 11 octobre 2026](AUDIT_UTILISATEURS_2026-10-11.md) | Liste corrigée : recherche SQL bornée, pagination, retours et accessibilité ; 42 scénarios simulés puis reprise ciblée, dix parcours Next/MFA/PostgreSQL, 19 contrôles d'invariants SQL et mesures jusqu'à 10k comptes ; 1 145 tests web réussis |
| [Répertoire — 11 octobre 2026](AUDIT_REPERTOIRE_2026-10-11.md) | Liste corrigée, 41 scénarios Chromium simulés et neuf parcours réels, mesures jusqu’à 10k fiches ; complément schéma/refactorisation, concurrence et propriété des coordonnées corrigées, 29 contrôles SQL et migration additive vérifiée |
| [Composants partagés — 11 octobre 2026](AUDIT_COMPOSANTS_2026-10-11.md) | Revue des primitives et de leurs consommateurs ; actions, recherche et pagination mutualisées, conservation des brouillons et comportements clavier corrigés ; preuves Chromium avec API simulées et limites d'intégration |
| [Barres de sections — 11 octobre 2026](AUDIT_NAVIGATION_SECTIONS_2026-10-11.md) | Sélection, arrondis, flèches conditionnelles et infobulle partagés ; trois pages et 20 scénarios Chromium isolé, puis 10 scénarios dédiés à l'ombre en position collée ; intégration Next/session et lecteur d'écran non rejoués |
| [Autocomplétion — 11 octobre 2026](AUDIT_AUTOCOMPLETION_2026-10-11.md) | Exceptions d'authentification et champs invisibles supprimés ; règle commune aux champs, zones de texte, recherche et formulaires ; tests du contrat et limites des extensions |
| [Fenêtres modales — 11 octobre 2026](AUDIT_MODALES_2026-10-11.md) | Inventaire des parcours actifs ; surfaces, focus, brouillons, conflits et erreurs corrigés ; navigateur à quatre largeurs avec API simulées ; intégration sensible à compléter |
| [Pages restantes — 11 octobre 2026](AUDIT_PAGES_RESTANTES_2026-10-11.md) | Accueil, connexion, Mon compte, création de personne, feuille de route et états techniques ; 58 scénarios navigateur isolé, 1 046 tests réussis ; intégration authentifiée à compléter |
| [Paramètres système — 10–11 octobre 2026](AUDIT_PARAMETRES_2026-10-11.md) | Présentation, confirmations, focus et réponses tardives corrigés ; 32 scénarios Chromium isolé ; aucune purge ni mutation réelle |
| [Autorisations de la fiche utilisateur — 10 octobre 2026](AUDIT_AUTORISATIONS_UTILISATEUR_2026-10-10.md) | Éditeur et autonomie harmonisés ; dépendances, catalogue affiché et aperçu corrigés ; 36 combinaisons Chromium isolé ; mutations authentifiées non rejouées |
| [Menus déroulants — 10 octobre 2026](AUDIT_MENUS_2026-10-10.md) | Audit transverse des onze consommateurs actifs ; focus, ouverture et arrondis harmonisés ; 60 combinaisons navigateur isolé, puis présentation filtre/fiche alignée et comparée à quatre largeurs ; 1 036 tests réussis, 25 ignorés ; parcours authentifiés non rejoués |
| [Fiche utilisateur — 10 octobre 2026](AUDIT_FICHE_UTILISATEUR_2026-10-10.md) | Audit puis correction : USR-D01 à USR-D08 corrigés et vérifiés, synthèse compactée ; 1 036 tests réussis, 25 ignorés, build/budgets réussis ; onze scénarios Chromium sur PostgreSQL isolé, step-up réel ; preuves et limites explicites |
| [Création d'utilisateur — 10 octobre 2026](AUDIT_CREATION_UTILISATEUR_2026-10-10.md) | Analyse puis corrections USR-N01 à USR-N07 ; sept largeurs dans Next réel, créations USER/ADMIN, TOTP, réponse perdue et reprise sur PostgreSQL isolé ; 1 028 tests réussis, preuves et limites datées |
| [Utilisateurs — 10 octobre 2026](AUDIT_UTILISATEURS_2026-10-10.md) | Analyse puis corrections USR-09 à USR-17 ; 1 018 tests web réussis, build et budgets réussis ; Chromium à neuf largeurs sur Next/PostgreSQL isolés et sessions préparées ; connexion/MFA, charge et accessibilité complète non validés |
| [Répertoire — 10 octobre 2026](AUDIT_REPERTOIRE_2026-10-10.md) | Audit, corrections et quatre améliorations UX ; 112 tests du périmètre, PostgreSQL isolé et navigateur ; session réelle complète non exécutée |
| [Organisation documentaire — 10 octobre 2026](ORGANISATION_DOCUMENTAIRE_2026-10-10.md) | Corrections, méthode enrichie et validation du corpus ; aucun verdict de fonctionnement global du site |
| [Compréhension du projet — 10 octobre 2026](COMPREHENSION_PROJET_2026-10-10.md) | Cartographie code/site, contrôles techniques et limites ; état avant la réorganisation documentaire |
| [Interface Utilisateurs — 26 septembre 2026](AUDIT_UI_UTILISATEURS_2026-09-26.md) | Audit visuel historique, complété depuis par le suivi Utilisateurs |
| [URL — 24 septembre 2026](AUDIT_URLS_2026-09-24.md) | Relevé historique des routes et redirections |
| [UX/UI — 24 septembre 2026](UX_UI_AUDIT_2026-09-24.md) | Revue historique ; plusieurs parcours ont évolué ou ont été retirés |
| [Feuille de route — 22 septembre 2026](AUDIT_FEUILLE_DE_ROUTE_LONG_TERME_2026-09-22.md) | Diagnostic de conception antérieur au catalogue courant |
| [Design](AUDIT_DESIGN.md) | Relevé historique ; les règles courantes sont dans DESIGN_SYSTEM et les suivis |
| [Primitives UI](AUDIT_SHADCN.md) | Inventaire historique des composants ; certains chemins cités ont été retirés |
| [Typographie](AUDIT_TYPOGRAPHIE.md) | Inventaire historique ; ne remplace pas les tokens et décisions courantes |

Les dates absentes du nom ne sont pas inventées ; consulter le contenu du rapport.
Les pièces d’audit conservées documentent seulement leur passe d’origine. Les
chemins supprimés restent cités comme texte historique, sans lien cassé ni fichier
factice. Une correction de lien ne rejoue pas la preuve correspondante.
