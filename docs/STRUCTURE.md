# Structure et forme juridique — conception de référence

Le site est aujourd'hui celui d'une association. Une évolution vers une société
est possible plus tard. Ce document prépare cette transition sans construire
les deux mondes en parallèle.

Le principe tient en une phrase : **une seule base de code, une différence
configurée au lieu d'être codée.**

---

## 1. Le profil de structure

La structure est décrite une seule fois, dans les paramètres, et ce profil est
la source de vérité pour les libellés, les champs obligatoires et les règles.

Le profil contient au minimum :

- la **forme juridique** : association ou société ;
- le **régime fiscal** : TVA, franchise, ou non concerné ;
- la **saison courante** (cycle sportif) ;
- l'**exercice comptable courant** ;
- les **identifiants** : RNA pour une association, SIREN/SIRET pour une
  société ;
- les **assurances** : responsabilité civile, local, matériel ;
- l'**affiliation** : fédération et numéros de licence ;
- les **durées de conservation** des documents légaux et comptables.

Ces valeurs sont lues au moment de l'affichage. Aucun module ne doit recopier
un libellé ou une règle qui dépend de la forme juridique.

---

## 2. Le vocabulaire est dérivé, jamais figé

Le code nomme les concepts de façon neutre : `Person`, `PartnerOrganization`,
`FinancialOperation`, `Document`. L'interface choisit le mot selon le profil.

| Concept neutre | Association | Société |
| --- | --- | --- |
| Personne liée | Adhérent | Client ou associé |
| Contribution périodique | Cotisation | Redevance ou facture |
| Argent reçu sans contrepartie | Don ou subvention | Mécénat ou subvention |
| Instance qui décide | Assemblée générale | Décisions des associés |
| Pièce fiscale | Reçu fiscal | Facture |
| Responsable | Membre du bureau | Dirigeant |

La règle d'écriture : ne jamais stocker « adhérent » ou « client » dans une
table ou une permission. Stocker un statut, et dériver le mot.

---

## 3. La finance se modélise en natures, pas en tables

Toutes les opérations vivent dans une seule entité `FinancialOperation` :

- une **nature** : recette ou dépense ;
- une **source** : cotisation, sponsoring, don, subvention, mécénat,
  remboursement, facture ;
- un **compte** ;
- une **saison** et un **exercice** ;
- un **justificatif** ;
- une **TVA** optionnelle, activée seulement par le profil ;
- une **validation** et une trace d'audit.

Un reçu fiscal ou une facture est un **type de document généré**, pas une
nouvelle entité. Le budget est rattaché à un exercice et à une saison, pas à une
année devinée depuis une date.

---

## 4. La saison et l'exercice sont de première classe

- **Saison** : cycle sportif. Les rosters, les objectifs, les cotisations, les
  contrats et les classements s'y rattachent.
- **Exercice** : cycle comptable. Les opérations, les budgets, les bilans et
  les exports s'y rattachent.

Ces deux notions sont séparées parce qu'elles ne commencent pas forcément au
même moment, et parce que la transition association → société doit laisser une
frontière propre : les chiffres d'avant ne se mélangent jamais avec ceux
d'après.

---

## 5. Ce qu'on ne fait pas maintenant

- Aucune table spécifique à une société tant que la transition n'est pas
  réelle : pas de TVA codée, pas d'associés, pas de mécénat.
- Aucun champ dormant dans une fiche.
- Aucun libellé de forme juridique stocké dans les données.
- Aucune obligation légale de société implémentée à l'avance.

Préparer veut dire laisser la place et documenter la règle, pas coder l'avenir.

---

## 6. Ce qu'on activera au passage en société

Le jour de la transition, on activera dans cet ordre :

1. le régime fiscal (TVA et facturation) ;
2. les libellés dérivés ;
3. les documents propres à la société (factures, décisions des associés) ;
4. les obligations légales correspondantes (dépôt des comptes, conservation) ;
5. une vérification explicite de la frontière saison / exercice.

Chaque point se fera par configuration ou par un nouveau type de document,
jamais par une seconde base de code.

---

## 7. Où cela vit dans l'application

- Le profil : Système → Paramètres, dans une section « Structure ».
- Les libellés : dérivés du profil dans les composants, jamais en dur.
- Les données : les entités neutres déjà présentes ou prévues (`Person`,
  `PartnerOrganization`, `FinancialOperation`, `Document`, `Season`,
  `FiscalYear`).

Ce document est le pendant de [NAVIGATION.md](NAVIGATION.md) : l'un fixe les
lieux, l'autre fixe la structure qui les alimente.
