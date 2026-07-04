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
- Une personne externe ou sensible est geree dans personnes et contacts.
- Une cotisation est geree dans adherents ou tresorerie selon le choix final.
- Une fiche sponsor, membre, adherent ou personne peut afficher ces informations liees sans devenir leur page de gestion principale.

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

## Exemple personne externe

Sur la fiche d'une personne externe ou sensible, on doit pouvoir garder les informations utiles sans la transformer en membre.

- Informations de contact modifiables depuis la fiche personne.
- Statut de la personne.
- Tags internes.
- Notes sensibles selon les permissions.
- Incidents, sanctions ou bans lies en lecture seule.
- Tournois ou evenements concernes.
- Historique des actions importantes.

Actions possibles depuis la fiche personne :

- Ajouter une note interne.
- Voir ou creer un incident dans incidents et sanctions.
- Ajouter un rappel lie a la personne.
- Archiver la fiche sans supprimer l'historique.

## Organisation des ecrans

- Les grandes pages servent a gerer les listes et les actions principales.
- Les fiches detaillees servent a centraliser la lecture.
- Les sous-parties doivent plutot etre des blocs ou onglets dans une fiche.
- Les boutons doivent renvoyer vers le bon module quand une modification appartient a une autre partie.
- Les permissions du module principal doivent aussi s'appliquer quand les donnees sont affichees dans une fiche liee.

## A garder en tete

L'objectif est d'avoir un site clair pour l'UX : peu de grandes pages dans la sidebar, mais des fiches riches qui regroupent toutes les informations liees a un sponsor, un membre, un adherent ou une autre entite importante.

## Organisation cible par poles

Le site prive doit etre organise avec un selecteur d'espace en haut de la sidebar.
Chaque pole affiche ensuite sa propre navigation pour eviter une sidebar geante.

### Tableau de bord

- Vue d'ensemble.
- Mes taches.
- Mes rappels.
- Prochaines reunions.
- Documents a accepter.
- Alertes importantes.

### Vie interne

- Actualite interne.
- Membres.
- Adherents.
- Calendrier interne.
- Gestion des reunions.
- Debriefs.
- Recrutement et tryouts.
- Onboarding et depart.
- Notifications et rappels.

### Bureau et juridique

- Personnes et contacts.
- Sponsors et partenaires.
- Documents officiels.
- Chartes.
- Contrats.
- Acceptation des chartes.
- Incidents et sanctions.
- Inventaire et acces.
- Decisions du bureau.

### Tresorerie

- Tableau de bord financier.
- Comptes.
- Budget.
- Operations.
- Recettes.
- Depenses.
- Cotisations adherents.
- Sponsoring financier.
- Factures et justificatifs.
- Remboursements.
- Bilans.
- Exports finance.
- Validations finance.
- Journal financier.
- Archives finance.

### Systeme

- Utilisateurs et permissions.
- Parametres.
- Validations globales.
- Exports et sauvegardes.
- Archives globales.
- Journal d'activite.
- Modeles de documents.
- Modeles de notifications.
- Automatisations.

### Sport / Team Control

Ce pole est prevu plus tard comme liaison avec le site public.
Il ne doit pas dupliquer les donnees deja gerees cote public.

- Jeux.
- Rosters.
- Membres esport.
- Scrims.
- Tournois et matchs.
- Calendrier esport.
- Recrutement et tryouts.
- Debriefs.
- Performance.

## Recherche globale

La recherche globale ne doit pas etre dans la sidebar.
Elle doit rester disponible dans le header et respecter les permissions de chaque pole.
