# Préparer, exécuter et suivre un audit

Un audit répond à une question sur un périmètre identifié et un état daté. Il ne
certifie pas tout le site pour les changements à venir. Commencer par la
[revue générale](REVUE_GENERALE.md) et le suivi courant de la page ; ce guide
complète la méthode lorsqu’un audit est demandé ou que le risque le justifie.

## Choisir la profondeur

| Travail | Couverture attendue | Trace utile |
| --- | --- | --- |
| Retouche simple | Élément touché, compréhension, état voisin, absence de régression directe | Note dans le suivi existant |
| Audit ciblé | Question explicite, parcours touchés et consommateurs indirects | Section du suivi ou rapport si les preuves sont nombreuses |
| Audit complet d’une page | Actions et éléments de la page, états, rôles, données, responsive et dépendances applicables | Rapport daté et synthèse dans le suivi |
| Audit transverse | Contrat partagé et pages consommatrices identifiées ; échantillonnage justifié | Rapport daté et liens depuis les suivis concernés |

« Complet » décrit le périmètre examiné, pas un résultat automatiquement favorable.
Un audit d’apparence ne valide pas les droits serveur. Un audit complet demandé
reste incomplet si un parcours essentiel n’a pas pu être exécuté.

## Fixer le point de départ

Noter la demande, le comportement attendu et la décision qui le fonde. Identifier
routes, API, composants, données, droits et consommateurs touchés. Préciser :

- date, branche et commit quand disponibles ; présence de changements locaux ;
- environnement, versions utiles, mode développement ou build de production ;
- origine des données : simulées, base de test isolée, ou environnement réel ;
- rôles, volumes et tailles d’écran effectivement exercés ;
- exclusions et accès manquants, avec leur effet sur la conclusion.

Ne pas inscrire de mot de passe, cookie, jeton, URL contenant un secret ou donnée
personnelle dans le rapport. Une capture conservée doit être utile et expurgée.

## Construire les scénarios

Pour chaque action importante : départ → saisie/choix → requête → résultat visible
→ état persistant → retour ou reprise. Comparer attendu et observé. Examiner aussi
les éléments passifs : total, compteur, statut, date, provenance, texte et lien.

Choisir les variations utiles : utilisateur autorisé ou refusé, données absentes,
volume élevé, valeur limite, réponse lente, échec, double soumission, conflit,
session expirée, ressource supprimée et retour arrière. Un composant partagé demande
une vérification de ses consommateurs pertinents, pas seulement de sa démonstration.
Utiliser les fiches sélectionnées pour les détails ; ne pas recopier les 30 fiches.

## Distinguer les preuves

| Preuve | Ce qu’elle établit | Limite à écrire |
| --- | --- | --- |
| Lecture du code | Contrat apparent, garde, dépendance, risque localisé | Aucun parcours réel exécuté |
| Test unitaire / API simulée | Comportement dans les hypothèses du test | Base, session et réseau réels non démontrés |
| Intégration sur base isolée | Contraintes, transactions et requêtes exercées | Jeu de données, concurrence et volume limités |
| Navigateur avec serveur réel | Parcours et affichage observés dans les conditions citées | Autres rôles, appareils et charges non couverts |
| Mesure de performance | Mesure reproductible sur une configuration donnée | Distinguer build, charge à froid, cache et environnement |

Noter la commande ou le scénario, la date, le résultat et la limite. « Non exécuté »,
« ignoré », « échoué » et « réussi » sont distincts. Un résultat récupéré du cache
ou d’un ancien audit ne devient pas un nouvel essai. Un échec de banc de test doit
être qualifié ; il ne prouve ni une panne produit ni une réussite du produit.

## Qualifier les constats

Séparer **défaut** (règle attendue violée), **dette** (fragilité identifiée) et
**suggestion** (amélioration à discuter). La préférence esthétique seule ne rend
pas un constat bloquant.

| Priorité | Critère à justifier par le scénario |
| --- | --- |
| P0 | Accès indu, perte/corruption de données ou indisponibilité critique avérée |
| P1 | Parcours essentiel incorrect ou inaccessible, fiabilité ou confidentialité fortement dégradée |
| P2 | Défaut circonscrit, dette ou amélioration dont l’impact permet une planification |

La priorité dépend de l’impact, de l’exposition et des possibilités de reprise ;
elle ne se déduit pas du nombre de lignes touchées. Une incertitude grave demande
une vérification prioritaire, sans être présentée comme un incident confirmé.

Chaque point suivi a un identifiant stable dans son document propriétaire, un
scénario reproductible, l’attendu/l’observé, une preuve, un impact, une prochaine
action et un responsable réel quand désigné. À défaut, écrire « à attribuer ».
Une date de relance ou un déclencheur explicite suffit ; ne pas inventer d’échéance.

États : **ouvert → en cours → corrigé à vérifier → clos après vérification**.
« Différé » précise pourquoi et quand reprendre. Une limite acceptée mentionne la
décision et son auteur réel ; elle ne signifie pas que le défaut a disparu.

## Conclure et maintenir

Le verdict décrit séparément ce qui est livré, ce qui a été vérifié et ce qui reste
ouvert. Choisir « conforme sur le périmètre vérifié », « corrections nécessaires »
ou « conclusion partielle », avec les conditions concrètes. Ne pas déclarer une
page entièrement validée si un contrôle essentiel manque ou un défaut majeur reste.

Le [rapport daté](modeles/audit.md) conserve les constats et preuves de cette passe.
Le [suivi courant](pages/README.md) porte les décisions applicables et les points
encore ouverts, avec un lien vers le rapport. La règle transverse corrigée va dans
sa référence propriétaire. Ne pas entretenir trois listes divergentes des défauts.

Rouvrir seulement les contrôles touchés par une correction, puis élargir si une
régression ou une nouvelle dépendance le justifie. Une modification de permission,
schéma, contrat partagé, fournisseur ou volume peut invalider une ancienne preuve.
Un incident rouvre les scénarios concernés. Les revues périodiques ont une raison,
un responsable et une fréquence adaptée ; aucune tâche planifiée n’est créée par
la seule existence de ce guide.

Rapports : [index des audits](../audits/README.md). Vérifications disponibles :
[guide des contrôles](CONTROLES.md).
