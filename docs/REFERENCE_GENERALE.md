# Référence générale — le parcours de tout travail

**Point d’entrée unique.** Pour créer, modifier, corriger, optimiser,
refactoriser, retirer, auditer ou documenter quoi que ce soit (page, section,
composant, API, tâche, schéma, style), suivre ce fichier du début à la fin. Il
liste **tous les points à examiner**. Chaque point renvoie vers un fichier qui
l’approfondit : ce fichier n’est ouvert **que si le point concerne le travail**
ou ses effets indirects. La méthode vaut aussi sans page : API, tâche, schéma
ou composant partagé.

```text
1. Cadrer          → résultat attendu, surfaces, risque
2. Examiner        → parcourir les 36 points, ouvrir les fichiers concernés
3. Travailler      → réutiliser, vérifier les consommateurs
4. Conclure        → vérifier, puis mettre à jour la documentation
```

## 0. Toujours, avant de commencer

- Lire les [consignes du dépôt](../AGENTS.md). Le projet est **en
  développement** : simplifier et refactoriser au besoin, sans compatibilité
  hypothétique avec une production inexistante. Les données locales ne sont pas
  jetables par défaut ; l’intégrité, les contrôles d’accès et les migrations
  reproductibles restent exigés.
- Ouvrir la **fiche de la page ou du module** dans [docs/pages](pages/README.md) :
  décisions déjà prises, points ouverts. Les choix déjà donnés ne se
  redemandent pas.
- Pour toute interface, ouvrir le [système de design](design/README.md) et le
  [journal des préférences](design/preferences.md) du propriétaire.

## 1. Cadrer le travail

Répondre brièvement :

- Quel problème réel, quelle personne utilisatrice et quelle fréquence d’usage ?
- Quelle page ou quel module est propriétaire ? Quels autres écrans le consomment ?
- Que change-t-on exactement, et qu’est-ce qui permet de conclure que cela aide ?
- Quel est l’état actuel constaté, la décision demandée et la cible future ?
- Peut-on réutiliser l’existant, simplifier ou ne pas ajouter cette fonction ?
- Quels volumes, droits, données historiques et personnes seront affectés ?
- Que devient le changement en cas d’erreur, annulation, concurrence ou départ d’un responsable ?

Distinguer ce qui est implémenté, demandé ou seulement proposé. Une amélioration
locale ne déclenche pas une refonte générale sans besoin ; un composant partagé
impose en revanche d’identifier les autres consommateurs réellement affectés.

| Situation | Première démarche |
| --- | --- |
| **Créer** une page ou une fonctionnalité | Définir accès, données et opérations ; chercher le gabarit, les composants et un exemple comparable ; déclarer la fonctionnalité dans le registre ; créer la fiche de page |
| **Modifier ou refactoriser** | Identifier les contrats existants, les entrées et les consommateurs affectés |
| **Retirer** | Examiner branchements, données, liens, droits, fichiers, tâches et notifications encore dépendants |
| **Auditer** | Suivre la [méthode d’audit](methode/audit.md) ; choisir audit ciblé, complet ou transverse |
| **Harmoniser une page** | Partir des [pages de référence](design/README.md#pages-de-référence) et de l’[harmonisation](design/harmonisation.md#état-par-page) |

### Choisir la profondeur

| Risque réellement touché | Exemples | Vérification attendue |
| --- | --- | --- |
| Léger | Texte, espacement local, documentation | Sélection rapide de tous les points, lecture des fichiers touchés, vérification ciblée ; pas de nouveau test artificiel |
| Fonctionnel | Parcours, formulaire, filtre, champ ou règle métier | Cas normaux et limites, droits, erreurs, impacts serveur et données, tests pertinents |
| Sensible | Accès, argent, suppression, migration, secrets, partage externe | Scénarios d’abus et de panne, intégrité, reprise, confidentialité et validation représentative sur environnement isolé |

Retenir le risque le plus élevé réellement affecté. Aucun score moyen ne compense
une fuite de données ou un risque de perte financière. Cela ne transforme pas
chaque intervention en audit complet ni en demande d’autorisation supplémentaire.

## 2. Points à examiner

Parcourir **tous** les points ci-dessous et classer chacun :

- **À examiner** : déclencheur présent ; ouvrir le fichier et choisir les contrôles utiles.
- **Non applicable** : capacité absente et non nécessaire dans ce périmètre.
- **Hors impact** : capacité présente, mais inchangée et sans effet indirect identifié.
- **À clarifier** : information manquante ; l’ignorance ne vaut pas non-applicabilité.

« Non applicable » et « hors impact » ont une raison courte. Pour une petite
retouche, regrouper les exclusions en une phrase : aucun tableau à recopier
dans le compte rendu. Réviser le classement si l’implémentation révèle une
dépendance ou élargit le périmètre.

Les identifiants Q01 à Q30 sont stables depuis le 26 septembre 2026. Q33 à Q36
ont été ajoutés le 19 octobre 2026 avec les mêmes numéros que la méthode du
site Noctambule ; Q31 (publication publique et référencement) et Q32 (audience)
y sont réservés et deviendront des points quand ces modules existeront ici
([sujets futurs](propositions/sujets-futurs.md)).

### A. Cadrage et continuité

| ID | Point à examiner | Fichier détaillé |
| --- | --- | --- |
| Q01 | Quel problème résout-on, pour qui et avec quel résultat observable ? **Toujours examiné.** | [Besoin, périmètre et règles métier](references/cadrage-metier.md), section 1 ci-dessus |
| Q33 | La page ou le module a-t-il une fiche ? Ses décisions et points ouverts sont-ils lus ? | [Fiches des pages](pages/README.md) |
| Q34 | Le propriétaire a-t-il déjà exprimé une préférence ou une décision sur ce sujet ? | [Préférences](design/preferences.md), fiche de la page |
| Q35 | Une proposition, une intention ou un besoin futur existe-t-il déjà sur ce sujet ? | [Propositions](propositions/README.md), [feuille de route](propositions/feuille-de-route.md) |

### B. Interface et expérience

| ID | Point à examiner | Fichier détaillé |
| --- | --- | --- |
| Q02 | Une page, un lien, une action, un état ou un libellé change-t-il ? | [Parcours, navigation et contenu](references/parcours-navigation.md), [navigation](domaines/navigation.md) |
| Q03 | Pour chaque élément, le composant choisi sert-il le besoin ? Son rendu, sa densité, sa hiérarchie ou un état visuel change-t-il ? | [Composition, couleurs et composants](references/interface-visuelle.md), [système de design](design/README.md) : [principes](design/principes.md), [gabarits](design/gabarits.md), [composants](design/composants.md), [fondations](design/fondations.md) |
| Q36 | Chaque élément utilise-t-il la variante autorisée de son rôle (police, hauteur, rayon, badge, tons) et la page reste-t-elle alignée sur les pages de référence ? | [Variantes autorisées](design/fondations.md#variantes-autorisées), [harmonisation](design/harmonisation.md), [pages de référence](design/README.md#pages-de-référence) |
| Q04 | Une interaction, un contenu ou une présentation est-il ajouté ou modifié ? | [Accessibilité et adaptation](references/accessibilite.md) |
| Q05 | Y a-t-il une collection, une synthèse, une recherche ou des résultats volumineux ? | [Listes, recherche, filtres et pagination](references/listes-recherche.md), [comportements](design/comportements.md#listes-recherche-et-pagination) |
| Q06 | L’utilisateur saisit-il, décide-t-il, publie-t-il ou déclenche-t-il une mutation ? | [Formulaires, actions et validations](references/formulaires-actions.md), [comportements](design/comportements.md#saisie-brouillon-et-enregistrement) |
| Q07 | Faut-il expliquer le résultat d’une action ou un échec ? Un retour local suffit-il ? | [Toasts et retours immédiats](references/toasts-feedback.md), [politique des retours](references/feedback.md) |

Pour concevoir, refondre ou revoir une page en profondeur, utiliser en plus la
[grille de questions de revue](methode/questions-revue-page.md).

### C. Accès, sécurité et confidentialité

| ID | Point à examiner | Fichier détaillé |
| --- | --- | --- |
| Q09 | Une donnée, une route, une action ou une portée d’accès est-elle exposée ou modifiée ? | [Permissions et périmètres d’accès](references/permissions.md), [domaine Permissions](domaines/permissions.md), [rôles métier](domaines/roles-metier.md) |
| Q10 | Une entrée, une session, une donnée sensible ou une frontière de confiance est-elle touchée ? | [Sécurité et scénarios d’abus](references/securite.md), [inventaire des API](systeme/api.md) |
| Q11 | Traite-t-on des personnes, coordonnées, mineurs, dossiers confidentiels ou données transmises à un tiers ? | [Confidentialité, finalités et conservation](references/confidentialite.md) |

### D. Données et cohérence

| ID | Point à examiner | Fichier détaillé |
| --- | --- | --- |
| Q12 | Le stockage, une relation, une contrainte, un index ou le sens d’une donnée change-t-il ? | [Modèle de données et schéma Prisma](references/schema-prisma.md), [inventaire des données](systeme/donnees.md) |
| Q13 | Des données ou installations existantes doivent-elles changer de format ou de comportement ? | [Migrations et compatibilité](references/migrations.md), [guide de la base](../packages/database/prisma/README.md) |
| Q14 | Une lecture serveur, une mutation, un import ou une commande peut-elle être rejouée ou concurrencée ? | [API, intégrité et concurrence](references/api-concurrence.md), [architecture d’une fonctionnalité](references/architecture-fonctionnalite.md) |
| Q16 | Retire-t-on une donnée, un champ, une route, un droit, une intégration ou un module ? | [Suppression, archivage et retrait](references/suppression-archivage.md) |
| Q21 | Les données entrent-elles ou sortent-elles en masse, sous forme de fichier ou de synchronisation ? | [Imports et exports](references/imports-exports.md) |
| Q22 | Une date, saison, échéance, récurrence, devise, unité ou comparaison temporelle intervient-elle ? | [Dates, périodes et localisation](references/temps-localisation.md) |
| Q26 | Y a-t-il un montant, un engagement, une facture, un paiement, une dotation ou un livrable partenaire ? | [Finances, contrats et partenaires](references/finance-contrats.md) |

### E. Effets indirects et services

| ID | Point à examiner | Fichier détaillé |
| --- | --- | --- |
| Q08 | Un destinataire doit-il être informé plus tard, agir ou respecter une échéance ? | [Notifications, alertes et rappels](references/notifications.md), [politique des retours](references/feedback.md) |
| Q15 | Faut-il pouvoir expliquer qui a fait quoi, quand, sur quel objet et avec quel résultat ? | [Audit et historique métier](references/audit-historique.md) |
| Q20 | Une pièce, image, VOD, justificatif, document émis ou version signée est-il manipulé ? | [Documents et fichiers](references/documents-fichiers.md) |
| Q23 | Un traitement différé, webhook, prestataire, canal externe ou outil d’IA intervient-il ? | [Automatisations et intégrations](references/automatisations-integrations.md) |

### F. Performance et architecture

| ID | Point à examiner | Fichier détaillé |
| --- | --- | --- |
| Q17 | Le coût de chargement, calcul, requête, rendu ou stockage peut-il changer avec le volume ? | [Performance et capacité](references/performance.md) |
| Q18 | Existe-t-il un problème mesuré ou une complexité évitable justifiant une optimisation ? | [Optimisation et caches](references/optimisation.md) |
| Q19 | Ajoute-t-on une responsabilité, une abstraction, un composant partagé ou une dépendance entre modules ? | [Architecture et maintenabilité](references/architecture.md), [architecture d’une fonctionnalité](references/architecture-fonctionnalite.md), [architecture du système](systeme/architecture.md) |

### G. Règles métier

| ID | Point à examiner | Fichier détaillé |
| --- | --- | --- |
| Q24 | Le changement concerne-t-il une entité, un mandat, une décision, une responsabilité ou un transfert ? | [Structure juridique et gouvernance](references/structure-gouvernance.md), [domaine Structure](domaines/structure-juridique.md) |
| Q25 | Des membres, joueurs, coachs, équipes, compétitions, matériels ou dossiers sensibles sont-ils concernés ? | [Personnes, équipes et vie esport](references/esport-personnes.md), autres [domaines](domaines/README.md) |

### H. Exploitation et continuité

| ID | Point à examiner | Fichier détaillé |
| --- | --- | --- |
| Q28 | Le déploiement, la configuration, les erreurs, la supervision ou la continuité peuvent-ils changer ? | [Exploitation, observation et incidents](references/exploitation.md), [procédures d’exploitation](exploitation/operations.md) |
| Q29 | Une donnée persistante, un fichier, une clé, une purge ou le format de sauvegarde change-t-il ? | [Sauvegarde, restauration et réversibilité](references/sauvegarde-restauration.md), [récupération du compte racine](../packages/database/ROOT_RECOVERY.md) |
| Q30 | Une bibliothèque, une version, un secret, un réglage ou une règle documentaire change-t-il ? | [Dépendances, configuration et documentation](references/dependances-configuration.md), [organisation documentaire](methode/organisation-documentaire.md) |

### I. Vérification

| ID | Point à examiner | Fichier détaillé |
| --- | --- | --- |
| Q27 | Quelle vérification proportionnée démontre le résultat et ses limites ? **Toujours examiné.** | [Tests et validation](references/tests-validation.md), [tests et contrôles disponibles](systeme/tests.md) |

**Effets indirects :** une capacité transversale reste pertinente même sans
bouton visible : les totaux, notifications, exports, pièces, caches et liens
directs peuvent révéler une donnée. Une page privée conserve un contrôle
serveur ; « pas de nouvelle permission » ne signifie jamais « pas de contrôle
d’accès ». Changer un composant partagé touche toutes les pages qui l’utilisent.
Une recherche ciblée des imports et appels suffit souvent ; en cas de doute,
inspecter le point d’entrée sans lire tous les modules.

## 3. Travailler avec les points retenus

1. Lire chaque fichier sélectionné et les points d’entrée de code nécessaires.
   Suivre un lien détaillé seulement pour résoudre le besoin précis.
2. Réutiliser registres, composants, gardes et services du module. Une nouvelle
   page n’implique ni permission, ni notification, ni table, ni cache
   supplémentaires. Ne jamais transformer un point en exigence de créer ces éléments.
3. Garder les contrôles sur chaque entrée serveur, les données existantes et les
   responsabilités déléguées. Textes et URL suivent les conventions françaises.
4. Vérifier constantes, signatures, versions et scripts dans leur définition
   actuelle. Une divergence entre règle et code se corrige ou se signale ; elle
   ne se résout pas en supposant que le document le plus long a raison.
5. Revoir la sélection si le périmètre évolue.

### Adapter à la forme de la page

| Type | Priorité | Adaptations attendues |
| --- | --- | --- |
| Liste de gestion | Retrouver, comparer, agir | Densité, recherche bornée, droits sur lignes et totaux, pagination, détail accessible |
| Fiche | Comprendre une entité | Identité, état, historique utile, actions contextuelles, liens autorisés |
| Formulaire | Saisir sans perdre le travail | Labels, validation, conflit, sauvegarde, annulation et retour |
| Tableau de bord | Décider à partir de données fiables | Période, fraîcheur, définitions des chiffres, périmètre et accès aux sources |
| Paramètres | Comprendre la portée du changement | Valeur effective, conséquence, défaut, droits, dépendances et reprise |
| Document ou lecture | Lire et retrouver | Largeur de lecture, hiérarchie, version, recherche et droits |
| API ou automatisation sans écran | Exécuter une règle fiable | Contrat, permission, idempotence, erreurs, observabilité et reprise |

Ces priorités ne prescrivent pas tous les points. Une page peut combiner des
types ; les [gabarits](design/gabarits.md) décrivent les compositions validées.

### Examiner le choix de chaque élément

Parcourir les éléments du périmètre un par un : champ, bouton, filtre, menu,
badge, tableau, carte, dialogue et retour utilisateur. Ne pas se limiter à leur
couleur ou à leur placement : **est-ce le bon composant pour cette tâche et ces
données ?** Examiner sa nécessité, sa variante, ses interactions, ses états et
ses alternatives. Lors d’une revue complète, faire ce passage sur tous les
éléments ; lors d’une retouche, sur les éléments touchés et leurs dépendances.

Vérifier aussi le **fond** : une colonne affiche-t-elle la valeur attendue, une
date correspond-elle au bon événement, un filtre ou un tri produit-il le bon
résultat, une action fait-elle ce qu’annonce son libellé ? Contrôler les cas
limites et les droits quand ils changent le contenu visible. Le rendu « propre »
ne remplace pas la justesse de la donnée.

Relire les textes : noms clairs, accords, unités, ton uniforme. Un libellé ne
promet pas une action absente, et le même concept garde le même nom d’une page
à l’autre.

Exemple : un nombre peut demander une saisie directe, des boutons −/+, une liste
de valeurs ou une simple lecture selon son sens, sa plage et la fréquence des
ajustements. Des boutons −/+ complètent une saisie utile ; ils ne deviennent pas
une règle universelle. Justifier le choix et contrôler bornes, clavier, tactile,
erreurs et attente avec [les formulaires](references/formulaires-actions.md) et
[l’accessibilité](references/accessibilite.md).

### Examiner les liens entre les points retenus

| Déclencheur | Impacts à reconsidérer |
| --- | --- |
| Champ ajouté | Besoin, données, API, droits de champ, formulaire, listes, historique, export, rétention, sauvegarde |
| Permission modifiée | Routes, ressources, compteurs, recherche, caches, notifications, fichiers, export et révocation en session |
| Mutation | Validation, concurrence, transaction, trace obligatoire et lisible dans le journal d’activité ([Q15](references/audit-historique.md)), retour immédiat, événement durable éventuel |
| Notification | Événement source, destinataires, droits, déduplication, rétention, lien supprimé et canal externe |
| Index, cache, optimisation | Mesure initiale, fraîcheur, isolation des droits, invalidation, coût d’écriture, reprise |
| Suppression ou retrait | Références entrantes, historique, pièces, tâches, routes, droits, exports, sauvegardes et récupération |
| Entité, saison ou statut changé | Relations datées, décisions anciennes, portée des droits, contrats, montants et rapports |
| Composant partagé | Pages consommatrices, accessibilité, variations de données, bundles et tests de contrat |

Pour les points retenus, noter : décision, contrôle, résultat, limite. Suivre
seulement les dépendances réellement déclenchées.

### Selon l’opération

**Ajout** : utilité prouvée, propriétaire, duplication évitée, droits et états
livrés avec la fonction. Une idée future ne devient pas une table ou un menu actif.

**Modification** : consommateurs et données historiques identifiés, compatibilité
explicite, différence avant/après observable, règles et tests pertinents actualisés.

**Suppression** : inventorier le code et les données dépendants ; distinguer
retrait de l’interface, dépréciation d’API, archivage, purge et effacement.
Expliquer la reprise possible ou l’irréversibilité ; conserver la lecture des
traces requises. Mettre à jour la [cartographie du système](systeme/README.md).

### Choisir le retour utilisateur sans automatisme

| Besoin | Solution à examiner |
| --- | --- |
| Résultat déjà clair dans la page, filtre ou sélection | Retour local ; aucun toast supplémentaire par défaut |
| Résultat immédiat d’une commande qui serait ambigu | Message local ou toast accessible |
| Erreur attachée à un champ | Erreur persistante liée au champ |
| Information personnelle utile après cette session | Notification |
| Travail restant à faire | Alerte ou tâche avec responsable et issue |
| Échéance future utile | Rappel lié à la date source |
| Expliquer ultérieurement une action sensible | Audit ; il ne remplace aucun retour utilisateur |

Un événement peut justifier plusieurs supports avec des responsabilités
distinctes. Ne pas multiplier les signaux pour le même destinataire sans raison.
Règle complète : [politique des retours](references/feedback.md).

## 4. Exemples de sélection

| Besoin | Points concernés |
| --- | --- |
| Nouvelle page de lecture statique | Q01, Q33, Q02, Q03, Q36, Q04, Q27 ; le reste est ignoré |
| Liste de gestion avec recherche et filtres | Q01, Q33, Q34, Q02, Q03, Q36, Q04, Q05, Q09, Q17, Q19, Q27 |
| Nouvelle mutation sur une personne | Q01, Q33, Q06, Q07, Q09, Q10, Q11, Q12, Q14, Q15, Q25, Q27 |
| Suppression d’une donnée ou d’un droit | Q16, Q11, Q14, Q29, en plus des points de la fonction concernée |
| Harmoniser une fiche sur le gabarit de référence | Q33, Q34, Q03, Q36, Q04, Q06, Q27 ; contrats métier conservés |
| Retour du propriétaire « je préfère ça » | Q34, Q03, Q36 : appliquer la [boucle des préférences](design/README.md#boucle-des-préférences) |

Ces exemples restent à adapter aux dépendances constatées ; ils ne remplacent
pas le passage de tous les points.

## 5. Où trouver, où écrire

| Information | Dossier |
| --- | --- |
| Règles transversales (points du guide) | [references/](references/) |
| Apparence, composants, comportements, préférences, harmonisation | [design/](design/README.md) |
| Règles métier détaillées : permissions, rôles, navigation, structure | [domaines/](domaines/README.md) |
| Inventaire du code : architecture, routes, API, données, tests, constats | [systeme/](systeme/README.md) |
| État courant de chaque page et section | [pages/](pages/README.md) |
| Preuves datées des campagnes | [audits/](audits/README.md) |
| Feuille de route, besoins futurs, plans et intentions | [propositions/](propositions/README.md) |
| Déploiement, sauvegarde, restauration, secrets | [exploitation/](exploitation/README.md) |
| Méthode, organisation, grille de revue, modèles, contribution | [methode/](methode/organisation-documentaire.md) |

La [répartition documentaire](methode/organisation-documentaire.md) fixe le
document propriétaire de chaque information.

## 6. Conclure et mettre à jour la documentation

Pour un audit ciblé ou complet, suivre [la méthode d’audit](methode/audit.md) :
déclarer le périmètre, l’état examiné, les scénarios et le type de preuve.
Choisir les [contrôles disponibles](systeme/tests.md) selon le risque. Une
liste de questions cochées sans observation n’est pas une validation.

Pour chaque point examiné, utiliser l’un des résultats suivants :

- **Validé** : contrôle réellement exécuté, environnement et portée indiqués.
- **Corrigé et vérifié** : défaut traité, nouveau comportement contrôlé.
- **Examiné dans le code** : constat sans validation du parcours réel.
- **À vérifier** : contrôle manquant, avec raison et prochaine étape.
- **À corriger** : défaut identifié, impact et action nécessaire.

Séparer **implémenté**, **vérifié dans un périmètre donné** et **livré**. Une
réussite avec API simulée ne valide pas les permissions ni la vitesse d’une base
réelle. Une capture ne valide pas focus, clavier, défilement ou concurrence.
Un test ancien reste un constat daté ; le citer sans le présenter comme rejoué.

Avant de conclure :

- Le résultat répond-il au besoin, y compris pour l’action principale ?
- Les contrôles nécessaires au risque ont-ils été exécutés ?
- Le changement introduit-il un défaut important, une fuite ou une perte possible ?
- La décision, ses limites et les points ouverts sont-ils compréhensibles ?
- Les outils et fichiers temporaires devenus inutiles ont-ils été nettoyés ?

Une anomalie importante non résolue empêche de déclarer le changement prêt ;
elle n’empêche pas de préparer les corrections indépendantes. Ne pas inventer
une approbation supplémentaire pour une action déjà autorisée.

Puis, dans le même travail :

1. **Fiche de page** : composition, décisions, points ouverts, historique ;
   retirer « Suivi à compléter » quand le relevé est fait. Créer la fiche d’une
   nouvelle page à partir du [modèle](methode/modeles/suivi-page.md).
2. **Préférences** : consigner tout retour visuel du propriétaire dans le
   [journal](design/preferences.md) et le fichier de design propriétaire.
3. **Harmonisation** : mettre à jour l’[état de la page](design/harmonisation.md#état-par-page)
   et les constats `HARMO-xx` touchés.
4. **Règle commune ou métier** : mettre à jour sa fiche ou son domaine.
5. **Inventaire système** : route, API, modèle, script ou famille de tests ajouté
   ou retiré → fichier concerné de [systeme](systeme/README.md).
6. **Audit** : un contrôle approfondi produit un rapport daté indexé dans
   [audits](audits/README.md), avec le [modèle](methode/modeles/rapport-audit.md).
7. Lancer `bun run docs:check` (et `bun run docs:check:test` si le contrôleur change).

Un point suivi conserve son identifiant, son attendu/observé, sa preuve, son
impact, son état, son responsable désigné ou « à attribuer » et son déclencheur
de reprise. Un correctif sans preuve reste « corrigé à vérifier ». Maintenir une
synthèse courante et un bref historique ; ne pas accumuler un audit complet à
chaque changement. Reprendre un contrôle clos seulement si un changement, une
régression, un volume ou une règle nouvelle le justifie.

## Entretenir ce guide

- Un nouveau sujet transversal reçoit une fiche dans `references/`, un
  identifiant à la suite (Q37…) et une ligne dans la famille adaptée. Une
  particularité métier reste dans son domaine. Les identifiants restent stables.
- Avant d’ajouter une fiche : le sujet a-t-il un déclencheur distinct et des
  questions qui ne sont pas déjà couvertes ? Sinon, améliorer la fiche existante.
- Le contrôle documentaire vérifie que chaque document de `references/` est
  relié depuis ce guide et que les [fiches de pages](pages/README.md) sont accessibles.
- Pour un travail conséquent, le [modèle de création ou évolution](methode/modeles/creation-evolution.md)
  aide à consigner la sélection ; il n’est pas exigé pour une petite intervention.

Création : 26 septembre 2026 (revue générale). Réorganisation en parcours et
familles : 19 octobre 2026.
