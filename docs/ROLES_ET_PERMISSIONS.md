# Rôles et portée des permissions — conception de référence

Le site est destiné à plusieurs utilisateurs : bureau, trésorier, secrétaire,
staff, coach et joueurs. Chacun voit ce dont il a besoin, et rien de plus.

Ce document s'appuie sur [PERMISSIONS.md](PERMISSIONS.md), qui décrit le moteur
de permissions. Il ne le remplace pas : il ajoute les deux notions qui
manquaient, les **patrons de rôle** et la **portée**.

---

## 1. Les principes

- **Deux rôles techniques seulement** : `USER` et `ADMIN`. On n'en ajoute pas.
- **Un patron de rôle est un ensemble nommé de permissions**, pas un nouveau
  rôle. Il pré-remplit une surcharge différentielle par rapport au rôle de
  base.
- **La portée limite ce qu'une permission permet de voir** : soi-même, son
  équipe, ou tout. Le serveur filtre toujours ; l'interface ne fait que
  refléter.
- **Refus par défaut et portée la plus restrictive par défaut.** Une permission
  absente ou une portée non précisée vaut toujours « rien ».

---

## 2. Les patrons de rôle

Un patron est un point de départ appliqué lors de la création d'un compte. Il
peut ensuite être ajusté individuellement, exactement comme aujourd'hui.

| Patron | Rôle de base | Permissions pré-remplies |
| --- | --- | --- |
| **Bureau** | `ADMIN` | tout le socle administratif ; ce sont les comptes qui administrent le site |
| **Trésorier** | `USER` | `treasury:*`, `persons:view`, `audit:view`, `notifications:send` |
| **Secrétaire** | `USER` | `persons:*`, `meetings:*`, `documents:*`, `audit:view`, `internal_news:manage` |
| **Communication** | `USER` | `internal_news:manage`, `notifications:manage`, `documents:view`, `partners:view` |
| **Coach** | `USER` | `sport:*` en portée équipe, `meetings:view`, `debriefs`, `persons:view` limité |
| **Membre / Joueur** | `USER` | `account:*`, `notifications:view`, et son espace personnel |

Les clés de modules non encore livrés (`treasury:*`, `meetings:*`, `sport:*`)
restent des identifiants réservés : le patron les cite, mais elles ne
deviennent effectives qu'avec leur module. Aucun patron ne contourne cette
règle.

Règles d'attribution :

- un patron ne peut pas accorder plus que ce que l'administrateur qui
  l'applique possède lui-même ;
- les permissions critiques exigent la MFA de la cible, comme aujourd'hui ;
- un patron n'est jamais une autorisation : c'est le serveur qui décide.

---

## 3. La portée

Trois niveaux :

| Portée | Signification |
| --- | --- |
| `self` | uniquement ses propres données : son profil, ses documents, ses opérations |
| `team` | les données de ses équipes ou de sa saison |
| `all` | toutes les données du périmètre |

Exemples concrets :

- un joueur a `sport:view` en portée `self` : il voit ses matchs et ses
  disponibilités, pas ceux des autres ;
- un coach a `sport:view` en portée `team` : il voit ses équipes, pas toute la
  structure ;
- le bureau a `persons:view` en portée `all`.

Implémentation prévue : une ressource porte un propriétaire ou un rattachement
de saison ou d'équipe, et la politique serveur compare ce rattachement à la
portée du compte. La portée ne devient jamais un simple filtre côté client.

---

## 4. Matrice rôles × pôles

Lecture : `—` = rien, `self` = uniquement soi, `team` = ses équipes, `all` =
tout le périmètre du pôle.

| Pôle | Joueur | Coach | Communication | Secrétaire | Trésorier | Bureau |
| --- | --- | --- | --- | --- | --- | --- |
| Aujourd'hui | self | team | all | all | all | all |
| Personnes | self | team | all | all | all | all |
| Relations | — | — | lecture | all | lecture | all |
| Activité | self | team | all | all | all | all |
| Équipe | self | team | lecture | all | lecture | all |
| Finances | — | — | — | lecture | all | all |
| Système | — | — | — | lecture | lecture | all |

Cette matrice est un guide de configuration, pas un contournement du moteur :
les permissions exactes restent la source de vérité.

---

## 5. L'espace personnel

La majorité des comptes sera composée de joueurs. Leur espace est le socle de
l'adoption : il regroupe ce qui les concerne sans aucune permission
administrative.

Contenu prévu :

- mon profil et mes coordonnées ;
- mon planning (convocations, entraînements, matchs) ;
- mes documents à lire ou à signer ;
- mes disponibilités ;
- mes objectifs et ma progression ;
- mes cotisations et le matériel qui m'est confié.

Il vit dans l'en-tête, pas dans la sidebar, conformément à
[NAVIGATION.md](NAVIGATION.md).

---

## 6. Ce qu'on ne fait pas maintenant

- Aucun rôle technique supplémentaire.
- Aucune hiérarchie d'équipes complexe : au départ, « mes équipes » suffit.
- Aucune portée codée en dur dans les composants : elle vit dans les politiques
  serveur.
- Aucun patron pour un module encore non livré n'est activé.

---

## 7. Ce que cela implique pour la navigation

La sidebar reflète les permissions **et** la portée. Un pôle sans lieu
accessible disparaît, comme aujourd'hui. La recherche ne renvoie que ce que la
portée autorise.

Les libellés de pôles suivent [NAVIGATION.md](NAVIGATION.md), et le profil de
structure suit [STRUCTURE.md](STRUCTURE.md).
