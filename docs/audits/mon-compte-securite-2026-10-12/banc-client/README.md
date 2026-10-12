# Banc client ciblé — Mon compte, sécurité et reprises

Exécuté le 12 octobre 2026, de 22 h 22 à 22 h 24, heure de Paris. Cette passe
complète les contrôles précédents sans refaire l’audit complet du compte.
Point de départ : `c61ed03` ; résultat final avec les corrections locales.

Le banc charge les vrais `AccountPageContent`, `SecuritySection`, lignes de
session, confirmations Radix, onglets, cadre authentifié et styles du dépôt.
L’identité, les données, les réponses API et le routeur Next sont simulés.
L’horloge Chromium avance de 31 secondes pour vérifier la borne de 30 secondes.
Les dialogues mot de passe et configuration MFA sont remplacés par des composants
fermés : seule la lecture du statut MFA appartient à cette passe.
Les polices chargées par Next en production ne sont pas intégrées : le banc
fournit des variables de repli, sans vérifier la police finalement calculée par
chaque élément. Aucune base ni session réelle n’est utilisée.

## Exécution

Depuis la racine, avec les dépendances du dépôt et Chromium installés :

```powershell
node docs/audits/mon-compte-securite-2026-10-12/banc-client/run.cjs
```

`AUDIT_ONLY` filtre les noms de scénario. Le dossier temporaire est affiché au
démarrage ; serveur et navigateur sont fermés à la fin. `AUDIT_BEFORE=1` exécute
les cinq constats initiaux. Pour rejouer cette version, `AUDIT_BASELINE_SOURCE`
doit désigner une copie de `SecuritySection.tsx` issue du commit de départ ; son
répertoire de résolution reste celui du composant réel. Aucune substitution de
source ne s’effectue dans le dépôt.

## Preuves

- [Avant : cinq constats reproduits](preuves/avant-5.json).
  Le résultat « pass » signifie que le défaut attendu a été reproduit.
- [Focus tardif avant correction](preuves/focus-tardif-avant.json) : extrait de
  la première passe après correction des délais ; la relecture reprend le focus
  alors qu’il vient d’être placé sur le lien Profil.
- [Après : huit parcours réussis](preuves/apres-8.json).
- [Titre masqué avant, 390 px](preuves/avant-focus-390.png) ;
  [titre visible après, 390 px](preuves/apres-focus-390.png) ;
  [titre visible après, 1 440 px](preuves/apres-focus-1440.png).

| Contrôle | Avant | Après |
| --- | --- | --- |
| DELETE global suspendu pendant 31 s | Confirmation verrouillée, Échap et Annuler inutilisables | Requête interrompue, confirmation fermée, avertissement persistant et une relecture ; un seul DELETE |
| DELETE individuel réussi, GET suivant suspendu | Confirmation reste verrouillée sur la lecture | Confirmation fermée sans attendre GET ; erreur locale après le délai, Réessayer fonctionne |
| DELETE renvoie 500 JSON | Aucun GET après le premier chargement, aucun avertissement local persistant | Message de résultat non confirmé et GET de vérification ; aucun second DELETE |
| Focus après révocation à 390 et 1 440 px | Titre vers y=80 derrière la barre allant de y=56 à y=105 | Titre focalisé vers y=120, visible ; pas de débordement horizontal |
| GET retardé après fermeture, focus ensuite placé sur Profil | La réponse reprend le focus au titre Sessions | Focus Profil conservé à l’arrivée de la réponse |
| DELETE renvoie 403 non JSON | Non rejoué avant | Confirmation fermée, anciennes sessions retirées, erreur locale |
| Lectures initiales sessions et MFA suspendues | Non rejoué avant | Deux délais expirent, les reprises explicites chargent les données et rendent le focus |

Les deux largeurs du contrôle de focus constituent deux parcours, soit huit au
total. La carte longue utilise quatorze autres sessions fictives pour éviter un
recalage naturel dû à une page trop courte. Les mesures portent sur le vrai
conteneur `main` défilant, pas seulement sur `window.scrollY`.

## Limites

Ces preuves établissent les comportements du client avec fetch simulé et signaux
d’annulation. Elles ne prouvent ni la révocation SQL, ni l’autorisation serveur,
ni le transport HTTP réel, ni l’arrêt d’un traitement serveur lors de l’abandon
client. Les contrôles serveur et les tests unitaires du délai sont distincts.
Le corps HTTP suspendu après réception des en-têtes appartient aux tests du
helper, pas à ce banc. Les cas 401, perte de connexion réelle, double soumission,
changement d’acteur et parcours complets mot de passe/MFA ne sont pas rejoués ici.

Le [suivi Mon compte](../../../qualite/pages/mon-compte.md) rassemble les
décisions et la portée de cette correction.
