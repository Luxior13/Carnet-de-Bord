# Clôture du socle — intégration et restauration isolées

Revue des 12–13 octobre 2026. Ce dossier distingue trois niveaux complémentaires
de preuve. Les trois niveaux sont exécutés et réussis : **un smoke canonique,
14 scénarios de panorama et quatre contrôles de restauration**. Les résultats
conservent leur portée propre ; ils ne sont pas additionnés aux tests unitaires.

## Environnement et ordre d'exécution

Next.js de production sur `127.0.0.1:3132`, PostgreSQL temporaire sur le port
54663. Le serveur utilise seulement `socle_e2e_test`, entièrement migrée. La
restauration vise exclusivement `socle_restore_test`, également migrée et vide.
Les scripts refusent un autre hôte, port ou nom de base ; ils ne modifient pas
la base habituelle du projet.

Le [lanceur](run.ps1) lit un marqueur et une configuration privés dans le dossier
temporaire de l'audit. Après construction et démarrage : exécuter `Smoke`, puis
`Pages` ; arrêter Next avec `Stop` et fermer tout navigateur de test avant
`Restore`. Le smoke prépare et modifie ses fixtures : les deux parcours ne
doivent pas être lancés simultanément. La comparaison de restauration exige
une source sans écriture active ; le banc détecte aussi une modification entre
son empreinte initiale et la création de la sauvegarde.

Les identifiants, clés de test, graines TOTP, sauvegardes et journaux détaillés
restent privés. Aucun enregistrement vidéo, trace Playwright ou capture d'écran
de secret n'est demandé. Les captures du panorama portent uniquement sur les
pages ordinaires de fixtures fictives. Le nettoyage final doit retirer les deux
bases, le cluster, les services et les fichiers temporaires, ainsi que les
trois fichiers de sauvegarde dont les chemins sont enregistrés privément.

## 1. Smoke canonique sur serveur réel

La [configuration dédiée](playwright.config.cjs) exécute le
[smoke du dépôt](../../../../apps/web/e2e/admin-smoke.spec.ts), avec un seul
worker et sans reprise automatique. Le scénario comporte plusieurs parcours :
authentification et inscription MFA obligatoire, accueil, navigation rapide au
clavier, brouillons/conflits des paramètres et utilisateurs, reprise de création
d'un compte, synchronisation du profil personnel, cycle de vie et coordonnées
d'une Personne. Le chiffre de tests Playwright ne doit donc pas être présenté
comme autant de pages ou de contrôles indépendants.

Les parcours authentification, Utilisateurs, profil personnel et Personnes
utilisent les routes, cookies, CSRF, services, audit et PostgreSQL réels.
Le bloc Paramètres intercepte GET/PUT pour provoquer conflits et erreurs : ses
écritures ne sont pas réelles. Certaines réponses Utilisateurs sont délibérément
retenues ou interrompues après exécution du serveur pour exercer les reprises.
Cela ne constitue pas une panne réelle de l'infrastructure. Le smoke est
modifiant, limité à ses données fictives.

**Résultat : 1/1 réussi, exit 0**,
[preuve et couverture](preuves/smoke.json). Le dernier bloc vérifie la
suppression 204, le tombstone SQL, le retour au Répertoire et l'absence de la
fiche en base. Les anciens sélecteurs et attentes de transport du banc ont été
actualisés, sans changement produit pour les faire passer. La
[qualification Échap](../client/preuves/confirmation-qualification-apres.json)
attend la fin des animations réelles avant un second geste ; deux cycles passent
à 390 et 1 280 px, avec focus et brouillon conservés.

## 2. Panorama navigateur des pages actives

[pages.cjs](pages.cjs) utilise [auth.cjs](auth.cjs) pour une authentification
réelle par mot de passe et TOTP. Si le smoke a déjà inscrit le compte fictif,
le helper récupère sa graine uniquement avec la clé éphémère de cette base
isolée ; cette lecture prépare le code TOTP, elle ne remplace pas la connexion
par une session SQL fabriquée. Un fichier TOTP privé mis en cache doit être
rafraîchi si la fixture est réinscrite entre deux exécutions.

Le panorama exécuté couvre :

- connexion anonyme et refus API ; dix pages connectées à 320, 768 et 1440 px
  (accueil, Mon compte, les trois pages Personnes, les trois pages Utilisateurs,
  paramètres et feuille de route) ;
- un seul `main`, un titre `h1` attendu et visible, fin des états occupés,
  absence de débordement horizontal et captures ciblées ;
- alias, route inconnue, ressources absentes, liveness/readiness, absence
  d'erreurs JavaScript non interceptées ;
- compte limité à la lecture des Personnes, véritable MFA, absence de lien de
  création, refus API puis retrait du droit et écran d'accès refusé.

Un complément HTTP Paramètres est également réussi : augmentation isolée d'un
jour, refus CSRF 403, succès PUT 200 avec valeur et audit réellement persistés,
puis version périmée 409 sans effet. Il complète les réponses interceptées du
smoke et prépare une ligne `SystemSetting` non vide pour la restauration.
Cette ligne figure dans la restauration réelle.

Une navigation charge chaque page, puis le banc redimensionne cette même page
aux trois largeurs. Il ne multiplie pas les rechargements pour chaque taille.
Si le seuil readiness de 12 appels/minute est atteint, il attend le
`Retry-After` réel dans une borne vérifiée ; il ne modifie pas le limiteur.
Les compteurs et cette attente sont conservés dans les observations.

**Résultat : [14/14 scénarios réussis](preuves/pages.json)** dans Chromium
149.0.7827.55, avec zéro erreur JavaScript non interceptée sur le parcours des
dix pages connectées. Les attentes readiness observées sont de 12 et 57 secondes.
Un titre attendu évite de compter un simple écran d'erreur comme la page métier.
Les [13 captures inspectées](preuves/visuel.json), dix à 1 440 px et trois à
320 px, ne montrent aucune anomalie manifeste. Le contrôle visuel reste un
échantillon Chromium : ce n'est ni un audit exhaustif de chaque champ, ni une
certification d'accessibilité ou un passage Safari/Firefox.

## 3. Sauvegarde signée et restauration réelle

[restore.ts](restore.ts) appelle le
[producteur de sauvegarde](../../../../packages/database/scripts/database-backup.ts)
et la véritable
[CLI de restauration](../../../../packages/database/scripts/restore-database.ts).
Il utilise le format courant v9 et une paire Ed25519 éphémère. Les processus
de restauration ne reçoivent aucune clé privée de signature utilisable. Le
checksum attendu et l'identifiant de sauvegarde sont transmis explicitement.

Quatre contrôles sont réussis :

1. Vérification signée `--dry-run`, identité et compteurs exacts, aucune écriture.
2. Refus sans clé publique : code de sortie 1 **et** motif précis de clé Ed25519
   manquante/invalide ; cible inchangée. Un crash ou un délai dépassé ne suffit pas.
3. Restauration confirmée dans la cible vide, compteurs CLI exacts et empreintes
   par table identiques à la source, y compris les colonnes chiffrées.
4. Refus d'une deuxième restauration : code 1 **et** liste exacte des tables
   non vides ; aucune écriture supplémentaire.

Les empreintes portent sur les lignes ordonnées des 19 tables du contrat de
sauvegarde, pas sur un export de la structure PostgreSQL ni sur
`_prisma_migrations`. Les mêmes migrations sont un prérequis des deux bases.
Comparer le texte chiffré ne démontre pas à lui seul son déchiffrement après
remise en service ; le banc ne reconnecte pas l'application sur la cible
restaurée. Les données sont fictives et la taille n'est pas représentative
d'une production. Aucun objectif RPO/RTO, archivage hors site, rotation
opérationnelle des clés ou réconciliation juridique après restauration n'est
qualifié ici.

**Résultat : [4/4 contrôles réussis](preuves/restauration.json)**, avec
`completed: true`. Le jeu restauré contient notamment 20 comptes, 120 personnes,
un réglage, 164 audits et 232 changements de champs ; les 19 tables du contrat
sont comparées, y compris celles qui sont vides.

## Contrôles complémentaires et clôture

Le [résumé de la suite complète](preuves/tests.json) est une preuve distincte :
1 482 tests réussis, aucun ignoré, dont 218 cas PostgreSQL. Il ne faut pas y
additionner une seconde fois les suites ciblées des sous-dossiers serveur.
La compilation, les budgets, les mesures de listes et les limites de la revue
sont consolidés dans le
[rapport unique](../../AUDIT_CLOTURE_SOCLE_2026-10-12.md).

Les trois fichiers de sauvegarde bruts et les deux répertoires temporaires de
performance ont été supprimés après contrôle de leurs chemins ; Next 3132 est
arrêté : [trace du nettoyage racine](preuves/nettoyage-root.json). Le nettoyage
du cluster de onze bases, du marqueur, des clés et de l'environnement privé est
[terminé et vérifié](preuves/nettoyage-environnement.json) ; les ports 3132 et
54663 sont libres. La clôture
autorise la poursuite du développement métier ; les conditions du déploiement
restent à qualifier dans leur environnement réel.
