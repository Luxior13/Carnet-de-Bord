# Règles métier par domaine

[Guide général](../REFERENCE_GENERALE.md) · [Index de la documentation](../README.md)

Références détaillées des règles métier. Chacune est le document propriétaire
de son domaine : les fiches de page y renvoient au lieu de recopier les règles.
Ne les ouvrir que si le travail touche le domaine ; le
[guide général](../REFERENCE_GENERALE.md) indique quand.

| Domaine | Document | Contenu |
| --- | --- | --- |
| Permissions | [permissions.md](permissions.md) | Modèle actif : vocabulaire, presets USER/ADMIN et compte racine, droits par page, dépendances, MFA et preuves récentes, cycle `planned` → actif ; source exécutable `permissions.constants.ts` |
| Rôles métier | [roles-metier.md](roles-metier.md) | Cible : séparer fonctions métier et administration technique, décisions par ressource, ouverture progressive ; pas une protection livrée |
| Navigation | [navigation.md](navigation.md) | Navigation actuelle, huit pôles cibles, règles de placement, admission, routes et alias |
| Structure juridique | [structure-juridique.md](structure-juridique.md) | Association puis société : entités, relations datées, saisons, exercices, objets financiers, gouvernance |

Les règles transversales (formulaires, sécurité, données…) sont dans les
[fiches](../REFERENCE_GENERALE.md#2-points-à-examiner) ; l’exploitation dans
[exploitation](../exploitation/README.md) ; le périmètre produit dans la
[feuille de route](../propositions/feuille-de-route.md).

## Contexte métier

Outil de gestion de Noctambule : structure esport actuellement associative,
préparée à évoluer vers une société. Séparer personnes, comptes, relations
datées, équipes, entités juridiques, saisons et exercices. Ne pas réécrire les
anciens engagements lors d’une évolution de structure. Commencer par les
besoins réels de l’association ; préparer la société consiste surtout à
préserver les frontières et l’histoire.

## Entretien

- Mettre à jour le document du domaine dans le même travail qu’un changement
  de règle métier ; citer la date et, si utile, la décision du propriétaire.
- Distinguer **règle en vigueur**, **comportement constaté** et **cible future**.
- Une revue datée d’un domaine va dans [audits](../audits/README.md) ; ce
  document garde la règle courante.
- Une règle juridique, fiscale, contractuelle ou de compétition consigne sa
  source officielle, sa date, sa juridiction et qui a qualifié son application.
