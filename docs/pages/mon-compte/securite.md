# Mon compte — Sécurité

[Index des pages](../../pages/README.md) · [Mon compte](README.md) · [Design](../../design/README.md) · [Guide général](../../REFERENCE_GENERALE.md)

## Identité

| Élément | Valeur |
| --- | --- |
| Route | `/mon-compte` |
| Section | `?section=security` |
| Espace | Compte personnel |
| Gabarit visé | [B. Fiche à sections](../../design/gabarits.md#b-fiche-à-sections) |
| État d’harmonisation | Aligné — voir [Harmonisation](../../design/harmonisation.md#état-par-page) |
| Point d’entrée | [SecuritySection](../../../apps/web/src/features/account/components/SecuritySection.tsx) |
| Contrôle d’accès | session ; mot de passe `account:change_password`, double authentification `account:manage_mfa`, sessions `account:manage_sessions` |
| Chargement / erreur dédiés | section chargée à la demande / commune à l’application |

## Rôle et tâches principales

Changer son mot de passe, gérer sa double authentification et ses codes de
secours, consulter et révoquer ses sessions de connexion.

## Composition actuelle

Titre « Sécurité » réservé aux lecteurs d’écran ; rubriques Mot de passe,
Double authentification (configuration, codes de secours ; valeurs sans cadre
imbriqué, aide sur l’obligation, blocage encadré), Sessions (session courante, autres appareils, révocation individuelle
ou globale) ; fenêtres de confirmation communes ; attentes bornées à 30 secondes.

## Décisions retenues

- 25 octobre 2026 : générer de nouveaux codes de secours ne déconnecte plus
  les autres appareils ni ne renouvelle la session courante ; la vérification,
  la consommation du code, le remplacement des codes et l'audit restent une
  seule transaction ([règle](../../domaines/permissions.md#principes)).

- Attente et reprise des sessions sans rejeu : voir la revue du 12 octobre 2026 ci-dessous.
- 24 octobre 2026 : la rubrique Mot de passe se limite à l’état et au dernier
  changement ; la ligne « Connexions refusées » disparaît avec le verrou par
  compte ([revue complète, REV-01](../../audits/2026-10-23-revue-complete.md)).
  Elle n’affichait d’ailleurs presque jamais rien : le compteur était remis à
  zéro dès que le mot de passe était validé, donc avant l’ouverture de la page.
- 25 octobre 2026 : la fenêtre « Changer le mot de passe » remplace la jauge de
  force (score fondé sur la composition) par trois règles cochées en direct :
  12 caractères au moins, ni suite ni répétition simple, ni identifiant, nom ou
  « Noctambule ». Le serveur refuse en plus les mots de passe courants et
  l'explique dans l'alerte. Les gestionnaires de mots de passe peuvent remplir
  ses champs ([règle](../../design/comportements.md#autocomplétion)). La carte
  Sessions devient `AccountSessionsCard` (état, révocations et confirmations) ;
  `SecuritySection` passe de 838 à 443 lignes et sort des exceptions du budget
  d'architecture. Banc client de Mon compte : 25/25, dont deux captures des
  règles à 390 et 1 440 px.

## Points ouverts

Aucun point ouvert : COMPTE-10 à COMPTE-12 sont clos au périmètre testé.

## Références

- Fiche [Sécurité](../../references/securite.md)
- Audit : [11 octobre 2026](../../audits/2026-10-11-mon-compte.md)

## Historique

- 19 octobre 2026 : fiche propre à la section, créée par découpage du suivi.
- 20 octobre 2026 : titre visible et cadres imbriqués retirés, « Double
  authentification » ([reprise](README.md#reprise--20-octobre-2026)).

## Revues datées

Sections déplacées le 19 octobre 2026 depuis l’ancien suivi du module, sans
modification de leur contenu. Elles conservent leur date, leur portée et leurs
preuves ; la synthèse ci-dessus porte l’état courant.

### Sécurité : attente et reprise des sessions — complément ciblé du 12 octobre 2026

**Corrigé et vérifié dans le périmètre décrit.** Départ `c61ed03`, arbre propre.
Cette reprise porte sur les lectures
de sécurité et les révocations individuelle/globale de sessions, leurs
confirmations, le retour de focus et l'autorisation au moment de la mutation.
Elle ne reprend pas l'audit complet du profil, du contact ou de la configuration
MFA. Les preuves du 11 octobre restent datées et ne couvrent pas ces nouveaux cas.

Sélection de la [référence générale](../../REFERENCE_GENERALE.md) : Q01–Q07, Q09–Q11,
Q14–Q17, Q19, Q22, Q27–Q28 et Q30 examinés pour l'action sensible, les données de
session, la concurrence et la reprise. Q12–Q13, Q18 et Q29 hors impact : aucun
changement de schéma, migration, cache ou format de sauvegarde. Q08, Q20–Q21 et
Q23–Q26 non applicables : ni notification différée, fichier, transfert de masse,
automatisation, gouvernance, donnée esport ou engagement financier ajouté.

Décisions de cette reprise :

- Borner chaque lecture et révocation à 30 secondes, corps de réponse compris,
  et conserver l'annulation au démontage. Un délai dépassé ou une annulation
  côté navigateur ne prouve jamais l'annulation de l'opération serveur.
- Séparer le résultat de la mutation de la relecture des sessions : un GET lent
  après succès ne doit pas maintenir la confirmation de révocation verrouillée.
  Les chargements et échecs de relecture restent visibles dans la section.
- Après résultat incertain, effectuer une relecture bornée et permettre une
  reprise explicite, sans rejouer automatiquement le DELETE. Une notification
  fugitive ne suffit pas à expliquer durablement cette situation.
- Rendre le focus à un élément présent et visible sous la barre de sections ;
  ne pas prendre un titre focalisé mais masqué pour un retour accessible.
  Si l'utilisateur a interagi ailleurs pendant la relecture, sa nouvelle action
  conserve le focus : la réponse tardive ne doit pas le reprendre.
- Vérifier l'autorisation de la session source dans la transaction avant la
  révocation ; une authentification initiale ne suffit pas si elle est devenue
  invalide pendant l'attente. Aucun nouveau droit ou mode de révocation ajouté.

| Point | Constat et portée | Correction et clôture du 12 octobre |
| --- | --- | --- |
| COMPTE-10 — P1 | Un DELETE sans réponse, ou un DELETE réussi suivi d'un GET bloqué, maintenait la confirmation verrouillée après 31 secondes. Un 500 JSON ne déclenchait pas de relecture et ne laissait pas d'avertissement local persistant. Reproduit avec API/horloge simulées. | **Clos au périmètre testé** : délai par requête, confirmation libérée avant le GET et reprise locale explicite. Le transport perdu après commit réel produit un DELETE, un GET de vérification et un avertissement persistant, sans rejeu. |
| COMPTE-11 — P1 | Après authentification en version S0, une rotation vers S1 ou la disparition de la session source n'empêchait pas le DELETE individuel/global de supprimer les sessions et de répondre 200. Quatre reproductions serveur avant correction, état SQL et audits contrôlés. | **Clos au périmètre SQL testé** : verrou du compte, contrôle de son état/version et relecture des échéances de la session source après l'attente. Refus 401 sans suppression ni audit de réussite ; suppression autorisée et audit restent dans la même transaction. |
| COMPTE-12 — P2 | Après révocation, le titre Sessions recevait le focus vers 80 px, derrière la barre située entre 56 et 105 px, à 390 et 1 440 px. Reproduit dans le banc client simulé. | **Clos au périmètre testé** : titre visible vers 120 px aux deux largeurs simulées et focus visible après perte de réponse dans Next réel. Une nouvelle interaction pendant la relecture conserve son focus. |

Preuves de la passe, exécutées le 12 octobre :

[Banc client : huit parcours réussis](../../audits/mon-compte-securite-2026-10-12/banc-client/README.md) :
confirmations, délai de 30 secondes contrôlé à 31 secondes, 500 JSON, 403 non
JSON, reprises des lectures sessions/MFA et focus à 390/1 440 px. Le vol de focus
par une relecture tardive a été relevé puis corrigé pendant cette passe, après
le premier correctif de délai ; il n'est pas présenté comme un constat de la
version initiale. API, acteur, horloge et routeur simulés, polices Next absentes
et police calculée non mesurée ; aucun commit SQL ni traitement serveur annulé
démontré par ce banc. Les dialogues
mot de passe et configuration MFA n'y sont pas exercés.

[Banc serveur : neuf scénarios PostgreSQL ciblés réussis](../../audits/mon-compte-securite-2026-10-12/banc-serveur/README.md),
sur 29 tests du fichier, vingt autres ignorés par le filtre ; 39 tests API voisins
réussis séparément. Six régressions SQL sont nouvelles : quatre cas de rotation
ou disparition de la source, compte inactif et expiration après attente du
verrou réellement observée. L'authentification est simulée dans ce banc ; les
requêtes, verrous, transactions et audits sont réels. Ce n'est pas une preuve
HTTP de changement de mot de passe ou de remplacement MFA concurrent.

[Banc Next/PostgreSQL : trois parcours HTTP réussis](../../audits/mon-compte-securite-2026-10-12/banc-integration/README.md) :
annulation sans DELETE ni audit, révocation globale confirmée et réponse perdue
après commit réel. La session de l'autre navigateur devient refusée (401), la
session courante reste valide (200), un seul audit est ajouté. Après perte de
réponse : un DELETE et un GET, une session restante, avertissement persistant et
titre focalisé visible. Ce banc vérifie la révocation globale, pas toutes les
combinaisons individuelles ni les courses SQL du banc précédent.

Contrôles généraux : **1 252 tests réussis, 169 ignorés**, dans 103 fichiers
réussis et neuf ignorés ; quatre nouveaux tests couvrent délai, corps de réponse,
annulation et refus HTTP. Les neuf SQL ciblés sont une exécution distincte,
sans les additionner à ce total. Types, lint globaux et build Next 15.5.23
réussis ; architecture et budgets réussis sans hausse des plafonds. Mon compte
mesure 259 200 octets gzip dans le contrôleur de budget du dépôt, sans mesure de
charge. Aucun schéma, migration, droit ni durée de session modifié.

Limites : Chromium et jeux de données isolés ; Safari/iOS, lecteur d'écran,
extensions, charge et tous les parcours mot de passe/MFA hors validation de ce
complément. Le délai client ne garantit pas l'arrêt d'un traitement serveur.
Nettoyage confirmé : cinq temporaires client supprimés ; Next/PostgreSQL arrêtés,
ports libres, cluster de deux bases fictives, dossier privé, secrets et marker
supprimés. Aucune base habituelle utilisée. Les preuves d'intégration détaillent
ces contrôles ; aucun secret n'est archivé.
