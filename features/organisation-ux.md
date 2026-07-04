# Organisation UX

## Objectif

Definir comment organiser le site prive pour eviter d'avoir trop de pages separees, tout en evitant aussi une seule page qui contient tout.

## Principe general

- La sidebar contient les grandes parties du site.
- Chaque grande partie gere ses propres donnees.
- Les fiches detaillees centralisent les informations liees pour faciliter la lecture.
- Une donnee ne doit pas etre dupliquee dans plusieurs endroits.
- Une donnee a toujours un module principal ou elle est creee et modifiee.
- Les autres pages peuvent afficher cette donnee en lecture seule si elle est liee.

## Regle importante

- Une operation financiere est geree dans la tresorerie.
- Un contrat ou document est gere dans documents ou contrats.
- Un rappel est gere dans notifications et rappels.
- Une sanction est geree dans incidents et sanctions.
- Une cotisation est geree dans adherents ou tresorerie selon le choix final.
- Une fiche sponsor, membre ou adherent peut afficher ces informations liees sans devenir leur page de gestion principale.

## Exemple sponsor

Sur la fiche d'un sponsor, on doit pouvoir voir les informations importantes au meme endroit.

- Informations sponsor modifiables depuis la fiche sponsor.
- Tresorerie liee en lecture seule.
- Paiements recus.
- Paiements en attente.
- Factures ou justificatifs lies.
- Contrats et documents lies.
- Obligations et livrables sponsor.
- Rappels lies au sponsor.
- Historique des actions importantes.

Actions possibles depuis la fiche sponsor :

- Voir dans la tresorerie.
- Ajouter un paiement avec le sponsor deja pre-rempli.
- Voir ou modifier le contrat dans le module documents ou contrats.
- Ajouter un rappel lie au sponsor.

## Exemple membre

Sur la fiche d'un membre, on doit pouvoir centraliser tout ce qui permet de comprendre la personne.

- Informations de contact modifiables depuis la fiche membre.
- Statut adherent lie.
- Cotisations liees en lecture seule.
- Sanctions ou incidents lies.
- Documents signes ou a signer.
- Materiel et acces confies.
- Onboarding ou depart.
- Historique des actions importantes.

Actions possibles depuis la fiche membre :

- Voir la cotisation dans la tresorerie.
- Ajouter une note interne.
- Voir les sanctions dans incidents et sanctions.
- Voir les documents lies.
- Ajouter un rappel ou une action a faire.

## Organisation des ecrans

- Les grandes pages servent a gerer les listes et les actions principales.
- Les fiches detaillees servent a centraliser la lecture.
- Les sous-parties doivent plutot etre des blocs ou onglets dans une fiche.
- Les boutons doivent renvoyer vers le bon module quand une modification appartient a une autre partie.
- Les permissions du module principal doivent aussi s'appliquer quand les donnees sont affichees dans une fiche liee.

## A garder en tete

L'objectif est d'avoir un site clair pour l'UX : peu de grandes pages dans la sidebar, mais des fiches riches qui regroupent toutes les informations liees a un sponsor, un membre, un adherent ou une autre entite importante.
