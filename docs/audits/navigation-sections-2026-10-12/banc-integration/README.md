# Navigation de sections après défilement

Parcours Next réels du 12 octobre 2026 sur la fiche Personne, Mon compte et la
fiche Utilisateur. Le contrôle porte sur le début du contenu, le focus, l’URL
et la garde d’un brouillon local après un changement de section. Les
[neuf parcours finaux](preuves/final-resultats.json) réussissent : nouveau
contenu visible, focus sur le lien choisi, annulation sans perte de saisie ni
déplacement, confirmation sans ajout d’une entrée d’historique.

## Environnement isolé

Point de départ `34fccaa`, Next 15.5.23 en production avec le build existant,
Chromium 149.0.7827.55 et PostgreSQL 17 avec les 52 migrations. Origine
`http://127.0.0.1:3128`, base `sections_test` sur `127.0.0.1:54650` ;
[le helper](auth.cjs) refuse les autres cibles. Aucun fichier `.env` habituel
ni donnée habituelle du projet n’est utilisé.

Le dossier privé `noctambule-sections-*` contient la configuration temporaire
et le secret TOTP du compte fictif. Le compte racine est préparé par
`apps/web/scripts/e2e-setup.mjs`, puis authentifié par mot de passe et MFA réels.
Une personne avec huit emails et quatre téléphones et un compte USER de
consultation sont créés directement dans cette base par [la préparation](discover.cjs).
Cette préparation ne constitue pas un test des API de création.

## Mesures initiales

[Neuf observations](preuves/baseline-resultats.json) exécutées : pour chaque
page, passage depuis une section longue à 1024 × 600, retour clavier vers la
section longue à 390 × 600, puis brouillon avec **Rester** et confirmation.
Le conteneur mesuré est `main#main-content`, pas le défilement de `window`.

- Mon compte, Profil bas → Sécurité déjà visitée à 390 px : `scrollTop` reste
  à 478 ; le titre Sécurité est à 37,58 px, masqué au-dessus de la barre
  occupant 56–105 px. Le lien conserve le focus.
- Les transitions Personne ramènent le défilement à zéro et réaffichent le
  bandeau ; leur nouveau titre est visible et le lien reste focalisé.
- Mon compte, Sécurité → Profil, et Utilisateur, Autorisations → Profil,
  rendent leur titre visible mais laissent le focus sur `BODY`. La confirmation
  vers Autorisations perd également le focus dans ce parcours.
- Les trois annulations conservent exactement position, URL et brouillon.
  Le focus revient sur le lien activé. Les confirmations ajoutent une entrée
  d’historique, contrairement au changement direct de section.

Les [six premières mesures](preuves/baseline-mesures-initiales.json) sont
conservées avec leur limite : leur champ `newContentVisible` associait visibilité
du titre et maintien de la barre en haut. Un `false` ne prouvait donc pas que le
titre était caché. Le runner corrigé sépare ces observations en
`newContentVisible` et `barRemainsAtTop`, puis exclut les titres `sr-only` de sa
mesure visuelle. Les coordonnées brutes initiales restent lisibles ; ces six
mesures ne sont pas additionnées aux neuf observations finales de baseline.

## Résultats après correction

[La même campagne](run.cjs) est rejouée après le build final. Les neuf scénarios
passent leurs assertions de visibilité et de focus ; les trois confirmations
gardent aussi la longueur d’historique antérieure, sans nouvelle entrée.

Sur Mon compte à 390 px, Profil → Sécurité passe de `scrollTop` 478 à 395 :
le titre est à **120,58 px**, sous la barre 56–105 px. Le lien Sécurité reste
focalisé. Les [captures initiale](preuves/baseline-compte-mobile.png) et
[finale](preuves/final-compte-mobile.png) ont été inspectées. La fiche
Utilisateur restaure également le focus et montre le début des autorisations
sous la barre ([capture mobile](preuves/final-utilisateur-mobile.png)).

La fiche Personne revient encore à zéro lors des transitions Next exercées.
Le début du contenu reste visible et le focus sur le lien ; aucune suppression
de toute remontée native du routeur n’est revendiquée. De même, la variation
de hauteur entre sections peut borner naturellement le défilement. Le contrat
vérifié n’impose pas de recoller artificiellement la barre lorsque le contenu
est déjà visible.

Les valeurs de fin de défilement de Sécurité changent entre exécutions parce
que chaque authentification réelle ajoute une session visible dans la liste.
Cela ne change pas le cas de référence Profil → Sécurité, dont la position
initiale reste 478 px à 390 × 600.

## Reproduction

Créer un cluster exclusif aux cibles ci-dessus, injecter les variables privées
E2E et retirer `DATABASE_URL` du seul processus de préparation avant
`bun apps/web/scripts/e2e-setup.mjs`. Pour démarrer Next, définir ensuite
explicitement `DATABASE_URL` depuis `E2E_DATABASE_URL`. `AUDIT_ENV_FILE`
désigne le `env.json` privé, jamais un fichier du dépôt.

```powershell
node docs/audits/navigation-sections-2026-10-12/banc-integration/discover.cjs
node docs/audits/navigation-sections-2026-10-12/banc-integration/run.cjs baseline
node docs/audits/navigation-sections-2026-10-12/banc-integration/run.cjs final
```

La phase baseline exige le build initial. La phase finale ajoute les assertions
de visibilité, de focus et de stabilité de l’historique après confirmation.
Les brouillons ne sont jamais enregistrés. Entre scénarios indépendants, une
navigation complète remet le parcours à zéro après abandon accepté.

## Limites

Les pages, requêtes, données fictives, styles et historique navigateur sont
réels. Aucune route de sonde ou réponse API simulée n’est ajoutée. Les dimensions
de viewport ne représentent pas un appareil mobile physique, Safari/iOS ou un
lecteur d’écran. Cette passe ne répète pas les audits métier, SQL ou permissions
des trois pages et ne valide pas tous les placements de champs sous une barre.

## Nettoyage

[Le nettoyage](preuves/cleanup.json) est terminé : Next 3128 et PostgreSQL 54650
arrêtés, ports libres, cluster et dossier privé supprimés avec le marker.
Le chemin absolu, le nom du dossier temporaire, la cible SQL et l’absence de
jonction ont été contrôlés avant suppression. Les secrets privés ont été
comparés aux fichiers texte du banc sans occurrence ; ils ne sont pas archivés.
Seuls scripts, résultats structurés et captures fictives restent dans le dépôt.
