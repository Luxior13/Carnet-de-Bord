# Suivi — Connexion

## État courant — 11 octobre 2026

- Route `/login`, entrée publique vers l’espace privé Noctambule.
- [Page](../../../apps/web/src/app/login/page.tsx) et
  [tests de connexion](../../../apps/web/src/__tests__/login-route.test.ts).
- Parcours d’identification, mot de passe et MFA ; compte Personne et compte
  Utilisateur restent distincts. Le rôle métier ne se déduit pas d’un login.
- Les règles d’accès appartiennent à [PERMISSIONS](../../references/PERMISSIONS.md)
  et les secrets/configurations à [OPERATIONS](../../references/OPERATIONS.md).

## Décisions courantes — 11 octobre 2026

- Surfaces et arrondis alignés sur le design system ; le formulaire public conserve
  sa composition centrée. Focus placé sur l’identifiant à l’entrée de cette étape.
- Aucun identifiant précédent n’est mémorisé ou réinjecté par l’application dans
  `localStorage`. Le nettoyage des anciennes clés est facultatif : un stockage
  bloqué ne doit pas empêcher la connexion. L’exception existante permettant le
  gestionnaire de mots de passe sur les champs d’authentification est conservée.
- Verrou immédiat contre les doubles soumissions des identifiants et du défi MFA.
  Les dialogues partagés de configuration et de vérification MFA appliquent le
  même verrou et ignorent leurs réponses après démontage.
- Les erreurs restent dans l’étape concernée ; une destination externe dans
  `next` ne devient pas une redirection autorisée.

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
| AUTH-01 | Parcours complet avec compte, MFA et session non exercé lors de la cartographie | Rejouer succès, refus, expiration et reprise avec comptes dédiés avant conclusion d’authentification complète | À attribuer / à vérifier |
| AUTH-02 | Lecteur d’écran et appareil mobile physique non vérifiés | Contrôler lors d’une revue d’accessibilité du parcours | À attribuer / à vérifier |
