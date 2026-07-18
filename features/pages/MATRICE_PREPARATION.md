# Matrice de preparation long terme des pages

Ce document prepare les futures implementations sans remplir les pages encore vides.
Les routes qui utilisent encore le gabarit generique doivent rester comme elles sont
tant que leur module metier n'est pas pret.

## Regles de cadrage

- Ne pas transformer une page squelette en faux module.
- Ne pas ajouter de donnees fictives dans une page vide.
- Avant de coder une page, definir ses donnees, permissions, liens, audit et tests.
- Garder le meme langage UI que les pages deja completes: sombre, dense, sobre, oriente gestion.
- Toute action sensible doit creer une entree d'audit avec `poleKey`, `pageKey` et `tabKey`.
- Toute nouvelle page metier doit avoir au minimum: etat vide, etat chargement, erreur, acces refuse, mobile.

## Statuts

- `Live`: page deja fonctionnelle.
- `Live partiel`: page fonctionnelle mais a renforcer avant gros volume.
- `Squelette`: page volontairement generique, a laisser telle quelle.
- `A connecter`: page presente mais elle depend d'un module transverse a creer.
- `Plus tard`: page planifiee mais pas prioritaire.
- `Support`: page technique ou route d'appui.

## Modeles UI cibles

| Modele | Usage | Composants de base |
| --- | --- | --- |
| `ActionHub` | Tableau de bord, alertes, taches, validations | `PageShell`, `PageHeader`, grilles de stats, listes d'actions |
| `DataList` | Listes de membres, documents, operations | filtres, recherche, tri, pagination, actions ligne |
| `EntityDetail` | Detail utilisateur, membre, document, contrat | header, rail d'onglets, sections, audit lateral |
| `FormFlow` | Creation ou modification guidee | formulaire par sections, validation, resume avant envoi |
| `ApprovalQueue` | Validations sensibles | files d'attente, priorite, decision, commentaire obligatoire |
| `DocumentVault` | Documents, chartes, contrats | liste, statut, version, acceptation, pieces jointes |
| `Ledger` | Tresorerie et operations | tableaux denses, filtres periode, totaux, exports |
| `CalendarBoard` | Reunions, calendrier, matchs | vues liste/calendrier, dates, participants |
| `AuditJournal` | Journaux systeme, finance, activite | filtres, cursor pagination, export, details |
| `SettingsHub` | Parametres, modeles, automatisations | groupes de reglages, etats sauvegardes |
| `SearchResults` | Recherche globale | resultats groupes par module, permissions, filtres |

## Permissions cibles

Le socle de permissions est structure par pole pour preparer les futures pages
sans donner un acces trop large via `dashboard:view`.

Important : les permissions citees pour une page `Squelette`, `A connecter` ou
`Plus tard` sont uniquement des identifiants de feuille de route dans
`ROADMAP_PERMISSIONS`. Elles ne sont jamais effectives, stockables ou
attribuables avant que la page, sa politique serveur, son audit et ses tests ne
passent ensemble au statut `Live`. Le catalogue actif et la matrice des roles
sont documentes dans `docs/PERMISSIONS.md`.

| Famille | Permissions a prevoir | Notes |
| --- | --- | --- |
| Dashboard | `dashboard:view`, `dashboard:manage_widgets` | Widgets visibles selon les droits metier. |
| Taches et rappels | `tasks:view`, `tasks:create`, `tasks:update`, `tasks:assign`, `tasks:delete` | Alimente dashboard et notifications. |
| Notifications | `notifications:view`, `notifications:manage`, `notifications:send` | Doit devenir persistant en base. |
| Vie interne | `internal:view`, `members:view`, `members:update`, `meetings:view`, `meetings:update` | Base pour membres, adherents, reunions. |
| Documents | `documents:view`, `documents:create`, `documents:update`, `documents:approve`, `documents:archive` | Commun au juridique, systeme et dashboard. |
| Juridique | `legal:view`, `contracts:view`, `contracts:update`, `incidents:view`, `incidents:update` | Donnees sensibles, audit obligatoire. |
| Tresorerie | `treasury:view`, `treasury:edit`, `treasury:validate`, `treasury:export`, `treasury:audit`, `treasury:archives` | Finance isolee avec controles separes. |
| Systeme | actifs : `audit:view`, `audit:view_sensitive`, `audit:export`; API sans ecran : `settings:view`, `settings:update`; planifies : `system:validate`, `backups:view`, `system:archives`, `system:automation` | Ne pas tout melanger avec `users:*`. |
| Sport | `sport:view`, `sport:update`, `sport:public_sync` | Priorite plus tard, lecture publique separee. |

## Entites transversales a prevoir

| Entite | Sert a | Liee a |
| --- | --- | --- |
| `User` | Connexion, permissions, audit | toutes les actions |
| `MemberProfile` | Membre interne ou esport | utilisateur, adherent, roster |
| `Contact` | Personnes externes | sponsors, contrats, incidents |
| `Task` | Travail a faire | dashboard, rappels, validations |
| `Reminder` | Relance personnelle ou equipe | notifications, reunions, documents |
| `Notification` | Centre de notifications persistant | taches, validations, alertes |
| `Meeting` | Reunions et debriefs | calendrier, decisions, documents |
| `Document` | Fichier, charte, modele, contrat | acceptations, validations, juridique |
| `DocumentAcceptance` | Signature ou acceptation | dashboard, adherents, juridique |
| `SponsorPartner` | Sponsor ou partenaire | contrats, recettes, contacts |
| `Incident` | Incident, sanction, suivi | membre, juridique, audit |
| `AssetAccess` | Inventaire et acces | utilisateur, membre, juridique |
| `Decision` | Decision du bureau | reunion, document, audit |
| `TreasuryAccount` | Compte financier | operations, bilans |
| `FiscalYear` | Exercice | budget, bilans, exports |
| `FinancialOperation` | Recette ou depense | justificatif, validation, journal |
| `InvoiceAttachment` | Facture ou justificatif | operation, remboursement |
| `Reimbursement` | Remboursement | membre, depense, validation |
| `Approval` | Validation transverse | finance, documents, systeme |
| `Template` | Modele document ou notification | automatisations |
| `AutomationRule` | Regle automatique | notifications, rappels, exports |
| `SportRoster` | Equipe esport | joueurs, matchs, performance |
| `SportEvent` | Scrim, match, tournoi | calendrier, debriefs |

## Matrice des pages live et support

| Route | Statut | Modele cible | Donnees principales | Permissions | Liens a prevoir |
| --- | --- | --- | --- | --- | --- |
| `/login` | Live | FormFlow auth | session, user, rate-limit | public | audit connexions |
| `/` | Live partiel | ActionHub | stats users, audit recent | `dashboard:view` | taches, rappels, validations |
| `/mon-compte` | Live partiel | EntityDetail personnel | user, sessions, audit | `account:*` | audit, securite, notifications |
| `/mes-notifications` | Live | DataList personnel | notifications du compte connecte | `notifications:view` | dashboard, modules emetteurs |
| `/feuille-de-route` | Live | ActionHub informatif | catalogue des pages planifiees | authentification, aucune permission planifiee | fiches de preparation |
| `/administration` | Support | Redirect | aucune | users selon cible | redirige vers utilisateurs |
| `/administration/utilisateurs` | Live | DataList | users, stats, filtres | `users:view` | fiche utilisateur, export |
| `/administration/utilisateurs/nouveau` | Live | FormFlow | user, role, mot de passe temporaire | `users:create` | fiche utilisateur, audit |
| `/administration/utilisateurs/[id]` | Live partiel | EntityDetail | user, permissions, sessions, audit | `users:*` | compte, securite, historique |
| `/systeme/journal-activite` | Live partiel | AuditJournal | audit logs, filtres, utilisateurs | `audit:view`; `audit:view_sensitive` et `audit:export` sont separes | toutes pages auditees |
| `/recherche` | Live | SearchResults | destinations actives autorisees | authentification puis filtrage selon modules | toutes entites indexees |
| `/not-found` | Support | PageState | aucune | public | retour contextuel plus tard |
| `/error` | Support | PageState | digest erreur | public | support/admin plus tard |

## Tableau de bord

| Route | Statut | Modele cible | Donnees principales | Permissions | Liens a prevoir |
| --- | --- | --- | --- | --- | --- |
| `/tableau-de-bord` | Support | Redirect | aucune | `dashboard:view` sur la cible | redirige vers `/` |
| `/tableau-de-bord/mes-notifications` | Support | Redirect | aucune | `notifications:view` sur la cible | redirige vers `/mes-notifications` |
| `/tableau-de-bord/mes-taches` | A connecter | DataList / ActionHub | taches assignees | `tasks:view` | membres, validations, documents |
| `/tableau-de-bord/mes-rappels` | A connecter | DataList | rappels personnels | `tasks:view` ou `notifications:view` | notifications, calendrier |
| `/tableau-de-bord/prochaines-reunions` | A connecter | CalendarBoard | reunions a venir | `meetings:view` | vie interne, debriefs |
| `/tableau-de-bord/documents-a-accepter` | A connecter | ApprovalQueue | documents en attente | `documents:view` | juridique, documents |
| `/tableau-de-bord/alertes-importantes` | A connecter | ActionHub | alertes systeme/metier | `notifications:view` | tous modules sensibles |

## Vie interne

| Route | Statut | Modele cible | Donnees principales | Permissions | Liens a prevoir |
| --- | --- | --- | --- | --- | --- |
| `/vie-interne` | Squelette | ActionHub | resume pole | `internal:view` | membres, reunions, rappels |
| `/vie-interne/actualite-interne` | A connecter | DataList | annonces internes | `internal:view` | notifications |
| `/vie-interne/membres-adherents` | A connecter | ActionHub | membres, adherents, statuts | `members:view` | cotisations, documents |
| `/vie-interne/membres` | A connecter | DataList | profils membres | `members:view` | utilisateur, incidents, rosters |
| `/vie-interne/adherents` | A connecter | DataList | adherents, cotisation | `members:view` | tresorerie, documents |
| `/vie-interne/onboarding-depart` | A connecter | ApprovalQueue | arrivees, departs, checklist | `members:update` | acces, documents, sessions |
| `/vie-interne/reunions-suivi` | A connecter | ActionHub | reunions, decisions, actions | `meetings:view` | taches, decisions |
| `/vie-interne/reunions` | A connecter | DataList / FormFlow | reunions | `meetings:update` | calendrier, debriefs |
| `/vie-interne/calendrier-interne` | A connecter | CalendarBoard | evenements internes | `meetings:view` | dashboard, rappels |
| `/vie-interne/debriefs` | A connecter | DataList | comptes rendus | `meetings:view` | reunions, taches |
| `/vie-interne/recrutement-tryouts` | A connecter | DataList | candidatures, essais | `members:update` | sport, onboarding |
| `/vie-interne/notifications-rappels` | A connecter | SettingsHub / DataList | rappels, notifications | `notifications:manage` | centre notifications |

## Bureau juridique

| Route | Statut | Modele cible | Donnees principales | Permissions | Liens a prevoir |
| --- | --- | --- | --- | --- | --- |
| `/bureau-juridique` | Squelette | ActionHub | resume juridique | `legal:view` | documents, incidents, decisions |
| `/bureau-juridique/sponsors` | A connecter | DataList | sponsors, partenaires | `legal:view` | contrats, recettes |
| `/bureau-juridique/personnes-contacts` | A connecter | DataList | contacts externes | `legal:view` | sponsors, contrats |
| `/bureau-juridique/documents` | A connecter | DocumentVault | documents et chartes | `documents:view` | acceptations, modeles |
| `/bureau-juridique/documents-officiels` | A connecter | DocumentVault | documents officiels | `documents:view` | exports, archives |
| `/bureau-juridique/contrats` | A connecter | DocumentVault / EntityDetail | contrats | `contracts:view` | sponsors, finance |
| `/bureau-juridique/acceptation-chartes` | A connecter | ApprovalQueue | signatures, acceptations | `documents:approve` | dashboard, membres |
| `/bureau-juridique/incidents-sanctions` | A connecter | DataList / EntityDetail | incidents, sanctions | `incidents:view` | membres, audit |
| `/bureau-juridique/inventaire-acces` | A connecter | DataList | materiel, acces, comptes | `legal:view` | utilisateurs, depart |
| `/bureau-juridique/decisions-bureau` | A connecter | DataList | decisions | `legal:view` | reunions, documents |

## Tresorerie

| Route | Statut | Modele cible | Donnees principales | Permissions | Liens a prevoir |
| --- | --- | --- | --- | --- | --- |
| `/tresorerie` | Squelette | ActionHub finance | resume financier | `treasury:view` | operations, validations |
| `/tresorerie/comptes` | A connecter | DataList | comptes financiers | `treasury:view` | operations, bilans |
| `/tresorerie/budget` | A connecter | Ledger | budget par exercice | `treasury:view` | bilans, operations |
| `/tresorerie/bilans` | A connecter | Ledger | bilans, exercices | `treasury:view` | exports, archives |
| `/tresorerie/operations` | A connecter | Ledger | operations financieres | `treasury:edit` | justificatifs, journal |
| `/tresorerie/recettes` | A connecter | Ledger | recettes | `treasury:view` | sponsors, cotisations |
| `/tresorerie/depenses` | A connecter | Ledger | depenses | `treasury:view` | factures, remboursements |
| `/tresorerie/cotisations-adherents` | A connecter | Ledger / DataList | cotisations | `treasury:view` | adherents, rappels |
| `/tresorerie/sponsoring-financier` | A connecter | Ledger | paiements sponsors | `treasury:view` | sponsors, contrats |
| `/tresorerie/factures-justificatifs` | A connecter | DocumentVault | justificatifs | `treasury:view` | operations |
| `/tresorerie/remboursements` | A connecter | ApprovalQueue | demandes remboursement | `treasury:validate` | membres, depenses |
| `/tresorerie/exports-finance` | A connecter | SettingsHub / Export | exports | `treasury:export` | bilans, operations |
| `/tresorerie/validations-finance` | A connecter | ApprovalQueue | validations sensibles | `treasury:validate` | operations, audit |
| `/tresorerie/journal-financier` | A connecter | AuditJournal | audit financier | `treasury:audit` | operations |
| `/tresorerie/archives-finance` | A connecter | DocumentVault | archives | `treasury:archives` | exports, bilans |

## Systeme

| Route | Statut | Modele cible | Donnees principales | Permissions | Liens a prevoir |
| --- | --- | --- | --- | --- | --- |
| `/systeme` | Live partiel | SettingsHub | resume systeme | au moins `users:view` ou `audit:view` | utilisateurs, journal |
| `/systeme/parametres` | A connecter | SettingsHub | reglages globaux | API active non attribuable : `settings:view`, `settings:update`; ecran planifie | audit |
| `/systeme/validations` | A connecter | ApprovalQueue | validations globales | `system:validate` | finance, documents |
| `/systeme/exports-sauvegardes` | A connecter | SettingsHub / Export | exports, backups | `backups:view` | archives |
| `/systeme/archives` | A connecter | DocumentVault | archives globales | `system:archives` | documents, finance |
| `/systeme/modeles` | A connecter | SettingsHub | modeles | `system:settings` | documents, notifications |
| `/systeme/modeles-documents` | A connecter | DocumentVault | modeles documents | `documents:update` | juridique |
| `/systeme/modeles-notifications` | A connecter | SettingsHub | modeles messages | `notifications:manage` | automatisations |
| `/systeme/automatisations` | A connecter | SettingsHub | regles automatiques | `system:automation` | notifications, rappels |

## Sport / Team Control

| Route | Statut | Modele cible | Donnees principales | Permissions | Liens a prevoir |
| --- | --- | --- | --- | --- | --- |
| `/sport-team-control` | Plus tard | ActionHub sport | resume esport | `sport:view` | site public plus tard |
| `/sport-team-control/jeux` | Plus tard | DataList | jeux suivis | `sport:view` | rosters |
| `/sport-team-control/rosters` | Plus tard | DataList / EntityDetail | equipes | `sport:view` | membres esport |
| `/sport-team-control/membres-esport` | Plus tard | DataList | joueurs | `sport:view` | membres internes |
| `/sport-team-control/scrims` | Plus tard | CalendarBoard | scrims | `sport:update` | calendrier |
| `/sport-team-control/tournois-matchs` | Plus tard | CalendarBoard | matchs, tournois | `sport:update` | debriefs |
| `/sport-team-control/calendrier-esport` | Plus tard | CalendarBoard | calendrier esport | `sport:view` | dashboard |
| `/sport-team-control/recrutement-tryouts` | Plus tard | DataList | tryouts esport | `sport:update` | onboarding |
| `/sport-team-control/debriefs` | Plus tard | DataList | debriefs matchs | `sport:view` | performance |
| `/sport-team-control/performance` | Plus tard | ActionHub | stats performance | `sport:view` | matchs |

## Checklist avant implementation d'une page

1. Confirmer que la page passe de `Squelette` a `A connecter`.
2. Creer ou etendre les modeles Prisma necessaires.
3. Ajouter les permissions dans les constantes, avec dependances.
4. Definir les routes API et leurs contrats de reponse.
5. Ajouter les cles d'audit: `poleKey`, `pageKey`, `tabKey`.
6. Choisir le modele UI cible dans ce document.
7. Ajouter etats vide, chargement, erreur, acces refuse.
8. Ajouter tests unitaires pour permissions et API.
9. Ajouter un scenario e2e minimal quand la page devient live.
10. Mettre a jour cette matrice avec le nouveau statut.

## Ordre conseille

1. Stabiliser les transverses: notifications, taches, documents, validations.
2. Brancher le dashboard sur ces transverses.
3. Construire Vie interne: membres, adherents, reunions.
4. Construire Juridique: documents, contrats, acceptations.
5. Construire Tresorerie: comptes, operations, validations, exports.
6. Construire Systeme: parametres, modeles, automatisations.
7. Garder Sport / Team Control pour une phase ulterieure.
