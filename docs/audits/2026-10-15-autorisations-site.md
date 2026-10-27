# Autorisations des pages actuellement utilisables — 15 octobre 2026

Le corps initial décrit l'état **avant correction**. Après accord utilisateur,
les changements et nouvelles preuves figurent dans le
[complément de correction](#corrections-après-accord--15-octobre-2026).

## Demande et périmètre

Audit transverse demandé : examiner chaque autorisation de l'onglet
Autorisations, sa pertinence et son application sur tout le site existant.
Précision de l'utilisateur : « seulement ce qu'il y a actuellement sur le site ».
Les modules sans page utilisable, leurs besoins futurs et les choix historiques
ne servent donc pas à justifier des permissions dans cet audit.

État examiné : branche `main`, commit `bfef68a`, Windows, application locale.
Le dépôt était propre avant les sondes de cette passe. Aucune politique
d'autorisation ni donnée réelle n'est modifiée par cet audit. Les propositions
ci-dessous ne deviennent pas des décisions métier par leur seule rédaction.

| Pages actuelles | Fonctions examinées et contrôles associés |
| --- | --- |
| `/` | Accueil connecté, liens vers les pages autorisées |
| `/login` | Authentification et accès aux parcours de mot de passe/MFA ; pas de permission administrative à attribuer pour se connecter |
| `/mon-compte` | Profil, adresse de contact, mot de passe, MFA et sessions personnelles |
| `/membres/repertoire`, `/nouveau`, `/[id]` | Liste, recherche, création, identité, coordonnées, suppression et provenance des champs ; API `/api/personnes` et sous-ressources |
| `/systeme/utilisateurs`, `/nouveau`, `/[id]` | Liste, création, profil, autorisations administratives/personnelles, sécurité et sessions ; API `/api/users` et sous-ressources |
| `/systeme/parametres` | Consultation et modification de la conservation du journal ; API `/api/systeme/parametres` |
| `/systeme/feuille-de-route` | Consultation et filtres de cette page existante ; aucune autorisation proposée pour les chantiers qu'elle décrit |

Les liens de navigation, recherches de pages et compteurs sont des consommateurs
de ces mêmes droits. Les routes techniques de santé, télémétrie et authentification
ne constituent pas des capacités administratives supplémentaires.

Les quatre droits d'activité encore **affichés dans l'éditeur actuel**, sans
écran correspondant utilisable, sont examinés uniquement comme incohérence de
cet éditeur. Leur API encore joignable est prise en compte pour éviter une
suppression de garde de sécurité. Aucun écran supplémentaire n'est proposé.

## Résultat principal

La séparation des opérations Utilisateurs est pertinente et les contrôles
exercés refusent les escalades testées. Il faut toutefois corriger la
confidentialité de la provenance dans le Répertoire et la représentation des
droits réellement utilisables.

- **28 droits administratifs sont présentés actuellement**, dont trois sans
  fonction accessible dans les pages du site : lecture d'activité utilisateur,
  export de cette activité et journal global détaillé.
- En les retirant de cette présentation, **25 capacités administratives**
  correspondent aux fonctions actuelles : 23 délégables et deux liées au rôle
  pour Paramètres. Ce nombre ne comprend aucun nouveau droit proposé.
- Le volet Compte personnel présente huit capacités, dont une activité sans
  écran actuel : **sept capacités personnelles utiles**, une configurable et
  six garanties de base.
- L'accueil reste un accès connecté de base. La Feuille de route n'a pas besoin
  d'un nouveau droit : elle ne contient ni opération administrative ni donnée
  métier privée dans son implémentation actuelle.

Les compteurs doivent suivre ce périmètre et ses dépendances. Un droit accordé
ne permet pas toute action sur toute cible : les restrictions concernant soi-même,
un administrateur et le compte racine s'appliquent ensuite.

## Examen de chaque autorisation administrative utile

« Conserver » signifie que le découpage a une utilité actuelle. Cela ne signifie
pas que chaque combinaison a été exécutée dans un navigateur avec une base réelle.
Les dépendances indiquées sont les dépendances directes du catalogue actuel ;
le moteur vérifie aussi leur chaîne.

### Répertoire

| Autorisation | Portée actuelle / dépendance | Avis et changement recommandé |
| --- | --- | --- |
| `persons:view` — consulter | Liste et fiche complète, identité, date de naissance, emails, téléphones, profils sociaux ; aucune dépendance | **Conserver, préciser sa portée.** Ce n'est pas aujourd'hui une simple liste de noms. Une lecture restreinte des coordonnées demanderait un droit distinct et une projection serveur. |
| `persons:create` — créer | Créer une personne ; dépend de `persons:view` | **Conserver.** La création est distincte de la modification des personnes existantes. Ne donne aucun droit de création de compte utilisateur. |
| `persons:update` — modifier | Identité, statut et toutes les coordonnées, y compris ajout/suppression d'un email ou téléphone ; dépend de `persons:view` | **Conserver, envisager de séparer les coordonnées.** Actuellement, corriger un nom autorise aussi à modifier les contacts. Le statut de la personne peut rester dans ce droit : il ne désactive aucun compte. |
| `persons:delete` — supprimer | Supprimer une personne ; dépend de `persons:view` | **Conserver séparément.** Ne pas le fusionner avec Modifier et ne pas le confondre avec supprimer un compte. La route ne demande pas de preuve récente supplémentaire ; un mot de passe récent est une amélioration envisageable, pas un contrôle déjà présent. |
| `audit:view_field_history` — provenance des champs | API exigeant ce droit **et** `persons:view`, mais aucune dépendance déclarée dans le catalogue | **Conserver et corriger.** Regrouper ce droit avec le Répertoire, expliciter la dépendance à sa consultation, limiter la réponse aux informations réellement utilisées par la provenance. Voir AUT-S01, AUT-S03 et AUT-S04. |

### Utilisateurs : annuaire et profil

| Autorisation | Portée actuelle / dépendance | Avis et changement recommandé |
| --- | --- | --- |
| `users:view` | Liste, fiche et données de base ; aucune dépendance | **Conserver.** L'adresse de contact, les détails de sécurité et les permissions sont projetés séparément côté serveur. |
| `users:create` | Créer un compte standard et obtenir son mot de passe temporaire ; dépend de `users:view` | **Conserver.** Un détenteur de ce droit ne peut pas créer librement un ADMIN. Le choix ADMIN demeure réservé au compte racine, avec preuve renforcée. |
| `users:view_contact` | Consulter l'adresse de contact ; dépend de `users:view` | **Conserver.** Utile pour autoriser la lecture sans la modification. |
| `users:update_profile` | Modifier prénom et nom d'une cible autorisée ; dépend de `users:view` | **Conserver.** Ne doit pas inclure identifiant, contact, rôle ou sécurité. L'édition de son propre profil passe par Mon compte. |
| `users:update_contact` | Modifier l'adresse de contact sans la déclarer vérifiée ; dépend de `users:view` et `users:view_contact` | **Conserver séparément.** La dépendance à la lecture est cohérente et l'écriture ne donne pas une preuve de possession de l'adresse. |
| `users:update_login` | Modifier l'identifiant et fermer les sessions ; dépend de `users:view` | **Conserver séparément.** Conséquence de connexion suffisamment différente du prénom/nom ; preuve récente mot de passe + MFA à l'usage. |

### Utilisateurs : autorisations

| Autorisation | Portée actuelle / dépendance | Avis et changement recommandé |
| --- | --- | --- |
| `users:view_access` | Lire les autorisations administratives ; dépend de `users:view` | **Conserver.** Permet un contrôle en lecture seule sans pouvoir accorder ou retirer. Le compteur de synthèse respecte cette visibilité. |
| `users:grant_access` | Accorder des droits que l'acteur possède effectivement ; dépend de `users:view_access` | **Conserver distinct de Retirer.** Le contrôle porte aussi sur les droits gagnés par dépendance, pas seulement sur la case cliquée. Ne permet pas de modifier son propre compte ou un autre ADMIN. |
| `users:revoke_access` | Retirer des droits ; dépend de `users:view_access` | **Conserver distinct d'Accorder.** Autoriser seulement le retrait a une utilité actuelle. Le retrait d'un prérequis tient compte des droits qui en dépendent. |
| `users:delegate_access` | Donner/retirer à une cible le pouvoir d'accorder et retirer ; dépend de ces deux pouvoirs | **Conserver avec une explication courte.** Ce n'est pas un doublon : transmettre la capacité d'administrer les droits est une opération différente. Seul le compte racine peut transmettre ou retirer la délégation elle-même. |
| `users:view_account_policy` | Lire les capacités personnelles garanties et configurables ; dépend de `users:view` | **Conserver, préciser le libellé.** Présenter « Consulter les droits du compte personnel » distingue cette lecture de celle des droits administratifs. |
| `users:update_account_policy` | Modifier actuellement la seule option personnelle configurable : prénom et nom ; dépend de `users:view_account_policy` | **Conserver, description plus précise.** Indiquer « Autoriser ou interdire la modification personnelle du prénom et du nom ». Ne permet pas de retirer la gestion personnelle du mot de passe, de la MFA ou des sessions. |

### Utilisateurs : sécurité et suppression

| Autorisation | Portée actuelle / dépendance | Avis et changement recommandé |
| --- | --- | --- |
| `users:view_security` | Lire les états de verrouillage, mot de passe et MFA ; dépend de `users:view` | **Conserver.** Préciser « état du mot de passe » : aucun mot de passe, hash ou secret TOTP n'est fourni. Ne pas créer un droit distinct pour chaque badge. |
| `users:update_status` | Désactiver/réactiver une cible autorisée ; dépend de `users:view` et `users:view_security` | **Conserver.** Action réversible, distincte d'une suppression. Impossible de se désactiver soi-même ; preuve récente mot de passe + MFA. |
| `users:reset_password` | Générer un mot de passe temporaire ; dépend de `users:view_security` | **Conserver séparément.** Consultation de la sécurité ne doit pas donner ce pouvoir de reprise de compte. Preuve récente mot de passe + MFA. |
| `users:view_sessions` | Lire les appareils/sessions d'une cible autorisée ; dépend de `users:view_security` | **Conserver.** Informations plus détaillées que les états de sécurité, sans pouvoir déconnecter. |
| `users:revoke_sessions` | Fermer une ou toutes les sessions de la cible ; dépend de `users:view_sessions` | **Conserver.** Un seul droit suffit aux deux boutons actuels ; la révocation d'une session et de toutes les sessions a la même nature. Preuve récente mot de passe + MFA. |
| `users:delete_account` | Suppression irréversible d'un compte déjà désactivé ; dépend de `users:view_security` | **Conserver séparément.** Mot de passe récent obligatoire. Suppression de soi-même et du compte racine interdite ; supprimer un ADMIN réservé au compte racine. Le titulaire n'a pas besoin du pouvoir de désactiver : les deux étapes peuvent relever de personnes différentes. |

### Paramètres système

| Autorisation | Portée actuelle / dépendance | Avis et changement recommandé |
| --- | --- | --- |
| `settings:view` | Lire les paramètres ; droit attaché au rôle ADMIN | **Conserver comme capacité fixe clairement indiquée.** La page existe. Un USER ne l'obtient pas par surcharge individuelle. |
| `settings:update` | Modifier la conservation ; dépend de `settings:view`, attaché au rôle ADMIN | **Conserver.** Mot de passe récent pour réduire une durée ou réparer une valeur invalide ; pas de nouvelle preuve pour une augmentation ordinaire. Le catalogue ne permet pas actuellement de fabriquer un ADMIN en lecture seule de Paramètres. |

Il n'y a pas de besoin établi de rendre ces deux droits délégables. S'ils restent
affichés dans Autorisations pour expliquer le rôle, ils doivent rester identifiés
comme fixes, sans commutateur trompeur. Le code actuel applique cette distinction.

## Droits affichés sans fonction accessible dans les pages actuelles

| Autorisation affichée | Constat actuel | Recommandation limitée au site existant |
| --- | --- | --- |
| `users:view_activity` | Aucune section Activité utilisable dans la fiche ; `section=history` revient au profil | Retirer de l'éditeur administratif et du compteur des fonctions du site. |
| `users:export_activity` | Aucun bouton d'export d'activité utilisable sur cette fiche | Retirer de ce même périmètre ; ne pas inventer un export de la liste Utilisateurs pour justifier ce droit. |
| `audit:view` | Le libellé promet un journal global détaillé, mais aucun tel écran n'est accessible | Retirer de ce même périmètre. La provenance du Répertoire conserve son droit distinct. |
| `account:view_activity` | Présent parmi les garanties personnelles, sans journal accessible dans Mon compte | Retirer de la liste des capacités personnelles présentées sur le site. |

**Conséquence technique à traiter lors de la correction :**
`GET /api/users/[id]/audit`, dont son mode CSV, existe encore et utilise ces
clés. Cacher une ligne ne retire donc pas l'accès à cet endpoint. Pour une
suppression fonctionnelle complète, vérifier ses consommateurs et retirer ou
désactiver le point d'entrée devenu sans usage. Tant qu'il répond, ses contrôles
ne doivent pas être effacés. Cette observation porte sur une surface joignable
aujourd'hui, sans proposer de rétablir un écran.

## Compte personnel et accès communs

| Autorisation | Avis sur le site actuel |
| --- | --- |
| `account:view_profile` | **Conserver comme garantie.** Accès à son propre profil, pas à ceux des autres. |
| `account:update_profile` | **Conserver comme option configurable.** Autorise uniquement prénom/nom ; la route personnelle refuse la modification si elle est retirée. |
| `account:update_contact` | **Conserver comme garantie.** Changement de sa propre adresse avec vérification du mot de passe ; ce n'est pas le droit administratif de modifier l'adresse d'autrui. |
| `account:view_security` | **Conserver comme garantie.** Un utilisateur doit pouvoir connaître l'état de sécurité de son propre compte. |
| `account:change_password` | **Conserver comme garantie.** Ne pas permettre à un gestionnaire de permissions de bloquer le changement personnel du mot de passe. |
| `account:manage_mfa` | **Conserver comme garantie.** Configuration et récupération personnelles sont contrôlées par les preuves et règles MFA ; pas besoin d'une permission par bouton. |
| `account:manage_sessions` | **Conserver comme garantie.** Consulter et fermer ses propres sessions relève du même besoin personnel. Les contrôles des sessions d'autrui restent distincts. |
| `dashboard:view` | **Conserver comme accès connecté de base.** Aucune utilité à multiplier les réglages pour la page d'accueil actuelle. |

Le réglage des garanties personnelles n'est pas offert aux administrateurs.
C'est cohérent avec les fonctions actuelles de Mon compte. La liste peut être
présentée en explication compacte, avec une seule vraie option pour le prénom/nom.

## Ajouts et modifications que je recommande

### Deux droits envisageables sur une fonction déjà présente

Je recommande de séparer les coordonnées du Répertoire **si le but de la
délégation est d'ouvrir la consultation ou la correction d'identités sans donner
tous les contacts**. Ce besoin est plausible et le découpage actuel ne le couvre
pas, mais aucune règle utilisateur n'impose encore cette restriction : il s'agit
d'une proposition, pas d'une violation démontrée.

| Droit proposé | Utilité actuelle | Dépendances proposées |
| --- | --- | --- |
| `persons:view_contact` | Consulter emails, téléphones et profils sociaux ; leur présence sur une fiche n'impose pas de les donner à tous les lecteurs du Répertoire | `persons:view` |
| `persons:update_contact` | Ajouter, corriger ou retirer ces coordonnées sans autoriser la modification de l'identité ; conserver `persons:update` pour identité/statut | `persons:view` et `persons:view_contact` |

La date de naissance reste actuellement dans l'identité. Ces deux droits ne la
masqueraient pas. Ne pas annoncer une confidentialité de toutes les données
personnelles avec cette seule séparation ; un besoin de lecture sans date de
naissance doit être défini avant de créer un troisième droit.

Si ce découpage est retenu, traiter ensemble : pages serveur, réponses API,
recherche par coordonnées, colonnes, résumés, compteurs, provenance, formulaire
de création et sous-ressources. Fixer aussi ce qu'un créateur peut renseigner
comme coordonnées initiales. Une simple disparition de l'onglet Coordonnées
laisserait les données accessibles dans les réponses et les recherches.
La reprise des droits existants doit être explicite, sans couper silencieusement
l'accès des comptes déjà habilités.

Après les trois retraits de présentation administrative, ces deux ajouts
porteraient le catalogue utile à **27 capacités**, dont deux fixes de Paramètres.
Ce n'est pas une cible numérique à atteindre : sans ce besoin de séparation,
les 25 capacités existantes suffisent.

### Changements sans nouvelle permission

1. Corriger la visibilité de l'auteur protégé dans toutes les réponses Personnes,
   y compris après mutation ; garder les traces d'audit originales au stockage.
2. Rattacher la provenance au Répertoire dans l'éditeur et déclarer sa dépendance
   actuelle à `persons:view` ; ajuster l'ajout/retrait automatique et le compteur.
3. Ne transmettre à l'infobulle de provenance que l'auteur autorisé, la date et
   l'action utilisés aujourd'hui. Les anciennes/nouvelles valeurs stockées ne
   sont pas nécessaires à cette infobulle.
4. Retirer les quatre promesses de fonctions absentes de l'éditeur actuel et
   aligner les totaux avec ce qui est réellement proposé.
5. Préciser les textes de sécurité et de droits personnels sans fusionner les
   opérations de nature différente.

Je ne recommande pas d'ajouter des droits pour changer les rôles, réinitialiser
la MFA d'autrui, se connecter, rechercher une page ou ouvrir la Feuille de route.
Le changement de rôle et la reprise administrative MFA sont actuellement
réservés au compte racine et doivent le rester en l'absence d'un besoin différent.
Je ne recommande pas non plus un droit par champ, par onglet, par badge, ni par
action Ajouter/Modifier/Supprimer d'une même coordonnée.

## Contrôles transverses et preuves

| Scénario | Observé dans le code et les tests exercés | Limite |
| --- | --- | --- |
| Clé inconnue, dépendance retirée, surcharge d'un droit fixe | Refus des clés inconnues, dépendances effectives respectées, droits de rôle non modifiables individuellement | Tests du moteur et introspection du graphe, pas une matrice de sessions réelles |
| Accorder/retirer/déléguer | Effets directs et indirects vérifiés ; on ne peut pas accorder un droit non possédé ; transmission de la délégation réservée au compte racine | Routes/services testés avec authentification et stockage simulés |
| Agir sur soi-même, un ADMIN ou le compte racine | Mutations administratives interdites dans les cas structurellement protégés ; statut et suppression ont leurs gardes supplémentaires | Plusieurs scénarios couverts, pas chaque produit cartésien rôle × champ × état |
| Modifier des droits sensibles | Gain critique : MFA complète de la cible ; modification administrative critique ou des pouvoirs d'attribution/retrait/délégation : mot de passe récent ; changement ordinaire sur USER : pas de preuve additionnelle | Distinguer MFA d'attribution et preuve à l'usage ; aucune réauthentification réelle rejouée |
| Actualité de la session et des droits à l'écriture | Relecture transactionnelle de l'acteur, de sa session et de l'autorité attendue dans les services concernés | Lecture du code et suites simulées ; concurrence PostgreSQL non rejouée |
| Projection Utilisateurs | Contact, sécurité, droits et identité racine filtrés selon l'acteur ; aucun secret fourni | Suites de frontières API simulées |
| Projection Personnes | Identité racine présente dans `lastChange.actor` et `items[0].actor` des fonctions réelles de projection | Deux sondes avec données fictives et stockage simulé ; aucun incident sur une donnée réelle affirmé |
| Compteur de provenance sans Répertoire | Pour USER avec seulement `audit:view_field_history: true` : compteur `1/28`, alors que `canViewProvenance` est faux | Troisième sonde exécutée sur les fonctions réelles de calcul |

### Exécutions du 15 octobre

- **400 tests existants réussis dans 24 fichiers**, en deux sélections :
  308 dans 20 fichiers, puis 92 dans quatre fichiers supplémentaires.
- **Trois sondes temporaires réussies** reproduisent les défauts, avec données
  entièrement fictives. Leur réussite confirme le comportement problématique,
  pas une correction. Le fichier temporaire a été retiré après exécution.
- Graphe des clés reconnues inspecté : dépendances connues, absence de cycle,
  perte d'accès effective lors du retrait d'un prérequis déclaré. Cette cohérence
  technique ne détecte pas une dépendance métier absente comme AUT-S03.

Première sélection, depuis `apps/web` :

```text
bun run test src/__tests__/permissions.test.ts src/__tests__/api-auth.test.ts src/__tests__/permission-editor-view.test.ts src/__tests__/permission-editor-policy.test.ts src/__tests__/permission-editor-role-bound-render.test.ts src/__tests__/users-access-hardening.test.ts src/__tests__/user-permission-mutation-proof.test.ts src/__tests__/persons-routes-permissions.test.ts src/__tests__/person-pages-permissions.test.ts src/__tests__/person-field-history.test.ts src/__tests__/audit-visibility.test.ts src/__tests__/user-audit-redaction.test.ts src/__tests__/system-settings-routes.test.ts src/__tests__/admin-mfa-reset-route.test.ts src/__tests__/feature-readiness.test.ts src/__tests__/feature-foundation.test.ts src/__tests__/navigation.constants.test.ts src/__tests__/account-page-ux-contracts.test.ts src/__tests__/server-page-auth.test.ts src/__tests__/person-user-isolation.test.ts
```

Les quatre fichiers supplémentaires sont `user-detail-api.test.ts`,
`users-list-api.test.ts`, `account-security-routes.test.ts` et
`mfa-management-route.test.ts`, exécutés par la même commande `bun run test`
avec la première version du fichier de sondes (92 tests existants + deux sondes).
Le fichier temporaire seul a ensuite été rejoué avec ses trois sondes.

Reproduction minimale des sondes :

1. Un acteur fictif `isProtected: true`, prénom `Synthetic`, nom `Root`,
   identifiant `synthetic.root.private`, passe à `createPersonAudit` avec une
   action `PERSON_UPDATE`. Le faux client capture les données réellement écrites.
2. Ce même enregistrement alimente `mapPersonDetail` : l'auteur est retourné
   avec ce nom et cet identifiant. En comparaison,
   `protectUserIdentityForActor` masque ces valeurs au même lecteur différent
   de l'auteur pour une fiche Utilisateur.
3. `getPersonFieldHistory`, avec ce snapshot et une modification fictive du
   pseudo de `previous` vers `current`, restitue le même auteur et les deux
   valeurs. Le composant de provenance ne consomme que l'auteur, la date et
   l'action du premier élément.
4. `buildPermissionEditorState('USER', { 'audit:view_field_history': true })`
   suivi de `countUsablePermissions` produit `{ ready: 1, total: 28 }`.
   `getPersonCapabilities` sur le même compte donne `canViewProvenance: false`.

### Sources de preuve dans le code

- [Catalogue et moteur](../../apps/web/src/shared/constants/permissions.constants.ts),
  [présentation et compteur](../../apps/web/src/components/users/permission-editor-view.ts),
  [capacités personnelles présentées](../../apps/web/src/components/users/user-detail/UserAccountTab.tsx).
- [Autorisation des changements de droits](../../apps/web/src/shared/server/user-permission-mutation-authorization.ts),
  [route utilisateur](../../apps/web/src/app/api/users/[id]/route.ts),
  [relecture transactionnelle](../../apps/web/src/shared/server/user-action-authorization.ts),
  [projection de l'identité protégée](../../apps/web/src/shared/server/user-visibility.ts).
- [Écriture de l'auteur Personnes](../../apps/web/src/features/persons/server/person-audit.ts),
  [lecture de la fiche](../../apps/web/src/features/persons/server/person-core.service.ts),
  [lecture de la liste](../../apps/web/src/features/persons/server/person-list.service.ts),
  lecture de provenance (`person-history.service.ts`, retiré le 27 octobre 2026),
  consommateur de provenance (`PersonFieldProvenanceHint`, retiré le 27 octobre 2026).
- [Capacités du Répertoire](../../apps/web/src/features/persons/person.permissions.ts),
  [navigation des onglets utilisateur](../../apps/web/src/components/users/user-detail/UserDetailNavigation.tsx),
  API d'activité encore joignable (`app/api/users/[id]/audit/route.ts`, [retirée le 25 octobre 2026](2026-10-23-revue-complete.md#suivi--lot-3-du-25-octobre-2026)).

## Constats suivis

| ID | Nature / priorité | Attendu et observé, impact | Action et propriétaire | État |
| --- | --- | --- | --- | --- |
| AUT-S01 | Défaut P1, confidentialité | L'identité du compte racine est masquée aux autres dans Utilisateurs, mais ses snapshots nom/identifiant sont exposés dans le Répertoire. Lecture simple de la fiche suffisante pour son dernier auteur ; provenance détaillée soumise à son propre droit. Les projections de fiche et de champ ont été reproduites, la liste présente le même schéma par lecture SQL. Aucun secret d'authentification exposé dans la preuve. | Appliquer la visibilité de l'auteur dans les réponses liste/fiche/provenance et retours de mutation, sans effacer les traces stockées. Responsable à attribuer ; suivi Répertoire. | **Ouvert**, confirmé sur projections réelles avec stockage simulé ; session réelle à vérifier lors de la correction |
| AUT-S02 | Défaut P2, catalogue visible | Quatre droits présentés promettent des fonctions sans écran actuel ; trois gonflent le total administratif et un la liste personnelle. | Retirer ces lignes et les compteurs associés ; traiter les consommateurs/API avant suppression des clés de sécurité. Responsable à attribuer ; suivi Utilisateurs, consommateur Mon compte. | **Ouvert**, inventaire et navigation examinés |
| AUT-S03 | Défaut P2, dépendance et compteur | Provenance déclarée effective et comptée utilisable sans `persons:view`, malgré le refus effectif de son seul consommateur actuel. Pas de contournement de l'API : le défaut est dans le modèle présenté et le compteur. | Déclarer le prérequis, regrouper dans Répertoire, tester l'activation/retrait automatique et la reprise des surcharges enregistrées. Responsable à attribuer ; suivi Utilisateurs. | **Ouvert**, sonde reproduite |
| AUT-S04 | Dette P2, données excessives | L'infobulle a besoin d'auteur/date/action ; l'API transmet jusqu'à deux changements avec anciennes et nouvelles valeurs, même chiffrées au stockage puis déchiffrées. Ce surplus dépasse le besoin de l'écran et le libellé visible, sans établir à lui seul un contournement de sa permission actuelle. | Réduire le contrat envoyé au besoin de provenance actuel ; conserver le stockage d'audit. Responsable à attribuer ; suivi Répertoire. | **Ouvert**, projection et consommation examinées |
| AUT-S05 | Suggestion P2, compréhension | « Autonomie » couvre une seule option modifiable et « consulter le mot de passe » décrit en réalité un état. | Préciser les descriptions, garder lecture et écriture séparées. Responsable à attribuer ; suivi Utilisateurs. | **Proposé**, aucune règle changée |
| AUT-S06 | Suggestion P2, délégation du Répertoire | Lecture/modification de l'identité et des coordonnées couplées ; pas de profil de lecteur sans contacts. | Deux droits de coordonnées seulement si la séparation décrite est retenue ; traiter toutes les projections et l'initialisation des contacts. Responsable à attribuer ; suivi Répertoire. | **Proposé**, besoin à décider |
| AUT-S07 | Suggestion P2, suppression de personne | Suppression autorisée sans preuve récente additionnelle, contrairement à la suppression d'un compte. Cette différence ne viole pas à elle seule la politique implémentée. | Envisager un mot de passe récent pour l'action irréversible, sans créer une permission supplémentaire. Responsable à attribuer ; suivi Répertoire. | **Proposé**, pas un défaut de permission démontré |

Les descriptions documentaires devenues inexactes de Paramètres et des preuves
requises pour modifier les droits sont réconciliées dans la référence
Permissions au cours de cette passe. Il s'agit d'une correction documentaire
de l'état implémenté, sans changement de sécurité.

## Verdict, limites et reprise

**Corrections nécessaires**, avec conclusion limitée à l'analyse du code,
aux tests existants exécutés et aux trois reproductions simulées. Aucun audit
complet avec sessions réelles et PostgreSQL n'est annoncé. Aucun parcours
navigateur, charge, contrôle d'accessibilité ou test d'intrusion externe n'a
été exécuté pour cette passe. Les preuves réelles d'autres dates ne sont pas
réutilisées comme validation nouvelle.

Sélection de la revue : Q01–Q02, Q05–Q06, Q09–Q11, Q14–Q16, Q19, Q21, Q25,
Q27 et Q30 pour périmètre, contrats, visibilité, suppressions, export encore
joignable, sécurité des personnes et documentation. Q03–Q04 et Q07 hors impact
graphique/interaction de cette analyse ; Q08, Q20, Q23–Q24 et Q26 sans fonction
concernée ; Q12–Q13, Q17–Q18, Q22, Q28–Q29 hors modification de schéma,
migration, cache, dates, infrastructure ou données persistantes. Les effets
d'une future correction seront à requalifier à ce moment-là.

Priorité de reprise : AUT-S01, puis AUT-S02 à AUT-S04 ; les suggestions ne sont
pas prérequises à ces corrections. Rejouer les projections et les refus d'accès
sur base isolée avec un compte racine auteur et des lecteurs distincts, puis
les parcours correspondants dans la fiche et l'éditeur. Les propriétaires
courants sont [Utilisateurs](../pages/systeme/utilisateurs/README.md),
[Répertoire](../pages/membres/repertoire/README.md),
[Mon compte](../pages/mon-compte/README.md) et
[Paramètres](../pages/systeme/parametres.md).

## Corrections après accord — 15 octobre 2026

Décision utilisateur : « ok go ». Périmètre maintenu aux fonctions présentes.
La séparation des coordonnées recommandée est adoptée ; la preuve de mot de
passe supplémentaire pour supprimer une personne (AUT-S07), simple piste hors
du lot recommandé, reste proposée. Responsable de ce lot : agent Codex dans
cette session, sur instruction de l'utilisateur.

| Constat | État après intervention | Vérification actuelle |
| --- | --- | --- |
| AUT-S01 | Corrigé et vérifié | Identité racine masquée aux autres lecteurs dans liste, fiche, provenance et retours de mutation ; snapshots originaux conservés et vérifiés en SQL |
| AUT-S02 | Corrigé et vérifié | Quatre droits retirés des presets/catalogues ; API JSON/CSV 410 sans base ; surcharges migrées ; éditeur administratif 27 et personnel 7 |
| AUT-S03 | Corrigé et vérifié | Provenance rattachée au Répertoire et dépendante de `persons:view` ; droit orphelin non effectif et non compté |
| AUT-S04 | Corrigé et vérifié | Un seul changement, auteur/action/date/id ; anciennes/nouvelles valeurs absentes de la requête et de la réponse, aucun déchiffrement |
| AUT-S05 | Appliqué et vérifié | Descriptions du compte personnel, édition prénom/nom et état du mot de passe précisées |
| AUT-S06 | Adopté, implémenté et vérifié | Lecture/écriture des coordonnées distinctes de l'identité ; projections, recherche et création initiale contrôlées, accès antérieurs repris |
| AUT-S07 | Proposition non adoptée | Politique de suppression de personne inchangée ; aucun défaut affirmé sur cette seule différence avec Utilisateurs |

La référence [Permissions](../domaines/permissions.md) et les suivis
[Utilisateurs](../pages/systeme/utilisateurs/README.md),
[Répertoire](../pages/membres/repertoire/README.md) et
[Mon compte](../pages/mon-compte/README.md) portent les décisions courantes.

### Preuves de correction

| Vérification | Résultat | Portée et limite |
| --- | --- | --- |
| Suite web complète, Vitest | **1 335 réussis, 0 échec, 142 ignorés** | Bases des tests de création, fiche et liste Personnes configurées ; autres intégrations PostgreSQL facultatives non exécutées, sans les annoncer validées |
| PostgreSQL 17 isolé | **82 tests réussis**, inclus dans la suite | Création 17, fiche 46, liste 18, migration 1 (plusieurs cas : rôles, surcharges, JSON mal formé, racine, supprimés et idempotence) ; transactions, sessions stockées et SQL réels, adaptateurs Next simulés |
| Paquet database | **33 tests réussis** | Sauvegarde, signature, précontrôles de restauration, stockage et analyse de plans ; pas une nouvelle restauration intégrale de la base de travail |
| Chromium + Next 15.5.23 de production + PostgreSQL isolé | **5 parcours réussis**, 1440 × 1000 | Racine, éditeur d'identité sans contacts, éditeur de contacts sans identité ; sessions/cookies préparés, connexion et challenge MFA non rejoués |
| Build de production | Réussi | Compilation, types et lint du build ; avertissements de style restants, aucune erreur |
| Budgets architecture et performance | Réussis | Tailles des sources/bundles, pas une mesure de charge concurrente |

Les cinq parcours réels vérifient :

1. Fiche sans onglet/résumé/contact pour le lecteur d'identité, y compris avec
   une URL demandant Coordonnées ; réponse API et recherche par email filtrées.
2. Provenance du dernier changement, auteur racine masqué et aucune valeur.
3. Coordonnées visibles et ajout d'email persistant pour leur gestionnaire ;
   PATCH d'identité refusé en 403.
4. Éditeur Répertoire avec lecture/écriture des contacts et provenance ;
   synthèse et total administratif à 27. Capture inspectée.
5. Ancien endpoint d'activité CSV fermé en 410.

Le banc de navigateur est temporaire, sans mock des API métier. Ses premiers
essais ont corrigé la transmission des cookies sécurisés sur HTTP local et un
sélecteur de titre incomplet ; ils ne sont pas des défauts applicatifs. Quelques
fichiers préexistants ont reçu uniquement le formatage requis par le lint du
build, sans changement de comportement.

Pour reproduire les intégrations : démarrer PostgreSQL sur une cible locale
isolée, déployer les migrations et renseigner `PERSON_DETAIL_TEST_DATABASE_URL`,
`PERSON_CREATION_TEST_DATABASE_URL` et `PERSONS_LIST_TEST_DATABASE_URL` vers
leurs bases dédiées, puis exécuter `bun run test` depuis `apps/web`. Les fichiers
refusent les cibles inattendues. Tests permanents :
`person-detail-postgres.test.ts`, `person-creation-postgres.test.ts`,
`persons-list-postgres.test.ts`, `current-permissions-migration-postgres.test.ts`.
Les anciens tests d'export sont remplacés par le contrat de fermeture dans
`retired-activity-api.test.ts`.

### Migration de la base de travail

La migration additive
[20261015190000_current_site_permissions](../../packages/database/prisma/migrations/20261015190000_current_site_permissions/migration.sql)
a été exercée sur PostgreSQL isolé et via le déploiement des **54 migrations sur
une base vide**. Elle ne modifie aucune migration historique ni aucun audit.

Précontrôle de la base configurée : 53 migrations appliquées, checksums conformes,
aucun échec non résolu, seule cette migration en attente. La sauvegarde ordinaire
a d'abord refusé l'absence de configuration de signature, sans publier de copie
partielle. Une paire Ed25519 dédiée a ensuite signé la sauvegarde v9 : clé privée
en mémoire uniquement, clé publique conservée avec JSONL, checksum et signature
dans `.codex-tmp/database-backups/`, suffixe `.verification-key.json`.
Les clés de chiffrement d'origine restent nécessaires à une restauration.

`db:migrate:deploy` a appliqué la migration avec succès. Contrôle postérieur :
**quatre comptes courants vérifiés**, accès aux contacts conservés, anciens
droits retirés, lignes protégées et supprimées inchangées. `db:migrate:status`
confirme **54 migrations appliquées et aucune en attente**. Aucune donnée réelle
n'a servi aux parcours navigateur. Cette passe ne remplace pas une qualification
d'exploitation ni les limites des autres audits datés.

### Contrôles de clôture

Typecheck web/database réussi (paquet partagé repris du cache), lint sans erreur
(33 avertissements), `git diff --check`, `docs:check` et ses six tests réussis.
Les contrôles documentaires portent sur 269 fichiers. Le périmètre de correction
ajoute Q03–Q04 (visibilité des contacts), Q12–Q13 (sens des surcharges et
migration), Q17–Q18 (projections/recherche et portée des caches), Q28–Q29
(application et sauvegarde) à la sélection de l'analyse initiale. Le schéma
structurel, les dates et le format de sauvegarde ne changent pas. Les notifications,
imports, pièces jointes et fonctions absentes restent non applicables.
