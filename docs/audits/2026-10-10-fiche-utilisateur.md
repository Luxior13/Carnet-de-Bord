# Audit de la fiche utilisateur — 10 octobre 2026

## Conclusion et périmètre

**USR-D01 à USR-D08 corrigés et vérifiés ; synthèse USR-D09 compactée.**
La demande suivante « ok go corriger » a autorisé l'implémentation et la
[validation des corrections](#validation-des-corrections). Les observations
initiales ci-dessous restent historiques. Le style conserve les références du
Répertoire et de la liste Utilisateurs. Les contrôles ciblés ne valent pas audit
de sécurité ou d'accessibilité exhaustif.

Demande : poursuivre l'analyse sur `/systeme/utilisateurs/[id]`, après la création.
La passe initiale modifiait uniquement la documentation et ses preuves. La passe
de correction modifie également la fiche et sa garde de navigation partagée.
Les corrections antérieures de liste et de création restent distinctes.

- État audité : branche `main`, commit
  `dbf07768ac91000b039d95ab8fdcb20ad2ad9fe7`, arbre de travail propre au départ.
- Sections actives : Profil, Autorisations administratives, Compte personnel
  et Sécurité ; contexte de retour, synthèse et dialogues associés.
- Sources principales : [orchestrateur de fiche](../../apps/web/src/components/users/UserDetailPage.tsx),
  [profil](../../apps/web/src/components/users/user-detail/UserProfileTab.tsx),
  [sécurité](../../apps/web/src/components/users/user-detail/UserSecurityTab.tsx),
  [synthèse](../../apps/web/src/components/users/UserOverviewCard.tsx),
  [projection des données](../../apps/web/src/features/users/server/user-detail.service.ts),
  [API de fiche](../../apps/web/src/app/api/users/[id]/route.ts).
- Références : [suivi courant](../pages/systeme/utilisateurs/README.md),
  [design system](../design/README.md),
  [permissions](../domaines/permissions.md), [méthode d'audit](../methode/audit.md).
- L'onglet Activité reste retiré conformément à la décision courante ; son code
  dormant et l'export ne sont pas réactivés ni validés par les essais de fiche.

## Environnement et nature des preuves initiales

Next 15.5.23 en build de production, React 19.1.8, Prisma 6.19.3, PostgreSQL 17,
Chromium via Playwright 1.61.1, Windows. Serveur Next local sur le port 4388 et
cluster PostgreSQL jetable sur 55439, base `users_detail_test`. Les migrations du
dépôt sont appliquées à cette seule base. Aucun compte ni donnée de la base de
l'application n'est utilisé.

Jeu de départ : quatre acteurs fictifs (racine, administrateur, lecteur avec
`users:view`, utilisateur sans droit de consultation) et neuf comptes cibles.
Les sessions et les preuves MFA récentes sont **préparées dans la fixture**.
Les requêtes sont ensuite authentifiées par le serveur réel. Cela ne démontre
pas le parcours de connexion ni la saisie d'un code MFA en navigateur.

Les mutations et lectures sont réelles. Deux perturbations sont injectées à la
frontière réseau : retenir une réponse PATCH après son écriture réelle ; couper
la réponse de réinitialisation après son écriture réelle. Les captures ne
contiennent que des identités fictives ; le secret temporaire est occulté.

Les [observations structurées](utilisateur-detail-2026-10-10/observations.json)
portent les valeurs, réponses et noms des scénarios. Les serveurs de test ont été
arrêtés ; le banc, les secrets de fixture et le cluster jetable ont été supprimés.
Les scénarios ci-dessous décrivent leurs préconditions
et étapes pour une reproduction dans un environnement de test équivalent.

## Constats initiaux

Tous les points ci-dessous étaient ouverts à l'issue de l'analyse. Leur état
courant figure dans la validation des corrections en fin de rapport. Le rapport
reste propriétaire de cette liste ; le suivi courant renvoie ici.

### USR-D01 — P2 — Un état de sécurité masqué devient « À jour »

- Reproduction : consulter une cible avec `mustChangePassword=true` depuis un
  compte disposant seulement de `users:view`.
- Attendu : signaler que l'information est masquée, ou omettre cet indicateur.
- Observé : le GET masque correctement les champs (`securityDetailsVisible=false`,
  `mustChangePassword=false`), mais la synthèse affiche « Mot de passe — À jour ».
  La valeur réelle reste « à changer ». Il s'agit d'une information trompeuse,
  pas d'une fuite de la valeur réelle.
- Preuves : scénario `hidden-security`, [capture](utilisateur-detail-2026-10-10/securite-masquee.png).
  `UserOverviewCard.tsx`, vers la ligne 61, interprète le booléen sans consulter
  le marqueur de visibilité fourni par `mapUserForActor`.
- Action : distinguer masqué, connu et indisponible ; vérifier les autres statuts
  du volet Sécurité avec les combinaisons de droits pertinentes.

### USR-D02 — P1 — Une réponse réinitialise des saisies encore en cours

Deux reproductions confirment le même défaut de conservation des brouillons :

1. Saisir « Première saisie », enregistrer et retenir la réponse après le commit.
   Le champ reste modifiable ; saisir « Seconde saisie », puis libérer la réponse.
   Le formulaire revient à « Première saisie » et ne signale plus le second
   brouillon. La base contient correctement la première saisie.
2. Dans Sécurité, désactiver le commutateur sans enregistrer, puis réinitialiser
   le mot de passe. Le rechargement de fond remet le commutateur sur actif et
   efface la modification d'état sans confirmation. La base reste active.

- Attendu : verrouiller les champs concernés pendant leur enregistrement, ou
  préserver les modifications postérieures ; une actualisation de sécurité ne
  doit pas remplacer silencieusement un brouillon d'une autre action.
- Preuves : `save-in-flight`, `security-reset-draft`,
  [saisie remplacée](utilisateur-detail-2026-10-10/saisie-ecrasee.png),
  [état après réinitialisation](utilisateur-detail-2026-10-10/securite-reinitialisee.png).
- Sources : champs désactivés selon les seuls droits dans `UserProfileTab.tsx`
  vers 230/258/300/348 ; remplacement global dans `syncUserState` vers 1293 et
  `fetchUser` vers 727 de `UserDetailPage.tsx`.
- Action : isoler état enregistré et brouillon, borner la synchronisation au
  résultat de l'action et protéger la soumission en cours. Rejouer les deux cas.

### USR-D03 — P2 — Le bouton Précédent du navigateur perd le brouillon

- Reproduction : liste → fiche par son lien → modifier le prénom → Précédent
  du navigateur → rouvrir la fiche.
- Attendu : avertissement avant de quitter une fiche modifiée, comme pour les
  autres chemins de navigation déjà protégés.
- Observé : retour immédiat à la liste, aucun dialogue natif ou applicatif ; le
  prénom revient à « Camille » à la réouverture.
- Preuve : `browser-back`. Les gardes de `UserDetailPage.tsx`, vers 1087–1175,
  couvrent notamment les clics et `beforeunload`, sans traiter ce retour interne.
- Action : reprendre la garde de navigation partagée en conservant le contexte
  de retour à la liste ; tester retour/avance et annulation du départ.

### USR-D04 — P2 — Validation du contact divergente et erreur serveur perdue

- Reproduction : saisir `a..b@example.test` puis enregistrer le profil.
- Attendu : une validation cohérente avec le serveur et une erreur persistante,
  associée au champ, permettant de corriger la saisie.
- Observé : `aria-invalid=false`, PATCH 400 avec
  `details.contactEmail=["Email invalide"]`, puis toujours `aria-invalid=false`
  et aucune erreur sous le champ. Le toast générique indique « Données invalides ».
- Preuve : `email-validation`, [capture](utilisateur-detail-2026-10-10/email-refuse.png).
  Validation locale dans `user-detail-page.helpers.ts` / `profileErrors` ;
  `handleSaveProfile` ignore les détails de champ retournés par l'API.
- Action : partager la validation du contact et restituer les erreurs serveur
  au champ avec focus utile ; conserver le brouillon et un retour persistant.
  Le correctif déjà livré à la création ne couvre pas cette fiche.

### USR-D05 — P2 — Conflit détecté, mais sans reprise dans la fiche

- Reproduction : ouvrir la même cible dans deux contextes ; enregistrer « Admin A »,
  puis tenter d'enregistrer « Admin B » depuis l'ancienne version.
- Attendu : conserver le brouillon, expliquer le conflit et proposer de charger
  l'état actuel pour reprendre la modification.
- Observé : le serveur protège correctement les données avec 409 et demande de
  recharger. Le seul retour est un toast ; une deuxième tentative renvoie encore
  409. Le brouillon B reste présent mais la fiche n'offre pas de reprise dédiée.
- Preuve : `conflict`, [capture](utilisateur-detail-2026-10-10/conflit.png).
  `expectedUpdatedAt` côté API fonctionne ; la gestion client des erreurs de
  mutation ne distingue pas le conflit.
- Action : erreur persistante et rechargement explicite avec traitement du
  brouillon, sans écrasement forcé de la version enregistrée par l'autre acteur.

### USR-D06 — P2 — Le secret temporaire peut disparaître avant sa remise

- Reproduction : réinitialiser le mot de passe ; sans copier ni confirmer sa
  remise, ouvrir Profil puis revenir dans Sécurité.
- Attendu : permettre de terminer la remise et avertir avant un effacement
  provoqué par la navigation. Le secret ne doit pas être stocké durablement.
- Observé : un secret est affiché après le succès, puis aucun après le retour,
  sans confirmation de sortie. Le code l'efface également après deux minutes,
  sans annoncer cette durée dans le bloc affiché.
- Preuve : partie remise de `security-reset-draft` ; effets `setTempPassword`
  de `UserDetailPage.tsx` vers 1068–1083. Le délai de deux minutes est constaté
  dans le code, **pas attendu en temps réel dans le test**.
- Action : reprendre le parcours de remise explicite déjà adopté à la création,
  avec expiration annoncée et garde adaptée, tout en conservant l'effacement
  en mémoire et l'absence de stockage local du secret.

### USR-D07 — P1 — Une réponse perdue laisse croire que la réinitialisation a échoué

- Reproduction : laisser réussir le POST de réinitialisation et couper uniquement
  sa réponse au navigateur.
- Attendu : expliquer que l'issue est incertaine, vérifier l'état du compte et
  guider une nouvelle émission explicite si le secret n'a pas été reçu.
- Observé : toast « Erreur lors de la réinitialisation », aucun secret affiché.
  Pourtant le serveur a répondu 200 avant la coupure, `securityVersion` a
  augmenté, `mustChangePassword=true` et un audit `PASSWORD_RESET` existe.
  L'ancien accès a donc été modifié malgré le message générique.
- Preuve : `lost-reset-response`, [capture](utilisateur-detail-2026-10-10/reponse-perdue.png).
  `handleResetPassword` utilise le même message pour cette coupure et un échec
  avant écriture. La mutation serveur est réelle, la coupure est injectée.
- Action : prévoir une reprise persistante sans rejouer automatiquement cette
  mutation ; distinguer échec certain et résultat inconnu. Ne pas tenter de
  récupérer un ancien secret à partir de son hash.

### USR-D08 — P2 — Annuler le départ au clavier perd le focus

- Reproduction : modifier le profil, focaliser « Sécurité », Entrée pour ouvrir
  « Quitter sans enregistrer ? », puis Échap.
- Attendu : conserver le brouillon et rendre le focus au lien déclencheur.
- Observé : le brouillon est conservé, mais `document.activeElement` est `BODY`
  après fermeture et attente de fin de transition. Le repère de clavier est perdu.
- Preuve : `keyboard-and-unknown`. La fermeture manuelle du dialogue appelle
  `handleCancelPendingNavigation` sans restitution ciblée du focus.
- Action : mémoriser le déclencheur et restaurer un focus pertinent après
  annulation ; vérifier aussi la confirmation et les liens de sidebar.

### USR-D09 — P2 — Suggestion : compacter la synthèse empilée

À 390 px, avec le nom court « Camille Exemple », la Vue d'ensemble mesure environ
210 px de haut et le premier champ commence vers 572 px. Les quatre informations
restent présentées en lignes sur toute la largeur à 1 440 px. À 1 920 px, la
synthèse passe correctement dans le rail latéral.

Preuves : `layout`, [nom court sur mobile](utilisateur-detail-2026-10-10/profil-court-390.png),
[profil à 1 440 px](utilisateur-detail-2026-10-10/profile-1440.png).
Les mesures proviennent du navigateur de test ; elles ne constituent pas une
mesure de performance. Proposition : grille compacte quand la synthèse est
empilée, comme les pages de référence, en gardant le rail aux grandes largeurs.
Il s'agit d'une amélioration de composition, pas d'un défaut de débordement.

## Résultats positifs et limites de l'analyse initiale

| Contrôle exécuté | Résultat et portée |
| --- | --- |
| Suite web, `bun run test` depuis `apps/web` | 84 fichiers réussis, 1 028 tests réussis ; 2 fichiers / 25 tests ignorés, suites PostgreSQL de recherche non configurées pour cette commande |
| Build de production via le CLI Next installé, environnement isolé | Compilation, ESLint et TypeScript réussis ; aucun déploiement |
| `bun run check:architecture` | Réussi avec les budgets et exceptions existants ; ne démontre pas l'absence de dette |
| `bun run check:performance` après ce build | Réussi ; artefacts de la fiche : 283 009 octets gzip selon le contrôleur ; aucune mesure de charge SQL ou de Web Vitals |
| Sauvegarde Profil | PATCH 200, prénom persisté et audit `USER_UPDATE` présents |
| Compte personnel | Retrait puis retour au rôle de `account:update_profile` persistés ; deux audits `PERMISSION_UPDATE`, permissions finales sans exception |
| Sessions | Session fictive visible, confirmation de révocation globale, DELETE 200 puis aucune session en base et état vide affiché |
| Suppression | Confirmation désactivée avant la saisie de l'identifiant ; DELETE 200 du compte fictif inactif, retour à la liste, tombstone anonymisée, audit et réservation de l'identifiant conservés |
| Droits de lecture | Lecteur : seul Profil, champs non modifiables ; tiers administrateur : identité racine masquée ; sans `users:view` : GET 403 et écran refusé |
| Droits de mutation | Modification du profil par lecteur : 403 ; reset de la racine par tiers admin : 403 ; promotion d'une cible sans MFA : 409 ; reset sans preuve récente : 403 |
| Ressource absente | État « Utilisateur introuvable » et lien de retour à la liste |
| Responsive | Profil, Autorisations et Sécurité chargés : aucun débordement horizontal global à 320, 390, 768, 1 024, 1 120, 1 440 et 1 920 px ; un seul h1 ; noms longs inclus |
| Clavier ciblé | Ouverture du dialogue de départ par Entrée, Échap conserve la saisie ; retour du focus défaillant, USR-D08 |

Les premières captures de Sécurité avaient saisi un squelette de chargement.
Elles ont été remplacées après attente explicite de la section ; seules les
mesures corrigées figurent dans les observations consolidées. Deux sélecteurs
et le nom d'une action d'audit ont également été corrigés dans le banc ; ces
erreurs de test ne sont pas comptées comme défauts du produit.

Restent **non exécutés en navigateur réel dans cette passe** : connexion et
step-up par mot de passe/TOTP, réinitialisation MFA avec appareil perdu,
attribution et retrait de toutes les combinaisons de permissions administratives,
révocation individuelle, changement d'identifiant et retrait du contact.
Le code et les tests existants couvrent une partie de ces branches, ce qui ne
remplace pas leur exécution avec base et navigateur. La purge après changement
de droits pendant une fiche ouverte et les erreurs de relecture des sessions
méritent aussi un scénario dédié : aucune conformité n'est déduite de la liste.

Pas de lecteur d'écran, Safari, appareil tactile physique, mesure exhaustive de
contraste, charge, restauration de sauvegarde ou test d'intrusion. Les preuves
récentes préparées pour les fixtures ne valident pas l'authentification complète.

## Sélection des sujets de revue initiale

| Sujets | Traitement de cette passe |
| --- | --- |
| Q01, Q02 | Besoin de gestion d'un compte et parcours de fiche examinés ; retour navigateur et garde défaillants documentés |
| Q03, Q04 | Références visuelles, trois sections à sept largeurs, clavier ciblé ; suggestion de synthèse et défaut de focus ; accessibilité complète ouverte |
| Q05 | Liste des sessions et états vide/refus examinés ; révocation globale réelle ; grandes listes et erreurs après succès non exercées |
| Q06, Q07 | Profil, autorisations personnelles, statut, validation, enregistrement lent, conflit et retours d'erreur examinés ; défauts ci-dessus |
| Q08 | Non applicable : pas de notification différée ou de nouveau destinataire dans le besoin ; la remise du secret est un retour d'action |
| Q09, Q10, Q11 | Sensibles : projection selon acteur, comptes protégés, secrets, sessions et droits examinés ; essais ciblés sans certification exhaustive |
| Q12 | Modèle User, versions, sessions, identifiants réservés et anonymisation examinés ; migrations appliquées sur la seule base jetable |
| Q13 | Hors impact : aucun changement de schéma ou migration produit |
| Q14, Q15 | Écritures réelles, conflit optimiste et réponse perdue ; audits vérifiés pour les actions citées ; rollback sur panne d'audit non rejoué |
| Q16 | Suppression irréversible d'une cible inactive vérifiée dans la fixture ; réservations conservées |
| Q17, Q18, Q19 | Build et budgets mesurés ; orchestration et synchronisation de formulaires examinées ; pas de goulot justifiant un cache ou un nouvel index |
| Q20 | Hors impact : avatar généré existant, aucun téléversement ou pièce jointe |
| Q21 | Hors périmètre actif : historique et export dormants conservés ; pas d'import/export dans les sections testées |
| Q22 | Dates, version de fiche et durée de secret relues ; minuteur de deux minutes non attendu en essai réel |
| Q23 | Non applicable : aucune intégration, tâche ou service tiers nécessaire à ce parcours |
| Q24, Q25 | Hors impact : compte technique distinct des fiches Personnes, mandats, équipes et relations datées |
| Q26 | Non applicable : aucune opération financière ou contractuelle |
| Q27 | Tests, navigateur et SQL isolés distingués ; preuves et limites consignées |
| Q28, Q29 | Reprise après réponse perdue et irréversibilité examinées ; aucune modification d'exploitation et aucun exercice de restauration |
| Q30 | Aucun manifeste, lockfile ou secret applicatif modifié ; rapport, suivi et index mis à jour, contrôle documentaire exécuté |

## Pièces visuelles complémentaires

[Autorisations à 390 px](utilisateur-detail-2026-10-10/access-390.png) ·
[Autorisations à 1 440 px](utilisateur-detail-2026-10-10/access-1440.png) ·
[Sécurité à 390 px](utilisateur-detail-2026-10-10/security-390.png) ·
[Sécurité à 1 440 px](utilisateur-detail-2026-10-10/security-1440.png) ·
[Profil avec nom long à 390 px](utilisateur-detail-2026-10-10/profile-390.png).

Les captures montrent la fenêtre et son conteneur de défilement à l'instant
observé ; elles ne prétendent pas montrer toutes les lignes des longues sections.

## Validation des corrections

Passe autorisée le 10 octobre 2026 par « ok go corriger ». Niveau sensible pour
les secrets, la concurrence et les suites d'une réponse perdue. Les décisions
durables sont inscrites dans le [suivi de la fiche](../pages/systeme/utilisateurs/README.md#fiche-utilisateur-systemeutilisateursid--10-octobre-2026).
Aucune migration produit, dépendance ou permission ajoutée.

La sélection précédente est conservée : Q01–Q07, Q09–Q11, Q14, Q17–Q19,
Q22, Q27 et Q30 portent directement les corrections ; Q12/Q15/Q16 sont
contrôlés par les lectures, audits et la suppression fictive. Les autres sujets
gardent leur classement et leur justification. Q22 inclut désormais une
expiration exécutée avec l'horloge navigateur accélérée. Les notifications,
l'historique dormant, l'export et les modèles métier ne sont pas étendus.

### État des constats

| Point | État courant et preuve de clôture |
| --- | --- |
| USR-D01 | **Corrigé et vérifié** : synthèse « Masqué » pour le lecteur ; les statuts détaillés tiennent compte du marqueur de visibilité. Scénario `masked-security`. |
| USR-D02 | **Corrigé et vérifié** : champs verrouillés pendant l'enregistrement, verrou synchrone contre la double soumission, fusion des réponses avec le brouillon et la section soumise. PATCH réel retenu après commit ; statut non enregistré conservé après reset. Huit tests de validation/fusion complètent ces essais. |
| USR-D03 | **Corrigé et vérifié** : garde partagée, Précédent annulé puis confirmé, brouillon conservé ou abandonné selon le choix ; changements de section rejoués. Scénario `draft-navigation-validation`. |
| USR-D04 | **Corrigé et vérifié** : schéma de validation partagé avec la création, erreurs serveur rattachées aux champs, focus et message persistant. Email invalide refusé avant envoi ; réponse 400 de détails de champ simulée pour vérifier sa restitution. |
| USR-D05 | **Corrigé et vérifié** : conflit persistant, nouvel enregistrement suspendu jusqu'à « Actualiser et conserver ma saisie ». Deux pages réelles : réponses 200 / 409 / 200, brouillon B conservé et finalement persisté. |
| USR-D06 | **Corrigé et vérifié** : durée d'affichage annoncée, repère de conservation avant masquage volontaire, garde avant départ et retour explicite après expiration. Secret en mémoire ; délai de 120 000 ms exécuté en avançant l'horloge de 120 001 ms, sans attendre deux minutes réelles. |
| USR-D07 | **Corrigé et vérifié** : réponse perdue après écriture réelle, état incertain persistant, vérification du compte puis nouvelle émission confirmée ; aucun rejeu automatique. Deux mutations et deux nouveaux audits pour ce scénario. |
| USR-D08 | **Corrigé et vérifié** : Échap ferme le dialogue, conserve la saisie et rend le focus au lien Sécurité déclencheur. |
| USR-D09 | **Amélioration livrée et vérifiée** : grille à deux colonnes, quatre dès 48 rem, synthèse verticale dans le rail dès 118 rem. À 390 px, hauteur mesurée de 148,53 px, contre 209,88 px initialement. |

Points clos dans cette passe de correction. Déclencheurs de nouvelle vérification :
modification des formulaires, de leur synchronisation, du routage partagé, du
contrat de reset ou de la composition de synthèse. Les limites ci-dessous restent
distinctes de ces défauts corrigés.

### Banc et résultats

Nouveau banc Next de production, Chromium et PostgreSQL 17 jetable, mêmes
versions qu'à l'analyse. Les 51 migrations sont appliquées à une base isolée,
avec quatre acteurs et douze cibles fictives au départ. Le parcours de création
ajoute ses propres comptes fictifs. Sessions préparées ; **saisie réelle du mot
de passe administrateur et d'un TOTP** dans le scénario `real-step-up`, après
retrait des preuves récentes de la fixture. La première tentative est refusée,
puis l'action réussit après le défi.

Les lectures et mutations sont réelles, sauf le retour 400 injecté du scénario
`field-error`. Les perturbations de réponse PATCH/reset interviennent après
l'écriture réelle. Le délai du secret utilise l'horloge Playwright. Les comptes
et secrets de l'application ne sont pas utilisés. Les captures masquent le secret.
Après les contrôles, le serveur Next et le cluster de test ont été arrêtés ;
le banc temporaire, la base jetable et les secrets de fixture ont été supprimés.

| Contrôle exécuté après correction | Résultat et portée |
| --- | --- |
| Suite web | **85 fichiers / 1 036 tests réussis ; 2 fichiers / 25 tests ignorés**, suites PostgreSQL de recherche sans leurs variables dédiées pour Vitest |
| TypeScript et lint | `bun run typecheck` et lint web réussis, sans avertissement final |
| Build de production | Build Next installé réussi, contrôles lint/types inclus ; aucun déploiement |
| Architecture et performance | Budgets respectés ; fiche à **306 410 octets gzip** selon le contrôleur, contre 283 009 avant correction ; ce budget n'est pas une mesure de Web Vitals |
| Navigateur avec serveur/base réels | Onze scénarios réussis : brouillon/navigation/validation, conflit, visibilité, erreurs de champ, responsive, remise, réponse perdue, expiration, step-up, politique/suppression, création |
| Responsive | Profil, Autorisations et Sécurité effectivement chargés à 320, 390, 768, 1 024, 1 120, 1 440 et 1 920 px : aucun débordement horizontal global ; un h1 ; noms longs inclus |
| Régressions métier | Politique personnelle enregistrée, suppression fictive avec confirmation d'identifiant et anonymisation, parcours existant de création/remise/réponse perdue rejoué |

Preuves consolidées : [résultats](utilisateur-detail-2026-10-10/corrections/results.json).
Régressions durables : [fusion et validation](../../apps/web/src/__tests__/user-detail-draft.test.ts),
[parcours navigateur de fiche](../../apps/web/e2e/user-detail.checks.ts),
intégrés au smoke. Ces parcours et le contrôle existant de création ont été
exécutés séparément sur ce banc ; **le smoke complet n'a pas été rejoué**.

La navigation native a révélé pendant l'implémentation une URL mise à jour sans
changement de section. La correction utilise `replaceState(null, '', href)` afin
que Next synchronise ses paramètres ; les trois sections ont ensuite été
rejouées. Le banc a aussi corrigé un sélecteur d'alerte ambigu et rendu les noms
de tests uniques pour permettre les répétitions. Une erreur de lint a été
corrigée avant le build final. Ces tentatives ne sont pas présentées comme des
validations réussies ; le fichier consolidé porte les dernières exécutions.

### Captures après correction

[Profil compact à 390 px](utilisateur-detail-2026-10-10/corrections/profil-court-390.png) ·
[Profil à 1 440 px](utilisateur-detail-2026-10-10/corrections/profile-1440.png) ·
[Autorisations à 390 px](utilisateur-detail-2026-10-10/corrections/access-390.png) ·
[Sécurité à 390 px](utilisateur-detail-2026-10-10/corrections/security-390.png) ·
[Erreur de champ](utilisateur-detail-2026-10-10/corrections/erreur-champ.png) ·
[Reprise après réponse perdue](utilisateur-detail-2026-10-10/corrections/reponse-perdue-reprise.png) ·
[Remise du secret occulté](utilisateur-detail-2026-10-10/corrections/nouveau-secret.png).

### Limites restantes

Connexion complète, réinitialisation MFA pour appareil perdu, révocation
individuelle, changement d'identifiant et retrait de contact non rejoués dans
cette passe. Le défi mot de passe/TOTP de réinitialisation est désormais exercé,
mais pas toutes les combinaisons de droits. La révocation de droits pendant une
fiche déjà ouverte et les pannes de relecture des sessions demandent encore des
scénarios dédiés. Aucun succès de la liste ou de la création ne les remplace.

Lecteur d'écran, Safari, appareils physiques, contraste exhaustif et charge SQL
restent non exécutés. L'effacement d'affichage après deux minutes n'annule pas
la validité du mot de passe côté serveur. Les preuves initiales et leurs limites
ne sont pas réécrites rétroactivement.
