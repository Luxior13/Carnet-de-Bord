# Espace Système

[Index des pages](../README.md) · [Design](../../design/README.md) · [Guide général](../../REFERENCE_GENERALE.md)

Pôle Système (`/systeme/*`) : administration technique. La route générique
`/systeme/[[...slug]]` sert les Paramètres ; sans segment, elle
redirige vers la première page visible du pôle pour le compte connecté
([routes](../../systeme/routes.md)).

## Modules et pages

| Route | Fiche | Gabarit | État |
| --- | --- | --- | --- |
| `/systeme/utilisateurs`, `/nouveau`, `/[id]` | [Utilisateurs](utilisateurs/README.md) : liste, création, Profil, Autorisations, Sécurité | A, C, B | Pages de référence (liste en complément, fiche pour la barre d’enregistrement) |
| `/systeme/parametres` | [Paramètres système](parametres.md) | D | Servie par `/systeme/[[...slug]]` |
| `/systeme/feuille-de-route` | [Feuille de route](feuille-de-route.md) | E | Aligné |
| `/systeme/journal-activite` | [Journal d’activité (retirée)](journal-activite.md) | — | Retirée le 9 octobre 2026, alias vers la feuille de route |

Les alias `/administration` et `/administration/utilisateurs/*` redirigent vers
les Utilisateurs ([routes](../../systeme/routes.md#alias-et-redirections-permanentes)).
