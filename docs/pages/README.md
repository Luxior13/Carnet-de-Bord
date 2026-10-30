# Fiches des pages

[Guide général](../REFERENCE_GENERALE.md) · [Système de design](../design/README.md) ·
[Organisation documentaire](../methode/organisation-documentaire.md) ·
[Modèle de fiche](../methode/modeles/suivi-page.md)

**Chaque page de l’application a sa fiche, et chaque section importante d’une
page à sections a la sienne.** Une fiche porte l’état courant : identité, rôle,
composition, décisions retenues, points ouverts, références, historique, puis
les revues datées. Les règles communes restent dans les
[références](../REFERENCE_GENERALE.md) et le [design](../design/README.md) ; les
preuves longues dans les [audits](../audits/README.md).

Les fiches ont été réorganisées le 19 octobre 2026 : les anciens suivis de
`docs/qualite/pages/` ont été répartis par page et par section, sans
modification du contenu des revues. Les fiches sans revue propre portent la
mention « Suivi à compléter ».

## Espaces

| Espace | Index ou fiche | Contenu |
| --- | --- | --- |
| Aujourd’hui | [Accueil — Mon travail](accueil.md) | `/` ; l’alias `/tableau-de-bord` y redirige |
| Hors cadre | [Connexion](connexion.md) | `/login`, double authentification |
| Compte personnel | [Mon compte](mon-compte/README.md) | Profil, Accès et Sécurité |
| Membres | [membres/](membres/README.md) | Répertoire : liste de référence, création, fiche à deux sections |
| Système | [systeme/](systeme/README.md) | Utilisateurs, Paramètres, Feuille de route, Journal d’activité (retiré) |
| Transverse | [transverse/](transverse/README.md) | Navigation générale, états techniques, composants partagés, modales |

## Pages de référence du design

| Gabarit | Fiche |
| --- | --- |
| Liste de gestion | [Liste du répertoire](membres/repertoire/liste.md), complétée par la [liste des utilisateurs](systeme/utilisateurs/liste.md) |
| Fiche à sections et barre d’enregistrement | [Utilisateurs](systeme/utilisateurs/README.md) |
| Réglages en lignes compactes | [Utilisateur — Autorisations](systeme/utilisateurs/fiche-autorisations.md) |

## État des fiches

| Fiche | État au 19 octobre 2026 |
| --- | --- |
| [Utilisateurs](systeme/utilisateurs/README.md) | 18 octobre : Autorisations en cartes, détails en popover, Administrateur complet ; 17 octobre : champs harmonisés et présentation allégée ; catalogue 27/7 et corrections serveur du 15 octobre conservés |
| [Répertoire](membres/repertoire/README.md) | **Référence visuelle et UX** ; 15 octobre : confidentialité de provenance et minimisation corrigées, lecture et écriture des coordonnées séparées ; 82 tests SQL et parcours réels ciblés |
| [Mon compte](mon-compte/README.md) | 15 octobre : capacité d’activité sans écran retirée ; sept capacités personnelles dont une configurable ; garanties maintenues |
| [Paramètres système](systeme/parametres.md) | 15 octobre : droits fixes ADMIN documentés ; refonte de l’interface du 14 octobre |
| [Feuille de route](systeme/feuille-de-route.md) | Revérifiée dans la clôture du 13 octobre ; catalogue inchangé, chantiers futurs non activés |
| [Accueil](accueil.md) | Parcours réel du 13 octobre réussi ; aucun widget futur ajouté |
| [Connexion](connexion.md) | Connexion et MFA réelles rejouées pour la clôture ; AUTH-02 et limites d’exploitation conservés |
| [Navigation générale](transverse/navigation-generale.md) | Menu Rubriques confirmé ; focus du fil d’Ariane corrigé ; limite du défilement natif précisée |
| [États techniques](transverse/etats-techniques.md) | États client et 404 réelle revérifiés le 13 octobre |
| [Composants partagés](transverse/composants-partages.md) | UI-C10 réconcilié, UI-C11 conservé pour les moteurs et aides techniques non testés |
| [Modales](transverse/modales.md) | MOD-INT réconcilié, MOD-A11Y conservé |
| [Journal d’activité](systeme/journal-activite.md) | Page retirée le 9 octobre 2026 ; reconstruction cadrée le 30 octobre 2026, à valider |

### Complément transverse du 15 octobre 2026

L’[audit transverse des autorisations des pages actuelles](../audits/2026-10-15-autorisations-site.md)
a ouvert des points de confidentialité de provenance et de cohérence du
catalogue et du compteur (analyse droit par droit, 400 tests existants et trois
sondes simulées), corrigés ensuite après accord. Les points sont liés
dans Utilisateurs, Répertoire, Mon compte et Paramètres. Les conclusions du
13 octobre restent datées et ne closent pas ces constats.

### Clôture datée du socle du 13 octobre 2026

La [clôture du socle](../audits/2026-10-12-cloture-socle.md) a repris les onze
suivis actifs et transverses pour poursuivre le développement métier : smoke
réel, panorama de onze pages à trois largeurs et restauration signée isolée
réussis. Elle ne qualifie pas un déploiement : lecteur d’écran, Safari/iOS et
appareils physiques, charge concurrente, purges importantes, exploitation et
qualification des durées restent à reprendre selon le besoin. Le remplacement
MFA combiné à une perte de réponse n’est pas annoncé comme joué de bout en bout
HTTP. L’incident Bitwarden déclaré résolu par le propriétaire reste clos. Aucun
nouvel audit complet n’est requis sans changement, défaut constaté ou règle nouvelle.

Compléments : [menus déroulants du 10 octobre](../audits/2026-10-10-menus.md)
(onze consommateurs actifs contrôlés dans un navigateur isolé) ;
[autocomplétion du 11 octobre](../audits/2026-10-11-autocompletion.md).

## Règles de tenue

- **Une fiche par page existante** et une fiche par section importante d’une
  page à sections. Une route de redirection n’a pas de fiche : elle est
  mentionnée dans l’index de son espace.
- Un module à plusieurs pages a un dossier avec un `README.md` commun : routes,
  sections, règles communes, points ouverts communs et revues de tout le module.
  Chaque fiche renvoie au README au lieu de le recopier.
- Une nouvelle page reçoit sa fiche au moment de sa création, à partir du
  [modèle](../methode/modeles/suivi-page.md), et entre dans l’index de son
  espace. Une page retirée garde sa fiche, marquée « retirée », avec la date et
  le remplaçant éventuel.
- Nom stable sans date. La synthèse courante est révisée à chaque reprise ;
  les revues datées restent en bas de fiche. Les identifiants de défaut sont conservés.
- « Alignée » ou « référence visuelle » ne signifie pas que tous les défauts
  sont clos ; une fiche ne vaut pas validation fonctionnelle.
- Les intentions métier historiques des pages prévues restent dans les
  [propositions](../propositions/intentions/pages/README.md) ; ce dossier suit
  les pages réelles. Ne pas créer de fiches vides pour les modules prévus.
- Le contrôle documentaire vérifie que chaque fiche est accessible depuis cet
  index et que chaque `page.tsx` de l’application est citée par une fiche.

## Mettre une fiche à jour

À chaque travail sur une page :

1. Lire sa fiche et celle du module avant de choisir une solution.
2. Remplacer la mention « Suivi à compléter » dès que la composition et le rôle
   sont relevés.
3. Consigner les décisions du propriétaire dans « Décisions retenues » et, si
   elles touchent le style, dans le [journal des préférences](../design/preferences.md).
4. Mettre à jour l’état d’harmonisation et les points ouverts, avec leur preuve.
5. Ajouter une ligne d’historique datée et, pour une passe substantielle, une
   revue datée.
