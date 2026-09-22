# Feuille de route — décisions de tri et ordre de construction

Ce document est la couche de décision au-dessus de
`features/pages/MATRICE_PREPARATION.md` et des fiches de
`features/pages/*.md`. La matrice reste la référence page par page ; ce fichier
fixe ce qui existe, ce qui fusionne, ce qui s'ajoute et dans quel ordre.

---

## 1. Les principes

- Une page est un **lieu**, pas une requête ni une table.
- Un filtre, un onglet ou un rapport n'est jamais une entrée de menu.
- Une donnée a un module principal ; les autres pages l'affichent en lecture
  seule.
- Rien de planifié n'apparaît dans la sidebar.
- Aucun champ dormant.
- La société et l'association partagent le même socle ; la différence est une
  configuration, comme décrit dans [STRUCTURE.md](STRUCTURE.md).

---

## 2. Ce qui est conservé tel quel

- Le répertoire des personnes.
- Les organisations (sponsors et partenaires).
- Les documents et contrats.
- Les réunions, le calendrier, les débriefs et l'actualité interne.
- Les opérations, le budget, les comptes et les contrôles financiers.
- Les candidatures, les incidents et le matériel.
- La performance et la préparation sportive.
- Les comptes utilisateurs, le journal d'activité et les paramètres.

---

## 3. Ce qui fusionne

| Avant | Après |
| --- | --- |
| Préparation match, préparation scrim, stratégie, VOD review | un lieu **Préparation**, quatre onglets |
| Performance, objectifs | un lieu **Performance**, deux onglets |
| Entraînements | un type d'événement du **Calendrier** |
| Mes tâches, tâches internes | une entité `Task`, deux vues |
| Demandes internes | un workflow de **Validation** (`Approval`) |
| Recettes, dépenses, cotisations, sponsoring, remboursements | des filtres d'**Opérations** |
| Exports, journal, archives, validations financières | des vues de **Contrôles** |
| Membres, adhérents, contacts, staff | des statuts de la fiche **Personne** |
| Archives globales, financières, système | une archive par module |

---

## 4. Ce qui est supprimé

- La messagerie interne : Discord la remplace, au moins au début.
- Les pages « Membres », « Adhérents » et « Contacts » comme lieux de menu :
  ce sont des statuts.
- Les accueils de pôle qui ne font que répéter le menu : ils sont admis
  uniquement s'ils condensent des informations utiles.

---

## 5. Ce qui est ajouté

Priorité P1 (avant le premier module métier) :

- **Espace personnel** : mon planning, mes documents, mes disponibilités, mes
  cotisations, mes objectifs.
- **Patrons de rôle** et **portée des permissions** : voir
  [ROLES_ET_PERMISSIONS.md](ROLES_ET_PERMISSIONS.md).
- **Saison** et **exercice** en entités de première classe.

Priorité P2 (avec les modules qui en dépendent) :

- **Licences et affiliations** : fédération, assurance, licences joueurs.
- **Contrats internes** : joueurs et staff.
- **Disponibilités** : pour planifier les entraînements et les scrims.
- **Conformité et consentements** : RGPD, droit à l'image, mineurs.

Priorité P3 (plus tard, sans bloquer) :

- **Suivi du temps** : heures d'entraînement et de bénévolat.
- **Communication** : calendrier éditorial, assets, annonces publiques.
- **Import / export avec le site public** et **API privée**.

---

## 6. Les entités transversales

Les entités existantes restent : `User`, `Person`, `Notification`,
`PartnerOrganization`. Les entités planifiées sont complétées :

| Entité | Rôle |
| --- | --- |
| `Season` | cycle sportif : rosters, objectifs, cotisations, contrats |
| `FiscalYear` | exercice comptable : opérations, budget, bilans |
| `Task` | travail à faire, assigné ou personnel |
| `Meeting` | réunion, avec ses décisions et ses documents |
| `Document` | charte, contrat, reçu, facture, PV, consentement |
| `DocumentAcceptance` | lecture et acceptation par une personne |
| `FinancialOperation` | recette ou dépense, en natures |
| `InvoiceAttachment` | justificatif d'une opération |
| `Approval` | validation transverse, dont la finance |
| `Incident` | incident, sanction, suivi |
| `AssetAccess` | matériel et accès confiés |
| `SportRoster` et `SportEvent` | équipes et événements sportifs |
| `Consent` | consentement RGPD et droit à l'image |

---

## 7. L'ordre de construction

1. **Socle** : authentification, permissions, journal, paramètres — déjà en
   place.
2. **Préparation** : profil de structure, saison, exercice, patrons de rôle,
   portée des permissions.
3. **Espace personnel** : la première chose utile pour tous les comptes.
4. **Répertoire et organisations** : les deux briques d'identité et de
   relation.
5. **Activité** : réunions, calendrier, débriefs, actualité.
6. **Finances** : opérations, budget, comptes, contrôles.
7. **Équipe et performance** : ce qui relie le privé au site public.

Chaque module est livré avec sa politique serveur, ses permissions, son audit
et ses tests, jamais une page isolée.

---

## 8. Ce qui reste hors périmètre

- La synchronisation automatique avec le site public tant qu'une API privée
  n'est pas cadrée.
- Les notifications externes par email ou Discord tant que la messagerie
  interne n'est pas remplacée par un canal réel.
- Toute automatisation qui exigerait un processus permanent : l'application
  reste mono-processus.

---

## 9. Liens

- [NAVIGATION.md](NAVIGATION.md) — les lieux et les règles de menu.
- [STRUCTURE.md](STRUCTURE.md) — le profil de structure.
- [ROLES_ET_PERMISSIONS.md](ROLES_ET_PERMISSIONS.md) — les patrons et la portée.
- [PERMISSIONS.md](PERMISSIONS.md) — le moteur de permissions.
