# Structure — préparer l’association et une éventuelle société

Conception cible révisée le 22 septembre 2026. Les modules décrits ici sont prévus ; cette refonte ne crée ni tables métier ni transition juridique. Le but est de conserver une application commune et des historiques exacts.

## Entité juridique et structure esport

La marque ou la structure esport peut être portée par une association puis une société, éventuellement simultanément. Le modèle cible doit pouvoir identifier l’entité responsable d’un engagement, d’un compte, d’une facture ou d’un document.

Commencer par une seule entité réellement utilisée. Prévoir son rattachement dans les futurs modules ; ne pas ouvrir d’interface de gestion de groupe sans besoin réel.

Une évolution juridique ne doit pas être traitée comme un bouton qui change tous les anciens dossiers. Chaque contrat, document émis et opération garde son entité d’origine. Une reprise ou un transfert éventuel est un événement explicite, daté et traçable, à cadrer au moment où il devient réel.

## Profil et historique

Le profil métier peut contenir les informations effectivement nécessaires : dénomination, forme, adresses, identifiants applicables, responsables, périodes de validité et paramètres de gestion. Les règles applicables sont définies selon la situation réelle et les exigences vérifiées lors de leur mise en œuvre.

Les documents déjà émis conservent les informations de leur émission ; modifier une adresse ou un responsable courant ne réécrit pas l’histoire. Les périodes clôturées ou dossiers archivés ne suivent pas aveuglément les réglages actuels.

Le profil métier vit dans Structure. Les paramètres de sécurité, d’accès et d’exploitation restent dans Système. Assurances, affiliations et licences ont leurs échéances, pièces et responsables ; ce ne sont pas seulement des champs sans suivi.

## Identités et relations

| Objet | Responsabilité |
| --- | --- |
| Personne | Identité durable ; ne vaut pas compte de connexion |
| Compte utilisateur | Authentification, accès, préférences et actions |
| Engagement ou relation datée | Adhésion, mandat, bénévolat, contrat, affectation à une équipe |
| Organisation externe | Identité d’un partenaire, fournisseur ou autre tiers |
| Entité juridique interne | Partie responsable de ses dossiers et engagements |

Une personne peut cumuler des relations et changer de rôle. Un adhérent ne devient pas automatiquement client ou associé. La nature de sa relation est une donnée métier explicite, avec ses dates et son historique.

Toute future liaison Personne–Utilisateur doit être explicite, vérifiée et réversible selon une politique définie ; l’email commun ne suffit pas. Les fonctionnalités actuelles gardent leur séparation.

## Saison, campagne et exercice

- **Saison sportive** : cycle des équipes, effectifs et compétitions.
- **Campagne d’adhésion** : période et conditions d’engagement, éventuellement liées à une saison.
- **Exercice financier** : période de suivi comptable d’une entité.
- **Période contractuelle** : dates propres à un accord.

Ces périodes peuvent différer. Un budget peut suivre une équipe ou une saison tout en étant ventilé par exercice. Une vue consolidée éventuelle doit rester explicite et permettre de retrouver l’entité source.

## Finance : objets distincts, liens explicites

| Objet cible | Ce qu’il représente |
| --- | --- |
| Compte financier | Lieu de détention ou de suivi des fonds, rattaché à une entité |
| Facture et avoir | Montant demandé, lignes, échéances, corrections et état propre |
| Paiement ou règlement | Mouvement réellement enregistré, alloué à une ou plusieurs créances/dettes |
| Demande de remboursement | Frais soumis, pièces, décision et état de règlement |
| Budget | Prévision versionnée, indépendante des mouvements réalisés |
| Engagement contractuel | Origine d’une obligation, avec ses échéances et conditions |
| Document justificatif | Pièce jointe ou document émis, avec version et accès |

Une facture peut être impayée ou réglée partiellement. Une dépense prévue peut ne jamais être payée. Un remboursement demandé peut être refusé. Les fusionner en une seule ligne de mouvement ferait perdre ces différences.

Les catégories (cotisation, sponsoring, don, déplacement…) permettent de filtrer et d’analyser les flux. Elles ne remplacent pas les objets sources ni leurs règles. Les règles fiscales, la facturation et les exports professionnels seront cadrés selon les besoins réels, sans inventer aujourd’hui un moteur complet de comptabilité ou de paie.

## Documents, gouvernance et confidentialité

Prévoir les versions, l’acceptation ou la signature selon le besoin, les dates d’effet, les échéances, le responsable et le rattachement à l’entité. Gouvernance couvre les instances, mandats, convocations, décisions et leurs preuves.

Le suivi des mineurs, les autorisations, les dossiers disciplinaires et les données RH demandent des périmètres propres. Définir les durées de conservation, suppressions et éventuelles restrictions selon chaque catégorie de données lors du cadrage du module. Une sauvegarde ne remplace pas un historique métier.

Les pièces, engagements et montants existants ne seront pas réinterprétés rétroactivement au changement de forme. La préparation de la société consiste à maintenir ces frontières et permettre l’évolution des règles.

Voir [les priorités](FEUILLE_DE_ROUTE.md) et [les périmètres d’accès](ROLES_ET_PERMISSIONS.md).
