# Suivi — Erreur, page introuvable et chargement

## État courant — clôture du socle du 13 octobre 2026

La [revue finale du socle](../../audits/AUDIT_CLOTURE_SOCLE_2026-10-12.md) est
terminée au périmètre livré, pour poursuivre le développement métier. Ses
preuves et limites ne constituent pas une qualification de déploiement.

Les états partagés ont été revérifiés côté client et le panorama réel retrouve
les refus et la route 404 attendus. Les preuves de panne racine et de reprise du
12 octobre restent datées ; ce passage n’ajoute aucune promesse de disponibilité
en déploiement.

Les décisions et preuves datées ci-dessous restent conservées. Une nouvelle
revue répond à un changement, un défaut constaté ou une règle nouvelle.

## État courant — 12 octobre 2026

Les états de route doivent expliquer absence, erreur ou attente et proposer
une issue adaptée, sans introduire de fonction métier ni de permission propre.
La seule page publique reste `/login` ; une destination privée introuvable ne
dispense pas de la vérification de session. Une fonction prévue mais non livrée
reste introuvable, sans faux écran de préparation présenté comme utilisable.

Cette passe clôt ETAT-01 à la portée vérifiée sur Next : erreur, rechargement,
route absente, chargement et panne du cadre. Le
[rapport du 12 octobre](../../audits/AUDIT_ETATS_TECHNIQUES_2026-10-12.md)
sépare les constats de code, le navigateur simulé et l'intégration réelle.

Écarts corrigés : l'erreur ne proposait que Réessayer, malgré la sortie accueil
annoncée dans le suivi ; après disparition du contrôle précédent, son focus
restait sur le document ; la branche publique manquait de repère `main`.
Le banc client vérifie désormais ces parcours sur les composants réels avec
contexte simulé, dans treize scénarios réussis. Le chargement nommé
sans texte enfant est une observation sémantique, pas une panne de lecteur
d'écran démontrée. Le digest long contenu et le message interne masqué étaient
déjà corrects dans le contrôle initial.

Décision de reprise du 12 octobre : le boundary propose « Recharger la page »
par rechargement GET du document, avec verrou dès l'activation, et un lien
accueil natif indépendant du routeur client. `RouteErrorState` partage le
message sûr et le titre focalisé ; le repère `main` appartient soit au cadre
privé, soit à l'état autonome. Le `reset` local de Next ne constitue pas à lui
seul une preuve de nouvelle lecture serveur. Aucun rejeu automatique d'une
écriture, aucune promesse de sauvegarde ou d'annulation n'est ajouté.

La panne racine reproduite sur PostgreSQL arrêté affichait un écran anglais
sans action, HTTP 500, avec récupération par rechargement manuel. Le nouvel
état autonome français charge styles et polices, focalise le titre et permet
la reprise par le bouton après redémarrage. La première mesure à largeur 390 px
était réalisée dans un contexte de bureau. La meta viewport est maintenant
explicite dans le document autonome et vérifiée en contexte mobile, y compris
par navigation à froid : largeur 390 px et aucun débordement. La mesure avant
correction n'avait pas démontré de défaut d'échelle.
Les anciennes redirections
notifications/journal vers la feuille de route restent valides ; seules les
autres destinations non livrées sans alias sont introuvables. Une réponse
introuvable peut être déjà diffusée avec HTTP 200 dans le catch-all, tandis
qu'une URL sans route donne 404 ; le banc distingue les deux.

Les squelettes spécifiques restent utiles : retour contextuel sûr déjà lu par
la fiche utilisateur ; libellé sans faux lien pendant le chargement de la fiche
personne, puis vrai retour filtré. Aucun chargement ne doit inventer des données
ni promettre qu'un travail serveur a été sauvegardé ou annulé.

## État historique — 11 octobre 2026

Propriétaires : [erreur](../../../apps/web/src/app/error.tsx),
[page introuvable](../../../apps/web/src/app/not-found.tsx) et
[chargement](../../../apps/web/src/app/loading.tsx). Ce sont les états partagés du
routeur, sans route métier ni permission propre.

- Erreur et page introuvable reprennent les surfaces partagées et un rayon de
  panneau de 10 px. Le message reste lisible sans exposer la pile d’erreur.
- La référence technique d’une erreur peut revenir à la ligne pour contenir un
  identifiant long. Conserver les issues existantes : réessayer et accueil.
- Le chargement utilise déjà le squelette partagé ; code examiné, sans retouche.
- Aucun texte ne promet une sauvegarde ou une annulation de mutation serveur.

## Contrôles historiques — 11 octobre 2026

Q01–Q04, Q07, Q10, Q19, Q27, Q28 et Q30 examinés ; autres sujets hors impact
pour ces états de présentation sans nouvelle action métier, stockage ni accès.

[Audit du 11 octobre](../../audits/AUDIT_PAGES_RESTANTES_2026-10-11.md) : composants
réels dans Chromium isolé à 320, 390, 768 et 1 440 px, sans débordement horizontal
ni erreur JavaScript. Les captures d’erreur et d’introuvable sont conservées.
Ce contrôle de rendu ne déclenche pas une panne réelle du routeur Next.

## Suivi courant — 12 octobre 2026

Le [banc client](../../audits/etats-techniques-2026-10-12/banc-client/README.md)
termine à 13/13 : six largeurs, clavier et focus, GET unique malgré une double
activation, erreur persistante, texte agrandi, digest long et chargement nommé.
Les cinq contrôles HTTP finaux exercent déjà authentification, vraie route
absente, catch-all et panne de PostgreSQL avec reprise. Quatre sondes Next
réelles dans une copie temporaire prouvent aussi les erreurs serveur/client,
la nouvelle lecture après rechargement, la sortie d'une erreur persistante et
le chargement diffusé. Le viewport mobile autonome est vérifié. Le rapport
précise les versions, commandes, limites et contrôles généraux.

| ID | Point | Suite / déclencheur | Responsable / état |
| --- | --- | --- | --- |
| ETAT-01 | Déclenchement réel du boundary, réessai et route absente non joués pendant la passe du 11 octobre | Cinq contrôles HTTP et quatre sondes Next réussis ; copies temporaires distinguées des routes du produit | Clos sur le périmètre vérifié |
| ETAT-02 | Sortie accueil absente du rendu d'erreur malgré la règle suivie | Issue native et navigation vérifiées dans le banc client | Clos sur le périmètre vérifié |
| ETAT-03 | Panne du layout racine : écran anglais sans action, confirmé par arrêt réel de la base | État autonome français et reprise après retour du service vérifiés sur Next réel ; viewport mobile suivi séparément | Clos sur le périmètre vérifié |
| ETAT-04 | Focus après erreur et repère principal de la branche publique | Titre focalisé, clavier et repère unique vérifiés ; focus également observé dans la panne racine réelle | Clos sur le périmètre vérifié |
| ETAT-05 | Reset local sans nouvelle lecture après disparition d'une panne serveur | Défaut reproduit sur la sonde Next ; rechargement GET et reprise vérifiés après correction | Clos sur le périmètre vérifié |
| ETAT-06 | Meta viewport absente du nouvel état racine autonome ; aucun défaut d'échelle démontré | Meta explicite, navigation mobile à froid, largeur 390 px et absence de débordement vérifiées | Omission corrigée et vérifiée |

Au prochain changement : l’issue reste-t-elle utilisable au clavier, une erreur
longue tient-elle sur petit écran, et le réessai recharge-t-il bien la ressource
qui a échoué sans répéter silencieusement une mutation ?
