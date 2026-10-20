# Principes de design

[Système de design](README.md) · [Fondations](fondations.md) · [Préférences](preferences.md)

## Intention

L’application possède **un seul langage visuel**, celui d’un outil de gestion
privé : dense, calme, lisible. Il se décline selon la tâche de chaque page, pas
selon ses envies : listes de gestion, fiches à sections, formulaires de
création, réglages, pages de lecture, accueil personnel et écrans hors cadre
(connexion, erreurs). Tous partagent couleurs, badges, états, contrôles,
rayons, interactions et règles d’accessibilité ; seules la densité et la
composition changent.

**En une phrase : une page se lit comme une surface calme, organisée et dense,
où la couleur indique une action, un état ou une identité, jamais un décor.**

## Partir des tâches

Exigence du propriétaire : les pages existantes doivent être au niveau avant
d’en construire de nouvelles, et une reprise peut aller jusqu’à la réécriture
complète d’une page plutôt qu’un empilement de retouches. Une refonte repart
donc des tâches de l’utilisateur, comme si la page était à concevoir ;
l’organisation existante est réexaminée, pas reconduite automatiquement.

1. Définir ce qui doit être compris, retrouvé ou effectué en premier.
2. Choisir ensuite la composition, l’ordre, la densité et les interactions.
3. Comparer ordinateur, largeur intermédiaire et mobile, puis les états vides,
   chargements et fenêtres.
4. Appliquer couleurs, contours et arrondis. Leur harmonisation seule ne
   constitue pas une refonte.

Conserver les contrats métier, droits et protections utiles. Réutiliser les
composants communs sans imposer la structure d’une autre page. La
[grille de questions](../methode/questions-revue-page.md) met cette démarche en
pratique.

## Socle visuel

- **Sombre par défaut**, avec des surfaces qui montent progressivement au lieu
  de s'éclaircir brutalement.
- **Une hiérarchie par la surface et l'espacement**, pas par des couleurs
  criardes.
- **Des états explicites** : survol, focus, désactivé, erreur, chargement,
  vide, refus. Aucun composant sans ses états.
- **Des couleurs et dimensions communes centralisées.** Les couleurs vivent
  dans `globals.css`. Les tailles utilisent l'échelle Tailwind ou les variables
  communes ; les calculs de viewport, les dimensions Radix et les grilles métier
  peuvent utiliser une valeur arbitraire justifiée.
- **Une densité de gestion**, pas de marketing : titres sobres, tableaux
  compacts, actions proches de leur contexte.

## Règles fondatrices

1. **Deux niveaux de surface au maximum.** La page, puis une surface
   principale (section, liste, fenêtre). Une ligne, un contrôle, une carte de
   réglage ou une tuile interne est autorisé ; une carte dans une carte dans une
   section ne l’est pas.
2. **La couleur sert une fonction.** L’accent marque l’interaction, les badges
   portent le sens, les couleurs de pôle et d’accès identifient un espace ou un
   niveau de droit.
3. **Les effets sont rares.** Bordures et fonds suffisent ; les ombres restent
   très douces et ne s’affirment que pour les éléments flottants (menus,
   popovers, infobulles, barre collante).
4. **La lisibilité gagne sur la décoration.** Pas de halo gratuit, pas de
   dégradé hors bandeau d’identité, pas d’agrandissement des lignes.
5. **Un composant partagé vaut mieux qu’une variante locale.** Une variante
   n’existe que si elle est décrite dans [Composants](composants.md) ou dans la
   fiche de la page avec sa raison.
6. **Les zones modifiables se repèrent au repos.** Une interface sobre ne rend
   pas un champ difficile à distinguer du texte de lecture.
7. **Une page n’a qu’un bandeau.** L’action globale vit dans le bandeau,
   l’action locale dans sa section, le retour contextuel ramène à la liste avec
   ses critères.

```text
Page
└─ Surface principale (section, liste, fenêtre)
   └─ Ligne, contrôle, badge, carte de réglage ou tuile interne
```

Tout niveau supplémentaire est supprimé, fusionné ou remplacé par un
séparateur, un sous-titre et un espacement.

## Adapter par page, jamais au hasard

Règle de méthode reprise le 19 octobre 2026 de l’organisation du site
Noctambule, du même propriétaire : la cohérence d’abord, les exceptions ensuite.

1. Réutiliser au maximum la même police, les mêmes composants et les mêmes
   valeurs : c’est la **variante par défaut** des
   [variantes autorisées](fondations.md#variantes-autorisées).
2. S’en écarter seulement quand le **rôle** d’un élément le demande (filtre
   dense, code MFA, identifiant technique…), avec une exception déjà admise.
3. Si aucune exception admise ne convient, la proposer avec sa raison ; elle
   n’est utilisée qu’une fois ajoutée à la liste.
4. La fiche de la page note chaque exception utilisée.

Deux éléments de même rôle reçoivent la même variante, sur toutes les pages.

## Couleur

- L’accent `primary` sert à **interagir** : action principale, section active,
  sélection, focus des champs ; `primary-emphasis` pour les liens et accents
  textuels.
- Les états ont leur ton : succès, information, attention, danger
  ([tokens](fondations.md#palette)). Un ton d’état ne décore jamais.
- Les tons d’accès (`access-privileged`, `access-admin`, `access-member`) et les
  couleurs de pôle (`nav-*`) identifient un niveau de droit ou un espace ; ils
  ne peignent jamais une ligne entière ou une page.
- Une surface n’a qu’un accent dominant.
- Un statut n’est jamais porté par la couleur seule : badge, point, icône ou
  texte l’accompagnent.
- Une autorisation refusée n’impose pas un fond rouge à toute sa ligne ; la
  couleur signale le choix, le risque ou un prérequis manquant.

## Anti-patterns

1. Carte dans une carte dans une section.
2. Trois fonds différents dans une même zone.
3. Accent bleu sur tous les éléments.
4. Halo, glow ou dégradé décoratif hors bandeau d’identité.
5. Ombre marquée sur une ligne de tableau ou un bouton ordinaire.
6. Plus de deux rayons différents dans une même zone.
7. Badge sans sens, ou badge qui répète le titre ou l’état déjà exprimé par la commande.
8. Deux boutons primaires dans la même zone.
9. Chargement qui change complètement la structure de la page.
10. Texte sous 10 px pour gagner de la place.
11. Survol qui déplace la ligne ou la carte.
12. Information de contexte répétée dans le bandeau, la synthèse et la section.
13. Couleur hexadécimale écrite dans un composant au lieu d’un token.
14. Bandeau, barre de sections ou barre d’enregistrement recopiés localement.
15. Contrôle HTML natif hors de `components/ui` (vérifié par `shadcn-boundaries.test.ts`).
16. Autocomplétion de navigateur ou de gestionnaire de mots de passe réactivée.
17. `alert()`, `confirm()` ou `prompt()` natifs.
