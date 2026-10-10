# Revue générale d’une page ou d’un changement

Lire [AGENTS.md](../../AGENTS.md) avant ce guide. Utiliser cette revue pour un
ajout, une modification, une correction, une optimisation et une suppression.
Elle s’applique au parcours complet : écran, API, données et effets indirects.

## Règle de lecture

Ne lire que les fiches utiles au besoin **et à ses effets indirects**. Un sujet
absent est ignoré : aucune lecture de sa fiche, aucun ajout de permission, de
notification, de cache ou de test pour remplir une grille. Quand plusieurs
fiches semblent s'appliquer, suivre les dépendances réellement déclenchées ;
une recherche ciblée des imports et appels suffit souvent.

## 1. Définir le changement

Répondre brièvement :

- Quel problème réel, quelle personne utilisatrice et quelle fréquence d’usage ?
- Quelle page ou quel module est propriétaire ? Quels autres écrans le consomment ?
- Que change-t-on exactement, et qu’est-ce qui permet de conclure que cela aide ?
- Quel est l’état actuel constaté, la décision demandée et la cible future ?
- Peut-on réutiliser l’existant, simplifier ou ne pas ajouter cette fonction ?
- Quels volumes, droits, données historiques et personnes seront affectés ?
- Que devient le changement en cas d’erreur, annulation, concurrence ou départ d’un responsable ?

Lire le suivi existant et les références canoniques utiles. Une amélioration locale
ne doit pas déclencher une refonte générale sans besoin. Un composant partagé
impose en revanche d’identifier les autres consommateurs réellement affectés.

Pour une interface, le [design system](../references/DESIGN_SYSTEM.md) définit
le socle visuel du [Répertoire](pages/membres-repertoire.md), avec Utilisateurs
en complément. Choisir les compositions adaptées au type de page et noter les
écarts justifiés ; la référence de liste n'impose ni ses colonnes ni ses règles métier.

## 2. Choisir la profondeur

| Niveau | Exemples | Travail attendu |
| --- | --- | --- |
| Léger | Texte, espacement local, documentation | Sélection rapide de tous les sujets, lecture des fiches touchées, vérification ciblée ; pas de nouveau test artificiel |
| Fonctionnel | Parcours, formulaire, filtre, champ ou règle métier | Cas normaux et limites, droits, erreurs, impacts serveur/données, tests pertinents |
| Sensible | Accès, argent, suppression, migration, secrets, partage externe | Scénarios d’abus et de panne, intégrité, reprise, confidentialité et validation représentative avant déploiement concerné |

Retenir le risque le plus élevé réellement affecté. Aucun score moyen ne compense
une fuite de données ou un risque de perte financière.

## 3. Passer chaque sujet, ouvrir seulement les fiches utiles

Classer **toutes les lignes**. Pour une petite retouche, les sujets hors impact
peuvent être regroupés avec une raison commune ; inutile d’écrire trente paragraphes.

- **À examiner** : déclencheur présent ; lire la fiche et choisir les contrôles utiles.
- **Non applicable** : capacité absente et non nécessaire dans ce périmètre.
- **Hors impact** : capacité présente, mais inchangée et sans effet indirect identifié.
- **À clarifier** : information manquante ; l’ignorance ne vaut pas non-applicabilité.

« Non applicable » et « hors impact » doivent avoir une raison courte. Réviser le
classement si l’implémentation révèle une dépendance ou élargit le périmètre.

| ID | Sujet et fiche détaillée | Question de sélection |
| --- | --- | --- |
| Q01 | [Besoin, périmètre et règles métier](fiches/cadrage-metier.md) | À chaque changement : quel problème résout-on, pour qui et avec quel résultat observable ? |
| Q02 | [Parcours, navigation et contenu](fiches/parcours-navigation.md) | Une page, un lien, une action, un état ou un libellé change-t-il ? |
| Q03 | [Composition, couleurs et composants](fiches/interface-visuelle.md) | Pour chaque élément, le composant choisi sert-il le besoin ? Son rendu, sa densité, sa hiérarchie ou un état visuel change-t-il ? |
| Q04 | [Accessibilité et adaptation](fiches/accessibilite.md) | Une interaction, un contenu ou une présentation est-il ajouté ou modifié ? |
| Q05 | [Listes, recherche, filtres et pagination](fiches/listes-recherche.md) | Y a-t-il une collection, une synthèse, une recherche ou des résultats volumineux ? |
| Q06 | [Formulaires, actions et validations](fiches/formulaires-actions.md) | L’utilisateur saisit-il, décide-t-il, publie-t-il ou déclenche-t-il une mutation ? |
| Q07 | [Toasts et retours immédiats](fiches/toasts-feedback.md) | Faut-il expliquer le résultat d’une action ou un échec ? Un retour local suffit-il ? |
| Q08 | [Notifications, alertes et rappels](fiches/notifications.md) | Un destinataire doit-il être informé plus tard, agir ou respecter une échéance ? |
| Q09 | [Permissions et périmètres d’accès](fiches/permissions.md) | Une donnée, une route, une action ou une portée d’accès est-elle exposée ou modifiée ? |
| Q10 | [Sécurité et scénarios d’abus](fiches/securite.md) | Une entrée, une session, une donnée sensible ou une frontière de confiance est-elle touchée ? |
| Q11 | [Confidentialité, finalités et conservation](fiches/confidentialite.md) | Traite-t-on des personnes, coordonnées, mineurs, dossiers confidentiels ou données transmises à un tiers ? |
| Q12 | [Modèle de données et schéma Prisma](fiches/schema-prisma.md) | Le stockage, une relation, une contrainte, un index ou le sens d’une donnée change-t-il ? |
| Q13 | [Migrations et compatibilité](fiches/migrations.md) | Des données ou installations existantes doivent-elles changer de format ou de comportement ? |
| Q14 | [API, intégrité et concurrence](fiches/api-concurrence.md) | Une lecture serveur, une mutation, un import ou une commande peut-elle être rejouée ou concurrencée ? |
| Q15 | [Audit et historique métier](fiches/audit-historique.md) | Faut-il pouvoir expliquer qui a fait quoi, quand, sur quel objet et avec quel résultat ? |
| Q16 | [Suppression, archivage et retrait](fiches/suppression-archivage.md) | Retire-t-on une donnée, un champ, une route, un droit, une intégration ou un module ? |
| Q17 | [Performance et capacité](fiches/performance.md) | Le coût de chargement, calcul, requête, rendu ou stockage peut-il changer avec le volume ? |
| Q18 | [Optimisation et caches](fiches/optimisation.md) | Existe-t-il un problème mesuré ou une complexité évitable justifiant une optimisation ? |
| Q19 | [Architecture et maintenabilité](fiches/architecture.md) | Ajoute-t-on une responsabilité, une abstraction, un composant partagé ou une dépendance entre modules ? |
| Q20 | [Documents et fichiers](fiches/documents-fichiers.md) | Une pièce, image, VOD, justificatif, document émis ou version signée est-il manipulé ? |
| Q21 | [Imports et exports](fiches/imports-exports.md) | Les données entrent-elles ou sortent-elles en masse, sous forme de fichier ou de synchronisation ? |
| Q22 | [Dates, périodes et localisation](fiches/temps-localisation.md) | Une date, saison, échéance, récurrence, devise, unité ou comparaison temporelle intervient-elle ? |
| Q23 | [Automatisations et intégrations](fiches/automatisations-integrations.md) | Un traitement différé, webhook, prestataire, canal externe ou outil d’IA intervient-il ? |
| Q24 | [Structure juridique et gouvernance](fiches/structure-gouvernance.md) | Le changement concerne-t-il une entité, un mandat, une décision, une responsabilité ou un transfert ? |
| Q25 | [Personnes, équipes et vie esport](fiches/esport-personnes.md) | Des membres, joueurs, coachs, équipes, compétitions, matériels ou dossiers sensibles sont-ils concernés ? |
| Q26 | [Finances, contrats et partenaires](fiches/finance-contrats.md) | Y a-t-il un montant, un engagement, une facture, un paiement, une dotation ou un livrable partenaire ? |
| Q27 | [Tests et validation](fiches/tests-validation.md) | Toujours : quelle vérification proportionnée démontre le résultat et ses limites ? |
| Q28 | [Exploitation, observation et incidents](fiches/exploitation.md) | Le déploiement, la configuration, les erreurs, la supervision ou la continuité peuvent-ils changer ? |
| Q29 | [Sauvegarde, restauration et réversibilité](fiches/sauvegarde-restauration.md) | Une donnée persistante, un fichier, une clé, une purge ou le format de sauvegarde change-t-il ? |
| Q30 | [Dépendances, configuration et documentation](fiches/dependances-configuration.md) | Une bibliothèque, une version, un secret, un réglage ou une règle documentaire change-t-il ? |

Une capacité transversale reste pertinente même sans bouton visible : les totaux,
notifications, exports, pièces, caches et liens directs peuvent révéler une donnée.
Une page privée conserve un contrôle serveur ; « pas de nouvelle permission »
ne signifie jamais « pas de contrôle d’accès ».

### Exemples de sélection

| Besoin | Fiches à examiner en priorité |
| --- | --- |
| Nouvelle page de lecture statique | Q01, Q02, Q03, Q04, Q27 ; le reste est ignoré. |
| Liste de gestion avec recherche et filtres | Q01, Q02, Q03, Q04, Q05, Q09, Q17, Q19, Q27. |
| Nouvelle mutation sur une personne | Q01, Q06, Q07, Q09, Q10, Q11, Q12, Q14, Q15, Q25, Q27. |
| Suppression d'une donnée ou d'un droit | Q16, Q11, Q14, Q29, en plus des fiches de la fonction concernée. |

Ces exemples restent à adapter aux dépendances constatées ; ils ne remplacent pas
le passage de la table Q01–Q30.

## 4. Adapter à la forme de la page

| Type | Priorité | Adaptations attendues |
| --- | --- | --- |
| Liste de gestion | Retrouver, comparer, agir | Densité, recherche bornée, droits sur lignes/totaux, pagination, détail accessible |
| Fiche | Comprendre une entité | Identité, état, historique utile, actions contextuelles, liens autorisés |
| Formulaire | Saisir sans perdre le travail | Labels, validation, conflit, sauvegarde, annulation et retour |
| Tableau de bord | Décider à partir de données fiables | Période, fraîcheur, définitions des chiffres, périmètre et accès aux sources |
| Paramètres | Comprendre la portée du changement | Valeur effective, conséquence, défaut, droits, dépendances et reprise |
| Document/lecture | Lire et retrouver | Largeur de lecture, hiérarchie, version, recherche et droits |
| API/automatisation sans écran | Exécuter une règle fiable | Contrat, permission, idempotence, erreurs, observabilité et reprise |

Ces priorités ne prescrivent pas toutes les fiches. Une page peut combiner des types.

### Examiner aussi le choix de chaque élément

Parcourir les éléments du périmètre un par un : champ, bouton, filtre, menu,
badge, tableau, carte, dialogue et retour utilisateur. Ne pas se limiter à leur
couleur ou à leur placement : **est-ce le bon composant pour cette tâche et ces
données ?** Examiner sa nécessité, sa variante, ses interactions, ses états et
ses alternatives. Lors d'une revue complète de page, faire ce passage sur tous
ses éléments ; lors d'une retouche, sur les éléments touchés et leurs dépendances.

Vérifier aussi le **fond** de chaque élément : une colonne affiche-t-elle bien la
valeur attendue, une date correspond-elle au bon événement, un filtre ou un tri
produit-il le bon résultat, et une action fait-elle bien ce qu'annonce son
libellé ? Contrôler les cas limites et les droits quand ils changent le contenu
visible. Le rendu « propre » ne remplace pas la justesse de la donnée.

Relire les textes et libellés : sont-ils logiques et cohérents avec la page
(noms clairs, accords, unités, ton uniforme) ? Un libellé ne doit pas promettre
une action absente, et le même concept doit garder le même nom d'une page à
l'autre.

Exemple : un nombre peut demander une saisie directe, des boutons −/+, une liste
de valeurs ou une simple lecture selon son sens, sa plage et la fréquence des
ajustements. Des boutons −/+ complètent une saisie utile ; ils ne deviennent pas
une règle universelle pour les durées, montants ou identifiants. Justifier le
choix et contrôler bornes, clavier, tactile, erreurs et attente avec
[les formulaires](fiches/formulaires-actions.md) et
[l'accessibilité](fiches/accessibilite.md).

## 5. Examiner les liens entre les sujets sélectionnés

| Déclencheur | Impacts à reconsidérer |
| --- | --- |
| Champ ajouté | Besoin, données, API, droits de champ, formulaire, listes, historique, export, rétention, sauvegarde |
| Permission modifiée | Routes, ressources, compteurs, recherche, caches, notifications, fichiers, export et révocation en session |
| Mutation | Validation, concurrence, transaction, audit nécessaire, retour immédiat, événement durable éventuel |
| Notification | Événement source, destinataires, droits, déduplication, rétention, lien supprimé et canal externe |
| Index/cache/optimisation | Mesure initiale, fraîcheur, isolation des droits, invalidation, coût d’écriture, reprise |
| Suppression/retrait | Références entrantes, historique, pièces, jobs, routes, droits, exports, sauvegardes et récupération |
| Entité/saison/statut changé | Relations datées, décisions anciennes, portée des droits, contrats, montants et rapports |
| Composant partagé | Pages consommatrices, accessibilité, variations de données, bundles et tests de contrat |

Pour les fiches retenues, noter : décision, contrôle, résultat, limite. Ne pas ouvrir
tous les liens de toutes les fiches ; suivre seulement les dépendances déclenchées.

## 6. Examiner selon l’opération

**Ajout** : utilité prouvée, propriétaire, duplication évitée, droits et états livrés
avec la fonction. Une idée future ne devient pas une table ou un menu actif.

**Modification** : consommateurs et données historiques identifiés, compatibilité
explicite, différence avant/après observable, règles et tests pertinents actualisés.

**Suppression** : inventorier le code et les données dépendants ; distinguer retrait
de l’interface, dépréciation d’API, archivage, purge et effacement. Expliquer la reprise
possible ou l’irréversibilité ; conserver la lecture des traces requises.

## 7. Choisir le retour utilisateur sans automatisme

| Besoin | Solution à examiner |
| --- | --- |
| Résultat déjà clair dans la page, filtre ou sélection | Retour local ; aucun toast supplémentaire par défaut |
| Résultat immédiat d’une commande qui serait ambigu | Message local ou toast accessible |
| Erreur attachée à un champ | Erreur persistante liée au champ |
| Information personnelle utile après cette session | Notification |
| Travail restant à faire | Alerte/tâche avec responsable et issue |
| Échéance future utile | Rappel lié à la date source |
| Expliquer ultérieurement une action sensible | Audit ; il ne remplace aucun retour utilisateur |

Un événement peut justifier plusieurs supports avec des responsabilités distinctes.
Ne pas multiplier les signaux pour le même destinataire sans raison.

## 8. Terminer avec des conclusions vérifiables

Pour un audit ciblé ou complet, suivre [la méthode d’audit](AUDITS.md) : déclarer
le périmètre, l’état examiné, les scénarios et le type de preuve. Choisir les
[contrôles disponibles](CONTROLES.md) selon le risque. Une liste de questions
cochées sans observation n’est pas une validation.

Pour chaque sujet examiné, utiliser l’un des résultats suivants :

- **Validé** : contrôle réellement exécuté, environnement et portée indiqués.
- **Corrigé et vérifié** : défaut traité, nouveau comportement contrôlé.
- **Examiné dans le code** : constat sans validation du parcours réel.
- **À vérifier** : contrôle manquant, avec raison et prochaine étape.
- **À corriger** : défaut identifié, impact et action nécessaire.

Une réussite avec API simulée ne valide pas les permissions ni la vitesse d’une base
réelle. Une capture ne valide pas focus, clavier, défilement ou concurrence.
Un test ancien reste un constat daté ; le citer sans le présenter comme rejoué.

Avant de conclure :

- Le résultat répond-il au besoin, y compris pour l’action principale ?
- Les contrôles nécessaires au risque ont-ils été exécutés ?
- Le changement introduit-il un défaut important, une fuite ou une perte possible ?
- La décision, ses limites et les points ouverts sont-ils compréhensibles ?
- Les références et le suivi existant reflètent-ils le changement ?
- Les outils et fichiers temporaires devenus inutiles ont-ils été nettoyés ?

Une anomalie importante non résolue empêche de déclarer le changement prêt pour le
déploiement concerné ; elle n’empêche pas de préparer les corrections indépendantes.
Ne pas inventer une approbation supplémentaire pour une action déjà autorisée.

## 9. Laisser une trace proportionnée

Pour une petite modification : quelques lignes dans le compte rendu ou la revue
existante. Pour une page suivie : utiliser le [modèle de revue](modeles/revue-page.md).
Pour une décision transverse difficile à inverser : le
[modèle de décision](modeles/decision.md).

Ne pas accumuler un audit complet à chaque changement. Maintenir une synthèse
courante, un bref historique utile et un tableau des points ouverts avec déclencheur
de réexamen. Une fiche est un outil de décision, pas un certificat de perfection.

Une conclusion sépare le périmètre livré, les contrôles réellement réussis et les
défauts encore ouverts. Pour un défaut suivi : identifiant, attendu/observé, preuve,
impact, action, responsable désigné ou à attribuer et déclencheur de reprise.
Un correctif reste « corrigé à vérifier » tant que sa preuve manque.

Quand un rapport distinct est utile, utiliser le [modèle d’audit](modeles/audit.md)
et l’ajouter à [l’index](../audits/README.md). Ne pas recopier tout le rapport dans
le suivi de page : y maintenir la synthèse actuelle et le lien vers la preuve.
