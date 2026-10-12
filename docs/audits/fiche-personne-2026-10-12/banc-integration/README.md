# Fiche personne — parcours HTTP du 12 octobre 2026

[Rapport](../../AUDIT_FICHE_PERSONNE_2026-10-12.md) ·
[Script](run.cjs) · [Résultats](resultats.json).

## Périmètre et méthode

Le script exécute les vrais composants, le serveur Next construit pour la
production, les routes HTTP, la connexion avec MFA, les cookies de session,
le contrôle CSRF et PostgreSQL 17. Les comptes, personnes et coordonnées sont
fictifs. Aucun appel ni réinitialisation ne vise la base habituelle du projet.

Le script refuse toute autre cible que `127.0.0.1:3125` et la base
`person_detail_test` sur `127.0.0.1:54620`. `AUDIT_ENV_FILE` doit désigner le
fichier JSON privé du banc temporaire contenant les variables E2E et les clés
de chiffrement. Ce fichier et les secrets MFA restent hors dépôt. Le banc
requiert les migrations et le compte préparés par `scripts/e2e-setup.mjs`,
avec la cible E2E explicite ; il ne prépare ni ne réinitialise de base lui-même.

Commande depuis la racine, après préparation de cet environnement isolé :

```powershell
node docs/audits/fiche-personne-2026-10-12/banc-integration/run.cjs
```

Les mutations concurrentes passent par les vraies API. Deux scénarios
interceptent seulement le retour réseau, après réception de la réponse du
serveur et commit PostgreSQL : PATCH d'identité et DELETE de fiche. La reprise
du DELETE vérifie la même clé après fermeture et réouverture du dialogue.
Les révocations de droits sont injectées dans le compte fictif via Prisma,
puis les refus et le retrait des données sont observés dans le navigateur.

## Résultat

Treize parcours réussis dans Chromium 149.0.7827.55 : identité, erreurs et focus,
conflits et fusion, coordonnées, remplacement du principal, origine d'un champ,
clé d'historique invalide, dimensions réduites, lecture seule, suppression et
rejeu, révocation en cours de PATCH et DELETE, puis accès anonyme.
Le JSON détaille chaque parcours ; les états SQL finaux sont contrôlés pour
la normalisation du téléphone et les suppressions.

Captures fictives inspectées : [1440 px](fiche-1440.png),
[390 px](fiche-390.png), [320 px](fiche-320.png),
[844 px en paysage](fiche-844.png). La page emploie son propre conteneur de
défilement : une capture ne représente pas nécessairement toutes les sections
au-delà de ce conteneur. Les parcours font aussi défiler les actions.

Le banc a détecté puis revérifié une régression introduite pendant cette passe :
la sortie transformée du schéma de téléphone ajoutait `normalizedPhone` au
payload HTTP, refusé par le contrat strict du serveur. Le client envoie de
nouveau les champs d'entrée ; la normalisation calculée reste côté serveur.

## Limites

- HTTP local, sans proxy de production ni panne PostgreSQL au niveau réseau.
- Dimensions émulées ; pas de mobile physique, de zoom natif, de lecteur d'écran
  ou de Safari/iOS réel. Le contrôle de la barre d'action porte sur sa présence
  dans la fenêtre après défilement, pas sur toutes les positions possibles.
- Pas d'extension Bitwarden réelle ; les attributs empêchant le remplissage
  automatique sont vérifiés, sans garantir le comportement de toute extension.
- Les courses d'acteur et les délais client sont vérifiés séparément dans le
  [banc de composants](../banc-client/README.md), dont les contextes sont simulés.
