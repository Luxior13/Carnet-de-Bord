# Banc client — fiche personne

Route : `/membres/repertoire/[id]`. Départ : commit
`0027a78642181283aa71aea4d3fe9a6b046ade84`, 12 octobre 2026.

## Périmètre et limites

Ce banc Chromium monte les vrais composants `PersonDetailPage`, identité,
coordonnées, dialogues, provenance et zone de suppression, leurs styles et les
primitives partagées. La validation locale, le client HTTP et la garde de
navigation sont réels. Compte, droits, disponibilité, réponses HTTP, presse-papiers
et routeur sont simulés ; toutes les identités et coordonnées sont fictives.
Aucune base, session réelle ou variable `.env` n'est utilisée.

Le cadre authentifié est simplifié : marge gauche de 240 px à partir de 1024 px,
police Arial et destinations fictives. Ce montage n'est pas une validation du
cache Next, des cookies, des politiques serveur, des contraintes SQL, de
l'idempotence persistée ou du contrôle des accès réel. Le test de suppression
vérifie la réutilisation de la clé dans les requêtes du client ; il ne prouve pas
l'effacement en base. Les délais de 15 et 30 secondes sont ramenés à 100 ms dans
les scénarios concernés, pour vérifier le comportement à expiration.

## Avant correction

Les [cinq premières reproductions](preuves/avant-5.json), exécutées à 20 h 08
Europe/Paris, ont confirmé : snapshot et brouillon conservés après changement de
compte, PATCH de l'ancien compte appliqué tardivement, perte du brouillon lors
d'une indisponibilité sans snapshot SSR, page démontée lorsque sessionStorage est
refusé, et absence de soumission par Entrée dans le dialogue email.

Les [deux contrôles de coordonnées](preuves/avant-coordonnees-2.json), à 20 h 10,
ont confirmé l'écrasement d'un libellé serveur non retouché localement après une
relecture de conflit. Ils ont aussi établi que la fermeture simple par Annuler
restituait déjà correctement le focus au bouton Modifier : ce dernier point
n'était pas un défaut. Dans ces preuves, `pass` signifie que le comportement
attendu du scénario avant correction a bien été observé.

## Après correction

**30 scénarios sur 30 réussis**, le 12 octobre 2026 à 20 h 26 Europe/Paris.
Les [observations complètes](preuves/apres-30.json) comprennent l'heure UTC,
les requêtes, les mesures et l'absence d'erreurs JavaScript. Les assertions sont
dans [scenarios.cjs](scenarios.cjs).

| Cas   | Contrôles exécutés                                                                                                                                                                                                                                                                                    |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–6   | Identité et coordonnées à 320, 390, 768, 1024, 1440 et 1920 px ; trois dialogues, menus pays/réseau au clavier, retour du focus, formulaires et champs sans autocomplétion, attribut Bitwarden, références `aria-describedby` présentes.                                                              |
| 7–9   | Date future rejetée et focalisée, Entrée native, deux soumissions pour une seule mutation, conflit d'identité avec fusion du nom serveur, Annuler et focus ; départ refusé puis confirmé pendant mutation et ancien résultat ignoré.                                                                  |
| 10–13 | Comptes A → B → A sans recyclage du snapshot, PATCH tardif de l'ancien acteur ignoré, disponibilité perdue puis retrouvée sans perte du brouillon, stockage navigateur refusé sans effondrement.                                                                                                      |
| 14–17 | Email en conflit : champ local conservé et libellé serveur repris dans le second PATCH ; modification inchangée interdite, validation locale/serveur focalisée ; double ajout bloqué, avertissement de doublon conservé après succès ; disponibilité et fermeture refusée conservent le dialogue.     |
| 18    | Ajout d'un téléphone national et d'un profil social ; URL dangereuse refusée ; clés exactes du corps HTTP contrôlées, sans `normalizedPhone` calculé ajouté au contrat d'entrée.                                                                                                                      |
| 19–21 | Réponse perdue après ajout : relecture retrouve la coordonnée et propose Terminer sans second POST ; délai de mutation expiré, relecture en échec puis reprise sans perte ; coordonnée supprimée entre-temps reste non enregistrable.                                                                 |
| 22–23 | Suppression de l'email principal impossible sans remplaçant ; version parent et identifiant du remplaçant envoyés ; suppression de fiche sans mot de passe/MFA, Annuler restitue le focus, résultat incertain puis fermeture/réouverture réutilisent la même clé, retour contextuel conservé.         |
| 24–26 | Lecture seule sans commandes d'édition ni provenance, copie ; refus 403 non JSON à la relecture purge données et dialogue ; provenance restée ouverte relue après changement de version, délai expiré puis nouvelle ouverture réussie.                                                                |
| 27–30 | Conflit d'identité toujours actualisable après retour manuel aux valeurs de départ ; StrictMode sans SSR ne publie pas de fausse erreur lors du remplacement d'une lecture ; droits retirés pendant mutation effacent le dialogue et ignorent la réponse ; succès email restitue le focus à Modifier. |

Après cette passe, les fonctions de brouillon ont été extraites dans
`person-child-draft.ts` pour respecter la limite de taille du composant. La
[fusion après extraction](preuves/apres-extraction-fusion-1.json) et les
[contrats téléphone/social après extraction](preuves/apres-extraction-contrats-1.json)
ont été rejoués avec succès. Lint ciblé, typecheck et budget d'architecture passent.

Les captures suivantes ont été inspectées :
[identité 320 px](preuves/identite-320.png),
[identité 1440 px](preuves/identite-1440.png),
[coordonnées 320 px](preuves/coordonnees-320.png) et
[coordonnées 1440 px](preuves/coordonnees-1440.png).
Aucun débordement horizontal du document ou de la zone principale n'est mesuré
dans la passe finale.

Les passes intermédiaires ont corrigé des attentes propres au banc : nom du
bouton Actualiser la version, nom accessible du bouton Copier, exclusion du
checkbox interne masqué de Radix lors de la vérification des champs de saisie.
Elles ne sont pas comptabilisées comme défauts produit. La régression du champ
calculé téléphone a été identifiée par l'intégration HTTP réelle, puis corrigée
et ajoutée aux assertions du banc : la simulation seule ne validait pas ce
contrat serveur strict.

## Reproduction

Depuis la racine, avec les dépendances du dépôt et Chromium déjà installés :

```powershell
node docs/audits/fiche-personne-2026-10-12/banc-client/run.cjs
```

`AUDIT_ONLY` sélectionne les noms contenant sa valeur. `AUDIT_BEFORE=1` active
les sept scénarios historiques ; leurs assertions nécessitent le code d'avant
correction dans une copie isolée, et ne doivent pas être attendues vertes sur le
code corrigé. Le script imprime son dossier temporaire, ferme serveur et
navigateur, et écrit `observations.json` avec un code de sortie non nul si une
assertion échoue. L'archivage et la suppression du dossier temporaire restent
explicites ; les temporaires de cette exécution ont été retirés après archivage.

Safari, Firefox, lecteur d'écran, zoom système et extensions de mots de passe
réellement installées ne sont pas testés par ce banc. Les attributs empêchant
l'autocomplétion ne constituent pas une garantie sur toutes les extensions.
