# Fiche personne — revue complète du 12 octobre 2026

## Périmètre et départ

Route `/membres/repertoire/[id]`, identité, coordonnées, provenance des
champs, lecture selon les droits, conflits de version, navigation et
suppression définitive. Départ propre au commit `0027a78`, projet en
développement. Le [suivi du Répertoire](../pages/membres/repertoire/README.md)
porte les décisions courantes. Les audits de la liste et de la création
restent des preuves datées distinctes.

Sources principales : [page serveur](../../apps/web/src/app/membres/repertoire/[id]/page.tsx),
[composition de fiche](../../apps/web/src/features/persons/components/PersonDetailPage.tsx),
[identité](../../apps/web/src/features/persons/components/PersonIdentitySection.tsx),
[coordonnées](../../apps/web/src/features/persons/components/PersonCollectionsSection.tsx),
[dialogue](../../apps/web/src/features/persons/components/PersonChildDialog.tsx),
[provenance](../../apps/web/src/features/persons/components/PersonFieldProvenanceHint.tsx)
et [suppression](../../apps/web/src/features/persons/server/person-deletion.ts).

**Conforme sur le périmètre vérifié : trente parcours client, treize parcours
HTTP et trente scénarios SQL réussis.** Les correctifs, la compilation finale
et les budgets sont validés dans les conditions décrites ci-dessous. Aucune
restauration de sauvegarde ni qualification d'exploitation n'est revendiquée.

## Sélection de la revue générale

| Sujets | Classement et justification |
| --- | --- |
| Q01–Q04 | À examiner : données utiles à la fiche, sections, retours, composition, clavier, focus et adaptation |
| Q05 | À examiner pour les collections de coordonnées, leurs compteurs et limites ; liste, recherche et pagination du Répertoire hors impact, sauf conservation du contexte de retour |
| Q06–Q07 | À examiner : formulaires, validations, versions, relecture, annulation, attente et résultat incertain |
| Q08 | Non applicable : pas de destinataire différé à informer ; la provenance et l'audit ne sont pas des notifications |
| Q09–Q11 | À examiner : droits de lecture, modification, suppression et provenance, changement de compte, retrait d'accès, coordonnées et date de naissance |
| Q12 | À examiner : identité minimale, appartenance des coordonnées, principal et versions ; personne distincte du compte et des relations métier futures |
| Q13 | Hors impact : aucune migration ajoutée ; les 52 migrations existantes sont appliquées aux bases de preuve |
| Q14–Q16 | À examiner : contrats et réponses API, transactions et audits, suppression des coordonnées et de la fiche, répétition après réponse perdue |
| Q17–Q18 | À examiner à la portée d'une fiche : lectures et attentes bornées, absence de requête inutile, collections plafonnées ; aucun besoin actuel de cache, pagination ou virtualisation supplémentaire |
| Q19 | À examiner : responsabilités de la page, des éditeurs, de la provenance et des composants partagés ; retirer une chaîne morte plutôt qu'ajouter une abstraction |
| Q20–Q21 | Non applicables : aucune pièce, import ou export dans la fiche actuelle |
| Q22 | À examiner : naissance comme date civile et dates de modification ; calcul d'âge du DTO inchangé, aucun affichage d'âge ni calendrier ajouté |
| Q23–Q24 | Non applicables : aucune tâche différée ni gouvernance dans la fiche actuelle |
| Q25 | À examiner : pseudo, identité civile et statut sans création de compte, adhésion ou rôle ; homonymes autorisés |
| Q26 | Non applicable : aucun montant, contrat ou paiement |
| Q27 | À examiner : reproduction des défauts et distinction entre navigateur simulé, SQL isolé et parcours HTTP réel |
| Q28–Q29 | À examiner à la portée de la disponibilité et de la suppression : indisponibilité sans perte de brouillon, effacement transactionnel et trace minimale ; restauration de sauvegarde et qualification d'exploitation non rejouées par une simple suppression de test |
| Q30 | À examiner : décisions et limites documentées ; aucune nouvelle dépendance nécessaire |

## Besoin, éléments actifs et composition

La fiche représente une personne physique. Le pseudo peut suffire à
l'identifier ; sinon prénom et nom sont nécessaires. Le statut « Dans la
structure » ou « Hors structure » n'est ni une adhésion, ni une autorisation,
ni un engagement daté. Les fonctions futures restent hors de cette passe.

| Élément | Contrat examiné et décision |
| --- | --- |
| Bandeau et sections | Identité puis Coordonnées dans `EntityDetailLayout`, avec `PageSectionNavigation` commun et indication de brouillon ; `PageIdentityHero` compact remplace le bandeau ancien sans modifier la tâche de la fiche |
| Identité | Pseudo, prénom, nom, naissance facultative et statut ; `PersonIdentityFields`, champs partagés et validation locale puis serveur |
| Naissance | Date civile, indépendante d'une heure ; aucune nouvelle règle de majorité ou d'éligibilité sportive introduite. L'aide accessible doit exister lorsqu'elle est référencée |
| Commandes de l'identité | `SectionActionBar` commune, affichée pour un brouillon, portée par la page hors de la carte ; annulation vers la dernière version connue et relecture conservant les seuls champs retouchés |
| Emails et téléphones | Listes courtes, au plus dix de chaque ; libellé et principal, copie et lien adapté ; numéro associé à son pays dans le formulaire |
| Profils sociaux | Au plus vingt ; réseau, identifiant ou URL, libellé, principal par réseau ; catalogue actif pour un nouvel ajout, lecture des données anciennes conservée |
| Édition des coordonnées | Dialogue commun aux trois types, vrais champs spécifiques, version de fiche et de coordonnée ; validation, conflit, relecture et doublon signalé sans bloquer un cas légitime |
| Suppression d'une coordonnée | Confirmation locale ; remplacer le principal lorsque d'autres éléments du même ensemble subsistent |
| Provenance | Droit d'historique en plus de la lecture de fiche ; l'interface actuelle montre l'auteur et la date de la dernière modification, sans devenir un journal complet. L'API conserve sa limite actuelle de deux changements ; la référence de permissions annonçant trois est alignée |
| Suppression de la fiche | Permission distincte, confirmation explicite, version et clé de suppression ; effacement transactionnel des données de fiche et de l'historique des champs, trace minimale de suppression |
| Navigation | Retour sûr vers le Répertoire filtré, dialogue de brouillon et focus après annulation ; une annulation réseau ne promet pas l'annulation d'un commit déjà reçu par le serveur |

Les quatre droits restent distincts : voir, modifier, supprimer, consulter la
provenance. Un mode de lecture ne doit pas révéler une ancienne réponse reçue
pour un autre compte ou une ancienne portée de droits. Une indisponibilité
temporaire du module ne signifie pas que le brouillon doit disparaître.

La suppression actuelle n'est pas un archivage restaurable depuis
l'application. La transaction attend la suppression avant de répondre ; elle
ne justifie pas une promesse de purge des sauvegardes extérieures à ce parcours.
Aucune nouvelle demande de mot de passe ou de MFA n'est décidée par cet audit.

## Constats et état des corrections

| ID | Nature et scénario | Traitement ou contrôle attendu | État |
| --- | --- | --- | --- |
| REP-D01 · P1 | Le snapshot serveur et le brouillon de A restent utilisés après passage au compte B ; une réponse PATCH de A reçue ensuite est acceptée. Reproduits avec contexte et API simulés. | Préchargement lié explicitement à l'acteur ; états isolés par cible, compte et droits, lectures annulables et bornées à 30 secondes, réponses anciennes et versions reculant ignorées, données retirées après refus d'accès. Annulation d'une lecture remplacée vérifiée en StrictMode ; révocation pendant PATCH et DELETE vérifiée sur serveur réel. | Clos après vérification client et HTTP |
| REP-D02 · P2 | Sans préchargement, une indisponibilité du module remplace l'éditeur ; retour disponible : le pseudo saisi a disparu. Reproduit dans Chromium. | Formulaire conservé avec alerte et écritures désactivées pendant l'indisponibilité ; l'autorisation reste distincte de la disponibilité, le changement de compte ou de droits réinitialise la portée. | Clos après vérification client |
| REP-D03 · P2 | La lecture directe de `sessionStorage` pour une alerte fait tomber la page lorsque le stockage est refusé. Son producteur a été retiré de la création minimale lors de la passe précédente. | Chaîne locale supprimée, ainsi que les props et parseurs associés ; avertissements conservés pour les véritables mutations de coordonnées. | Clos après vérification client |
| REP-D04 · P2 | Entrée dans le champ Email ne soumet pas le dialogue : les champs ne sont pas dans un vrai formulaire. Reproduit dans Chromium. | Soumission native unique, validation et retours focalisables, attente distincte d'une actualisation ; trois types de coordonnées, double envoi, annulation et succès exercés. Le retour de focus après Annuler était déjà correct dans le contrôle initial : il est préservé, pas présenté comme un ancien défaut. | Clos après vérification client et HTTP |
| REP-D05 · P2 | Après conflit, la relecture remplaçait les versions mais conservait tout l'ancien formulaire : le libellé distant « Professionnel » était remplacé par « Personnel », intact chez l'éditeur. Reproduit dans un complément du banc avant correction. | Fusionner les seuls champs modifiés avec la version courante ; email local et libellé distant conservés, vérifiés en simulation puis dans les données PostgreSQL via le vrai parcours. | Clos après vérification client et HTTP |
| REP-D06 · P2 | Le contrôle des clés d'historique utilisait les propriétés héritées : une section `constructor` ou `__proto__` provoquait une erreur interne au lieu d'un refus de validation. | Accepter seulement une propriété propre du catalogue. Quatre régressions reproduites avant correction ; huit tests ciblés réussis après correction, refus 400 vérifié sur base isolée puis HTTP. La limite de deux entrées reste inchangée. | Clos après vérification ciblée, SQL et HTTP |
| REP-D07 · Amélioration | Le bandeau réimplémente la présentation de page et le retour après suppression perd le contexte filtré de départ. | Bandeau partagé via la composition existante et retour sûr après suppression. Aucun nouveau composant générique ; `EntityDetailLayout` et `EntityDangerZone` ont chacun cette fiche comme seul consommateur actif identifié. | Vérifié côté client et HTTP |
| REP-D08 · P2 | En variante compacte, le pseudo et la naissance référencent des aides `aria-describedby` qui ne sont pas rendues. | Référencer l'erreur lorsqu'elle existe, l'aide seulement lorsqu'elle est affichée. Contrôle des identifiants décrits dans le DOM des composants et de la page réelle. | Clos après vérification client et HTTP |
| REP-D09 · P2 | Une modification concurrente peut être enregistrée entre la lecture de la fiche et celle de son dernier audit : identité et version anciennes associées à une provenance nouvelle. Reproduit sur PostgreSQL isolé à la frontière de lecture d'audit. | Lire la fiche et sa provenance dans une transaction courte à instant cohérent (`RepeatableRead`). DTO et contrôles de version des mutations inchangés. Même régression SQL réussie après correction ; le parcours HTTP vérifie la provenance, sans rejouer cet entrelacement précis. | Clos après vérification SQL |
| REP-D10 · P2 | La provenance ouverte invalidait son contenu lors d'un changement de version sans relancer la lecture ; la requête n'avait pas de délai. Constats de lecture du composant, distincts de la baseline navigateur. | Relancer la lecture tant que la provenance est ouverte, annuler les réponses dépassées ou fermées, borner l'attente à quinze secondes et permettre de fermer puis réessayer. Changement de version pendant ouverture et délai exercés. | Clos après vérification client |

La lisibilité des coordonnées longues et les réponses tardives après fermeture
font également partie des contrôles. Les garanties non rejouées restent des
limites ; une hypothèse sans défaut établi n'est pas une fonctionnalité à ajouter.

La suppression gagne aussi un délai borné et conserve sa clé lors d'une
réponse incertaine, y compris après fermeture et réouverture de la confirmation.
Un succès confirmé est séparé de la navigation et garde un bouton de retour.
L'échec propre du routeur après succès n'a pas été injecté dans le banc HTTP.
La perte de réponse après suppression réellement
enregistrée, la réouverture avec même clé et le retour filtré sont vérifiés
dans le banc HTTP. Les écritures d'identité et de coordonnées utilisent leur
version ; une issue incertaine impose une relecture avant reprise et ne
déclenche pas de nouvelle mutation automatique.

Les fonctions de construction, comparaison et fusion des brouillons de
coordonnées sont extraites dans
[person-child-draft.ts](../../apps/web/src/features/persons/person-child-draft.ts).
Le dialogue conserve les interactions et leurs retours. Cette séparation
locale garde les budgets de complexité sans créer un moteur de formulaire.
La hauteur des lignes de libellé de l'identité est alignée à 24 pixels, afin
que la présence d'un bouton de provenance ne décale pas les champs voisins.

## Preuves et limites

Le banc client a reproduit cinq cas avant correction : réutilisation du
préchargement et du brouillon après changement de compte, réponse PATCH tardive,
perte de saisie après indisponibilité, stockage refusé et absence de soumission
par Entrée dans Email. Le cadre, les données, les permissions et les réponses
sont simulés ; les composants et leurs comportements navigateur sont réels.
Les [cinq reproductions avant correction](fiche-personne-2026-10-12/banc-client/preuves/avant-5.json)
sont archivées ; `pass` signifie ici que le défaut attendu a été reproduit.
Le [complément coordonnées](fiche-personne-2026-10-12/banc-client/preuves/avant-coordonnees-2.json)
ajoute la reproduction de la fusion incorrecte et un contrôle déjà réussi de
focus après Annuler : **six défauts démontrés et un contrôle de non-régression**,
pas sept défauts.

Le [protocole client](fiche-personne-2026-10-12/banc-client/README.md) et les
[trente parcours après correction](fiche-personne-2026-10-12/banc-client/preuves/apres-30.json)
réussissent dans Chromium : six compositions aux largeurs 320, 390, 768,
1 024, 1 440 et 1 920 pixels, puis 24 parcours ciblés. Identité, trois dialogues,
menus, descriptions accessibles, changements rapides de portée, disponibilité,
stockage refusé, conflits et fusion, issue inconnue, délai, relecture, principal,
suppression, copie, provenance et StrictMode sont couverts. Les timeouts sont
accélérés dans ce banc. Composants, CSS, hooks et client API sont réels ; session,
API, routeur, disponibilité et presse-papiers sont simulés. Le cadre est
simplifié, avec Arial de secours : ce rendu ne qualifie pas à lui seul le cadre
Next ni les polices du site.
Après l'extraction du helper, les deux contrôles de fusion et de contrat
téléphone/social sont rejoués avec succès et archivés dans ce même protocole.

La correction locale de `PersonIdentityFields.tsx` passe le lint ciblé. Cela
ne remplace pas le contrôle des identifiants accessibles dans le navigateur.
Le [banc serveur](fiche-personne-2026-10-12/banc-serveur/README.md) et ses
[observations](fiche-personne-2026-10-12/banc-serveur/observations.json)
consignent **71 tests réussis dans cinq fichiers, dont trente scénarios
PostgreSQL**. Les 52 migrations existantes sont appliquées à une base neuve
exclusive, PostgreSQL 17 sur boucle locale. Aucun changement de schéma.

Ces scénarios vérifient droits, versions absentes/périmées/futures, no-op,
concurrence, plafond et principal des trois collections, propriété des enfants,
avertissement de doublon sans identité de l'autre fiche, changement de réseau,
historique chiffré, rollback en cas d'échec d'audit et suppression avec cascade,
purge des valeurs, trace minimale et répétition idempotente. Les cookies et
en-têtes sont simulés, les sessions MFA préparées en SQL : ce banc ne prouve
ni connexion par mot de passe/TOTP, ni transport HTTP, ni CSRF.

La reproduction de REP-D09 interpose une extension Prisma pour ordonner un
vrai commit entre deux lectures, sans fabriquer leurs résultats. Avant
correction, la réponse mélange les versions ; après correction, elle reste
cohérente et la prochaine lecture observe la nouvelle version. Cette preuve
ne mesure pas la fréquence de la course en production et ne promet pas qu'une
fiche reste inchangée après la fin de sa lecture.

Le [protocole HTTP](fiche-personne-2026-10-12/banc-integration/README.md) et les
[treize parcours HTTP](fiche-personne-2026-10-12/banc-integration/resultats.json)
réussissent avec Next de production, connexion/MFA, contrôles CSRF, PostgreSQL
isolé et Chromium 149.0.7827.55. Ils couvrent préchargement et retour filtré,
conflits d'identité et de coordonnées, perte de réponse après commit d'identité,
les trois coordonnées, principal remplacé, doublon légitime, provenance,
lecture seule, refus anonyme, retrait de droits pendant PATCH et DELETE, et
suppression après réponse perdue avec même clé. Deux pertes de réponse sont
injectées après des commits réels. Composition vérifiée à 320, 390 et 1 440
pixels, plus paysage 844 × 390 ; les dimensions sont émulées.

Une régression intermédiaire de cette passe a été détectée par le parcours
réel de téléphone : le formulaire transmettait les propriétés calculées par
sa validation locale au schéma d'entrée strict du serveur. Le payload reste
désormais celui du contrat public ; téléphone et réseau social sont exercés
dans les bancs client et HTTP. Ce problème introduit puis résolu pendant la
passe n'est pas présenté comme un défaut du commit de départ. De même, un
sélecteur Copier trop précis dans le banc simulé a été corrigé : il ne prouvait
pas une panne du produit.

La suite web générale réussit **1 240 tests**, avec **163 ignorés**, dans
102 fichiers réussis et neuf ignorés. Les trente nouveaux scénarios SQL sont
ignorés sans variable de base dans cette suite ; leur exécution dédiée figure
dans les 71 tests serveur ci-dessus et ne s'ajoute pas une seconde fois au
total général. Après extraction et alignement des libellés, la suite générale
et les treize parcours HTTP sont relancés avec succès sur le dernier build.
Compilation de production, lint, types, budget d'architecture et budgets de
performance réussissent ; la route de fiche mesure **262 957 octets gzip**
selon le script du dépôt. Cette mesure de bundle ne vaut pas un test de charge.
Le contrôle documentaire réussit sur **240 fichiers et 1 595 liens locaux et
index**. Serveurs Next et PostgreSQL temporaires arrêtés, ports 3125 et 54620
libérés, deux dossiers temporaires d'intégration et dix dossiers client supprimés.
Leurs variables privées, secrets MFA, marqueur et journal initial sont retirés ;
le scan des secrets temporaires sur les 48 chemins modifiés ou nouveaux est
réussi avant nettoyage. Aucun accès ni modification de la base habituelle.

Limites à conserver dans le verdict final : pas de lecteur d'écran humain,
pas de qualification de tous les navigateurs physiques ou extensions, pas de
charge concurrente de production, pas de restauration de sauvegarde ni de
qualification juridique de la conservation. La suppression de données de
test ne prouve pas ces garanties d'exploitation.
