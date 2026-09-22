# Navigation du site privé — conception de référence

Ce document fige la navigation **avant** que les pages métier soient écrites.
Tant que rien n'est accroché à une entrée de menu, la changer ne coûte presque
rien ; une fois quinze écrans écrits, chaque renommage devient une migration.

Il décrit la cible complète, y compris les pages qui n'existent pas encore, et
la correspondance exacte avec la navigation actuelle. Les pages existantes ne
sont pas réécrites pour l'instant : ce document sert de plan, pas de chantier.

---

## 1. Les principes

1. **On navigue vers un lieu, pas vers une requête.** Un filtre n'est jamais une
   entrée de menu. « Mes tâches » est un lieu ; « tâches en retard » est un
   filtre à l'intérieur.
2. **Trois niveaux, jamais quatre** : pôle → lieu → vue (onglet ou filtre).
3. **Un seul niveau d'imbrication.** Un enfant de menu n'existe que s'il est une
   variante du même objet, jamais pour empiler deux modules différents.
4. **La liste montre, la fiche contient.** La profondeur vit dans les onglets de
   la fiche, pas dans le menu.
5. **Le socle ne vit pas dans la sidebar.** Recherche, notifications, compte et
   changement de pôle sont dans l'en-tête. La sidebar ne contient que des lieux
   de travail.
6. **Un pôle ne montre que ses lieux.** La sidebar affiche le pôle courant, pas
   les sept pôles dépliés. Maximum visible à l'écran : six entrées.
7. **Rien de planifié dans la sidebar.** Un module non livré vit sur la feuille
   de route, jamais dans le menu de travail.
8. **Un mot par notion, un mot pour tout le site.** Le même objet porte le même
   nom dans le menu, la fiche, le journal et les exports.

### Noms retenus

On nomme avec le mot que l'utilisateur emploie, pas avec le nom de la table.

| On dit | On ne dit pas | Pourquoi |
| --- | --- | --- |
| Organisations | Sponsors & partenaires / Bureau & juridique | Le pôle mélangeait une entité et un service |
| Répertoire | Personnes & contacts | Le nom du lieu décrit le contenu, pas la base |
| Opérations | Recettes / Dépenses / Cotisations | Cinq pages pour une seule table |
| Contrôles | Validations finance / Journal financier / Exports | Trois gestes de contrôle réunis |
| Finances | Trésorerie | Le pôle contient aussi les comptes et le budget : « Trésorerie » nomme la fonction, « Finances » décrit le contenu |
| Équipe | Sport / Team Control | « Team Control » est un nom technique |
| Mon travail | Tableau de bord / Mes tâches | Un tableau de bord répond, il n'énumère pas |

---

## 2. Les intentions réelles

La navigation se déduit des gestes, pas des modules :

- Qui est cette personne ? → une **fiche**
- Avec qui travaille-t-on ? → une **organisation**
- Qu'est-ce qui m'attend ? → **mon travail**
- Qu'est-ce qui s'est dit ou décidé ? → la **vie de la structure**
- Qui doit-on recruter ou surveiller ? → les **candidatures** et les **incidents**
- Comment se porte l'équipe ? → le **sportif**
- Où est l'argent ? → les **opérations**
- Qu'est-ce qui est engagé ? → le **budget**
- Qu'est-ce qui doit être validé ? → les **contrôles**
- Qui a accès à quoi, et qu'a-t-on fait ? → le **système**

Dix gestes, sept pôles, vingt-cinq lieux. C'est le gain principal du modèle.

---

## 3. La carte cible

Couleur = ton du pôle, déjà défini dans `globals.css` (`--nav-*`).

| Pôle | Lieux | Ce que les lieux absorbent |
| --- | --- | --- |
| **Aujourd'hui** | Mon travail · Notifications | Tâches, rappels, échéances, documents à accepter, validations en attente, prochaines réunions |
| **Personnes** | Répertoire · Candidatures · Incidents · Matériel | Membres, adhérents, contacts, staff = des **statuts** de la fiche ; onboarding et départ, cotisations = des **onglets** de la fiche |
| **Relations** | Organisations · Documents & contrats · Décisions | Sponsors, partenaires = des **catégories** d'organisation ; documents officiels, contrats, acceptations de chartes, modèles = des **onglets** du coffre |
| **Activité** | Réunions · Calendrier · Débriefs · Actualité | Comptes rendus, présences, décisions de réunion, notes de débrief |
| **Équipe** | Vue d'équipe · Matchs & tournois · Performance | Jeux, rosters, membres esport = des **vues** de l'équipe ; scrims et calendrier esport = des **filtres** de matchs |
| **Finances** | Opérations · Budget & bilans · Comptes · Contrôles | Recettes, dépenses, cotisations, sponsoring, remboursements, factures = des **filtres** d'opérations ; validations, journal, exports et archives = des **vues** de contrôle |
| **Système** | Comptes · Journal d'activité · Paramètres · Modèles · Données · Feuille de route | Rôles et autorisations = des onglets de la fiche compte ; sauvegardes, exports et archives globales = les vues de Données |

### Ce que chaque lieu contient

**Mon travail** — la seule page d'accueil. Elle répond à « qu'est-ce qui
m'attend » : mes tâches, ce qui est en attente de ma validation, les documents à
lire ou accepter, les échéances proches. Elle ne contient pas de grille de
raccourcis : si un raccourci est nécessaire, c'est que la navigation a échoué.

**Répertoire** — une liste, une fiche. Le statut dans la structure (membre,
adhérent, contact, staff, externe) est un filtre et un onglet, pas une page.

**Organisations** — une liste, une fiche par organisation, avec ses
interlocuteurs, ses périodes de relation, son suivi et ses documents liés en
onglets.

**Opérations** — une seule liste, filtrée par nature (recette, dépense,
cotisation, sponsoring, remboursement) et par période. Chaque opération porte
son justificatif.

**Contrôles** — tout ce qui relève du contrôle et de la trace : ce qui attend
validation, le journal financier, les exports, les archives.

**Système** — les comptes, le journal d'activité, la configuration, les modèles
et les données. Six lieux parce que c'est le pôle technique ; il n'est visible
que par ceux qui y ont accès.

---

## 4. Correspondance avec la navigation actuelle

Les 61 entrées déclarées aujourd'hui sont toutes conservées sous une forme ou
une autre. Aucune page n'est perdue : celles qui disparaissent du menu
deviennent un onglet, un filtre ou une vue de la page qui les portait déjà.

| Aujourd'hui | Devient | Où |
| --- | --- | --- |
| Tableau de bord → Vue d'ensemble | Mon travail | Aujourd'hui |
| Tableau de bord → Mes notifications | Notifications | Aujourd'hui |
| Tableau de bord → Mes tâches | Bloc « mes tâches » | Mon travail |
| Tableau de bord → Prochaines réunions | Bloc échéances | Mon travail |
| Tableau de bord → Documents à accepter | Bloc à lire | Mon travail |
| Tableau de bord → Alertes importantes | Bloc à traiter | Mon travail |
| Tableau de bord → Mes rappels | Bloc rappels | Mon travail |
| Recherche avancée | Recherche (en-tête, ⌘K) | Socle |
| Feuille de route | Feuille de route | Système |
| Vie interne → Vue d'ensemble | Supprimée | Page d'accueil de pôle sans contenu propre |
| Vie interne → Répertoire | Répertoire | Personnes |
| Vie interne → Actualité interne | Actualité | Activité |
| Vie interne → Réunions & suivi (+ ses 3 enfants) | Réunions · Calendrier · Débriefs | Activité |
| Vie interne → Recrutement & tryouts | Candidatures | Personnes |
| Vie interne → Notifications et rappels | Gestion des rappels | Modèles |
| Vie interne → Membres / Adhérents | Filtres et onglets | Répertoire |
| Vie interne → Onboarding et départ | Onglet de la fiche | Répertoire |
| Bureau & juridique → Vue d'ensemble | Supprimée | Page d'accueil de pôle sans contenu propre |
| Bureau & juridique → Sponsors & partenaires | Organisations | Relations |
| Bureau & juridique → Documents & chartes (+ 3 enfants) | Documents & contrats (+ onglets) | Relations |
| Bureau & juridique → Incidents et sanctions | Incidents | Personnes |
| Bureau & juridique → Inventaire et accès | Matériel | Personnes |
| Bureau & juridique → Décisions du bureau | Décisions | Relations |
| Bureau & juridique → Personnes & contacts | Supprimée | Doublon du Répertoire |
| Trésorerie → Tableau de bord financier | Vue de synthèse | Opérations |
| Trésorerie → Comptes | Comptes | Finances |
| Trésorerie → Budget / Bilans | Budget & bilans | Finances |
| Trésorerie → Opérations | Opérations | Finances |
| Trésorerie → Recettes / Dépenses | Filtres de nature | Opérations |
| Trésorerie → Cotisations adhérents | Filtre « cotisation » | Opérations |
| Trésorerie → Sponsoring financier | Filtre « sponsoring » | Opérations |
| Trésorerie → Factures / justificatifs | Onglet justificatif | Opération |
| Trésorerie → Remboursements | Filtre « remboursement » | Opérations |
| Trésorerie → Exports finance | Vue export | Contrôles |
| Trésorerie → Validations finance | File d'attente | Contrôles |
| Trésorerie → Journal financier | Vue journal | Contrôles |
| Trésorerie → Archives finance | Vue archives | Contrôles |
| Système → Utilisateurs | Comptes | Système |
| Système → Journal d'activité | Journal d'activité | Système |
| Système → Paramètres système | Paramètres | Système |
| Système → Modèles & automatisations (+ 3 enfants) | Modèles (onglets document / notification / automatisation) | Système |
| Système → Validations globales | File d'attente transverse | Contrôles |
| Système → Exports / sauvegardes / Archives globales | Données (vues) | Système |
| Sport → Vue d'ensemble / Jeux / Rosters / Membres esport | Vue d'équipe | Équipe |
| Sport → Scrims / Tournois & matchs / Calendrier esport | Matchs & tournois (filtres) | Équipe |
| Sport → Recrutement & tryouts | Candidatures | Personnes |
| Sport → Débriefs | Débriefs | Activité |
| Sport → Performance | Performance | Équipe |

---

## 5. Ce qui n'aura jamais d'entrée de menu

- **Un filtre** : « recettes », « dépenses », « cotisations », « en retard »,
  « terminés ».
- **Un rapport ou un export** : un bilan, un export comptable.
- **Une action isolée** : envoyer un rappel, relancer un sponsor.
- **Une vue réservée à un rôle** : une page qui n'existe que pour le compte
  racine n'a pas besoin d'être dans le menu de tout le monde.
- **Une page d'accueil de pôle vide** : elle n'est admise que si elle
  **condense** (totaux, en attente, explication de vocabulaire). Une page qui se
  contente de répéter le menu est supprimée — c'est la décision déjà prise pour
  l'ancien accueil du pôle Système.

### Règle d'admission d'une entrée

Une entrée de menu doit satisfaire les quatre conditions :

1. c'est un lieu où l'on revient ;
2. il contient plusieurs objets ;
3. il a un état vide utile (« aucune opération ce mois-ci », pas une page
   blanche) ;
4. il a un nom que l'utilisateur emploierait spontanément.

Si une seule manque, l'écran devient un onglet, une vue ou une section de la
page qui le porte.

---

## 6. Les garanties de ressenti

C'est la partie invisible, et elle est aussi contractuelle que la carte.

1. **Je sais où je suis.** Le pôle porte sa couleur, le fil d'Ariane nomme le
   lieu puis l'objet, l'entrée active est marquée.
2. **Je ne me perds pas.** Aucun cul-de-sac : chaque page a une sortie
   contextuelle qui ramène à la liste précédente **avec ses filtres intacts**.
3. **Je vois ce qu'on attend de moi.** L'accueil répond à une question au lieu
   d'énumérer des liens.
4. **Rien ne bouge sous mes doigts.** Squelette à l'arrivée, rafraîchissement
   non bloquant, pas de saut de mise en page, jamais de saisie perdue ; toute
   page couvre ses états vide, chargement, erreur réessayable, refus et conflit
   de version.
5. **Je ne peux pas faire de bêtise en un clic.** Le réversible ne demande
   rien ; l'irréversible demande une confirmation nominative qui dit ce qui sera
   perdu.
6. **On ne me cache rien sans me le dire.** Une action interdite est expliquée,
   pas simplement absente. Une donnée non visible est annoncée comme telle.

À ces garanties s'ajoutent deux règles de confiance : la recherche est
accessible partout au clavier, et les cinq derniers objets consultés restent à
portée.

---

## 7. Application, par étapes

**Étape 0 — ce document.** Aucun code touché.

**Étape 1 — vocabulaire et regroupement, sans création de page.** Renommer les
pôles et les lieux dans `app.constants.ts`, déplacer les entrées existantes vers
leur pôle cible, retirer les deux accueils de pôle vides et la page doublon
« Personnes & contacts ». Les neuf destinations déjà en ligne ne changent pas de
route, seulement de place et de nom. Cette étape touche quatre fichiers de
contrat en plus de la navigation : le registre des fonctionnalités (libellés de
pôle utilisés par les fils d'Ariane et le journal), les libellés de pôle de
l'éditeur d'autorisations, et les tests de navigation, de permissions et de
contrat de design.

**Étape 2 — pages d'accueil de pôle utiles.** Une seule, pour le pôle qui le
justifie (Finances), avec synthèse et en attente. Pas de hub décoratif ailleurs.

**Étape 3 — ouverture des modules, un par un.** Chaque module livré passe de la
feuille de route au menu, avec ses onglets et ses filtres, et sa fiche absorbe
ce que les autres pages affichaient en double.

**Étape 4 — nettoyage des routes.** Une fois tous les modules livrés, les
anciennes routes devenues des vues sont redirigées vers leur nouveau lieu.

### Ce qui ne change jamais

Les routes déjà en ligne restent stables ; les permissions restent la seule
autorité ; la sidebar ne contient que du livré ; la recherche ne remplace jamais
la navigation, elle la complète.

---

## 8. Liens

- [FEUILLE_DE_ROUTE.md](FEUILLE_DE_ROUTE.md) — les modules et l'ordre de
  construction.
- [STRUCTURE.md](STRUCTURE.md) — le profil de structure.
- [ROLES_ET_PERMISSIONS.md](ROLES_ET_PERMISSIONS.md) — les patrons de rôle et
  la portée.
- [PERMISSIONS.md](PERMISSIONS.md) — le moteur de permissions.
