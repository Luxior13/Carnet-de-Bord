# Suivi — Erreur, page introuvable et chargement

## État courant — 11 octobre 2026

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

## Contrôles et limites

Q01–Q04, Q07, Q10, Q19, Q27, Q28 et Q30 examinés ; autres sujets hors impact
pour ces états de présentation sans nouvelle action métier, stockage ni accès.

[Audit du 11 octobre](../../audits/AUDIT_PAGES_RESTANTES_2026-10-11.md) : composants
réels dans Chromium isolé à 320, 390, 768 et 1 440 px, sans débordement horizontal
ni erreur JavaScript. Les captures d’erreur et d’introuvable sont conservées.
Ce contrôle de rendu ne déclenche pas une panne réelle du routeur Next.

| ID | Point | Suite / déclencheur | Responsable / état |
| --- | --- | --- | --- |
| ETAT-01 | Déclenchement réel du boundary, réessai et route absente non joués dans le serveur Next pendant cette passe | Déclencher ces états dans l’environnement dédié avant conclusion d’intégration complète | À attribuer / à vérifier |

Au prochain changement : l’issue reste-t-elle utilisable au clavier, une erreur
longue tient-elle sur petit écran, et le réessai recharge-t-il bien la ressource
qui a échoué sans répéter silencieusement une mutation ?
