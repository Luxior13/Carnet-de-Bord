# Suivi — Connexion

## État courant — clôture du socle du 13 octobre 2026

La [revue finale du socle](../../audits/AUDIT_CLOTURE_SOCLE_2026-10-12.md) est
terminée au périmètre livré, pour poursuivre le développement métier. Ses
preuves et limites ne constituent pas une qualification de déploiement.

La connexion et l’inscription MFA sont incluses dans les parcours réels. Les
échéances et la validité de la session source sont aussi contrôlées après
attente des verrous SQL ; les preuves navigateur et serveur gardent leurs
portées distinctes. AUTH-02 reste une limite de recette sur lecteur d’écran et
appareil physique.

Les décisions et preuves datées ci-dessous restent conservées. Une nouvelle
revue répond à un changement, un défaut constaté ou une règle nouvelle.

## État courant — 12 octobre 2026

- Route `/login`, entrée publique vers l’espace privé Noctambule.
- [Page](../../../apps/web/src/app/login/page.tsx) et
  [tests de connexion](../../../apps/web/src/__tests__/login-route.test.ts).
- Parcours d’identification, mot de passe et MFA ; compte Personne et compte
  Utilisateur restent distincts. Le rôle métier ne se déduit pas d’un login.
- Les règles d’accès appartiennent à [PERMISSIONS](../../references/PERMISSIONS.md)
  et les secrets/configurations à [OPERATIONS](../../references/OPERATIONS.md).
- Revue complète du 12 octobre : attentes, réponses tardives, reprise MFA,
  collage et expiration de configuration corrigés. **30 parcours client,
  17 tests PostgreSQL et 12 parcours HTTP/MFA réels réussis**.
  Suite web, types, build et budgets vérifiés ;
  voir le [rapport et ses limites](../../audits/AUDIT_CONNEXION_2026-10-12.md).

## Décisions courantes — complétées le 12 octobre 2026

- Surfaces et arrondis alignés sur le design system ; le formulaire public conserve
  sa composition centrée. Focus placé sur l’identifiant à l’entrée de cette étape.
- Aucun identifiant précédent n’est mémorisé ou réinjecté par l’application dans
  `localStorage`. Le nettoyage des anciennes clés est facultatif : un stockage
  bloqué ne doit pas empêcher la connexion. L'autocomplétion et les propositions
  des gestionnaires de mots de passe sont désactivées côté site, y compris sur
  l'identifiant, le mot de passe et le MFA ; aucune exception d'authentification.
- Verrou immédiat contre les doubles soumissions des identifiants et du défi MFA.
  Les dialogues partagés de configuration et de vérification MFA appliquent le
  même verrou et ignorent leurs réponses après démontage.
- Les erreurs restent dans l’étape concernée ; une destination externe dans
  `next` ne devient pas une redirection autorisée.
- Les opérations de connexion, vérification et retour sont limitées à
  30 secondes ; les lectures de session à 15 secondes. La page annule sa
  requête au démontage et ignore les réponses anciennes ; le contexte
  contrôle aussi leur génération avant d'appliquer une session ou une erreur.
  Cela ne garantit pas l'annulation d'une mutation déjà exécutée au serveur.
- Un refus focalise son message après réactivation de la saisie ; Tab reprend
  le champ. Passer du TOTP au code de secours efface la saisie précédente et
  refocalise le champ. Un code complet collé est normalisé avant la limite
  native, notamment lorsqu'il contient des espaces.
- Une vérification MFA incertaine bloque un nouveau POST. « Vérifier la
  session » effectue seulement un GET ; si aucune session n'est retrouvée,
  « Recommencer la connexion » reprend les identifiants. Le code précédent
  peut être consommé : utiliser un nouveau TOTP ou un autre code de secours.
- Une configuration expirée retire QR, clé et code, puis revient à une
  préparation explicitement autorisée, y compris sans bouton Annuler. Une
  confirmation incertaine ne rejoue pas le PUT et retire aussi le secret ;
  recharger permet de relire l'état du compte.
- Les secrets et codes restent dans l'étape utile, sans persistance navigateur
  ajoutée. Copier ou télécharger les codes est explicite ; leur conservation
  doit être confirmée avant de terminer.
- Le serveur recontrôle les échéances des défis et de la session source après
  l'attente du verrou utilisateur. Audit, consommation de preuve et création
  de session restent transactionnels ; aucun schéma nouveau n'est nécessaire.

Complément du 12 octobre, découvert pendant la
[revue de l'accueil — ACC-06](../../audits/AUDIT_ACCUEIL_2026-10-12.md) :
la réponse MFA doit porter la version du profil après la création de session,
qui actualise aussi la dernière connexion. La projection sûre est obtenue
dans cette transaction ; elle ne réutilise plus l'instantané du défi.
Le premier enregistrement du profil réussit ainsi sans conflit artificiel.
Régression de route/service et parcours Next/PostgreSQL vérifiés ; cette preuve
complète l'audit Connexion précédent sans en réécrire les résultats datés.

## Questions pour une modification

Examiner Q01–Q04, Q06–Q07, Q09–Q11, Q14, Q27 et Q28 selon les effets ; Q30 si
configuration ou politique change. Un simple libellé garde un contrôle ciblé.

- Le retour après connexion est-il une destination interne autorisée ?
- Une erreur donne-t-elle une issue utile sans divulguer inutilement des comptes ?
- Le parcours mot de passe/MFA/reprise conserve-t-il une attente claire et un
  focus utilisable au clavier et sur petit écran ?
- Une répétition, expiration ou perte de réseau peut-elle laisser un état ambigu ?
- La limitation des essais et les protections serveur sont-elles toujours
  exercées, indépendamment de l’affichage du formulaire ?
- Les preuves d’audit et captures évitent-elles mot de passe, QR MFA et codes ?

## Vérifications et limites

La [passe du 12 octobre](../../audits/AUDIT_CONNEXION_2026-10-12.md) distingue
les composants/contexte réels avec HTTP simulé, les tests ciblés, les routes
sur PostgreSQL avec cookies/en-têtes simulés, puis les douze parcours avec
Next, MFA, cookies et base réels. Chaque banc précise ce qu'il prouve ; les
simulations ne sont pas présentées comme une authentification HTTP réelle.
Les preuves historiques ci-dessous restent datées.

Lors de la [cartographie du 10 octobre](../../audits/COMPREHENSION_PROJET_2026-10-10.md),
la page anonyme a répondu 200 sur le serveur local existant : rendu à 1 440 et
390 pixels, sans erreur JavaScript ni débordement horizontal observé. Les pages
privées testées redirigeaient vers la connexion et les API protégées testées
répondaient 401. Ces observations ne valident pas une connexion réussie avec MFA.

Le [contrôle du 11 octobre](../../audits/AUDIT_PAGES_RESTANTES_2026-10-11.md)
vérifie le rendu à quatre largeurs, puis les parcours à 390 et 1 440 px : stockage
indisponible, double soumission, défi refusé puis code de récupération accepté,
destination externe rejetée et configuration MFA. Composants réels, session et
API simulées : AUTH-01 reste ouvert pour l’authentification réelle.

| ID | Point | Suite / déclencheur | Responsable / état |
| --- | --- | --- | --- |
| AUTH-01 | Authentification réelle revue le 12 octobre : douze parcours Next/PostgreSQL avec cookies, MFA, refus, expiration et reprises ; trente client et dix-sept SQL en complément | Rejouer les parcours touchés lors d'une évolution du contrat d'authentification ; limites dans le rapport | Clos au périmètre testé le 12 octobre |
| AUTH-02 | Lecteur d’écran et appareil mobile physique non vérifiés | Contrôler lors d’une revue d’accessibilité du parcours | À attribuer / à vérifier |
| AUTH-03 à AUTH-08 | Attentes, résultat MFA incertain, collage, focus, configuration expirée et échéances après verrou corrigés ; preuves et limites détaillées dans le rapport | Rejouer les scénarios touchés lors d'une évolution de page, contexte, composants MFA ou création de session | Clos au périmètre testé le 12 octobre |

## Modales — revue transverse du 11 octobre 2026

Le flux MFA partagé attend désormais son annulation asynchrone, y compris le
retour aux identifiants. Les variantes obligatoires conservent leur fermeture
protégée. Le contrôle des composants modaux reste distinct du parcours réel de
connexion suivi dans AUTH-01.

[Décisions et questions communes](modales.md) ·
[Preuves et limites de l’audit](../../audits/AUDIT_MODALES_2026-10-11.md).
Cette passe ne clôt pas les contrôles d’intégration encore ouverts de la page.

## Autocomplétion — correction du 11 octobre 2026

Connexion, mots de passe et MFA suivent désormais la règle commune sans exception. Les anciens opt-ins ont été supprimés.

[Règle propriétaire](../../references/DESIGN_SYSTEM.md) ·
[Contrôles et limites des extensions](../../audits/AUDIT_AUTOCOMPLETION_2026-10-11.md).
La présence des attributs d’exclusion ne garantit pas le comportement d’une
extension installée chez l’utilisateur.
