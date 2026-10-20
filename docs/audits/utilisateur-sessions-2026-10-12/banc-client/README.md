# Banc client ciblé — sessions administratives

Exécuté le 12 octobre 2026, de 22 h 52 à 22 h 57, heure de Paris, à partir de
`2ecb215` puis avec les corrections locales. Périmètre : lectures et révocations
des sessions dans `/systeme/utilisateurs/[id]`, défi de réauthentification requis
par ces actions, reprises et retour du focus. Les autres mutations de la fiche
et les resets de mot de passe/MFA ne sont pas rejoués.

Le banc utilise les vrais `UserDetailPage`, `UserSecurityTab`,
`AdminStepUpDialog`, confirmations, primitives, cadre authentifié et CSS. Le
compte, le snapshot initial, les sessions, les réponses API et le routeur Next
sont simulés ; aucune base ni session réelle n’est utilisée. La preuve du défi
est fictive, jamais archivée dans les traces. Les captures portent uniquement
sur la carte Sessions. L’horloge Chromium avance de 31 secondes pour observer
les délais de 30 secondes. Les polices Next réelles ne sont pas chargées ; la
police calculée de chaque élément n’est pas vérifiée.

## Exécution

Depuis la racine, avec les dépendances du dépôt et Chromium installés :

```powershell
node docs/audits/utilisateur-sessions-2026-10-12/banc-client/run.cjs
```

Le chemin temporaire est affiché au démarrage. Serveur et navigateur sont fermés
à la fin. `AUDIT_ONLY` filtre les noms de scénario. Pour reproduire l’état initial,
`AUDIT_BEFORE=1` lance les sept constats et `AUDIT_BASELINE_DIR` désigne un dossier
contenant les copies de `UserDetailPage.tsx`, `UserSecurityTab.tsx` et
`AdminStepUpDialog.tsx` issues du commit de départ. Les chemins relatifs de ces
copies sont résolus dans les répertoires produit d’origine, sans modifier le dépôt.

## Preuves

- [Avant : sept constats reproduits](preuves/avant-7.json). « pass » signifie
  ici que le comportement défectueux attendu a bien été observé.
- [Défi, avant correction du retour de focus](preuves/defi-focus-avant.json) :
  délai corrigé, mais focus encore sur `BODY` après Annuler et après succès,
  y compris après une attente de cinq secondes.
- [Après : onze parcours réussis](preuves/apres-11.json).
- [Complément final : avertissement dans la carte Sessions, deux cas réussis](preuves/notice-sessions-apres-2.json),
  avec [capture à 1 440 px](preuves/notice-sessions-1440.png).
- [Mon compte : huit parcours rejoués après extraction du helper partagé](preuves/mon-compte-helper-partage-8.json),
  avec le [banc dédié inchangé](../../mon-compte-securite-2026-10-12/banc-client/README.md).
- [Titre masqué avant à 390 px](preuves/avant-focus-390.png),
  [visible après à 390 px](preuves/apres-focus-390.png) et
  [visible après à 1 440 px](preuves/apres-focus-1440.png).

| Parcours | Observation après correction |
| --- | --- |
| GET sessions suspendu 31 s | Délai expiré, erreur locale, Réessayer charge les données |
| DELETE global suspendu 31 s | Attente bornée, confirmation libérée, résultat incertain et relecture ; un seul DELETE |
| DELETE renvoie 500 JSON | Avertissement persistant, relecture, aucun rejeu de mutation |
| Réponse DELETE perdue après commit simulé | Relecture remplace quatre anciennes lignes par les trois sessions restantes ; un seul DELETE |
| Reprise et titre masqué, 390 px | Focus au titre visible vers y=119,95, sous la barre y=56–105 |
| Reprise et titre masqué, 1 440 px | Focus au titre visible vers y=120,05, sous la même barre |
| POST du défi suspendu 31 s | Délai expiré, Annuler réactivé, focus au champ de preuve ; aucun second DELETE |
| Geste clavier durant une reprise GET lente | La réponse ne reprend pas le focus déplacé vers la navigation |
| DELETE refuse par 403 non JSON | Anciennes lignes retirées, une seule mutation |
| Défi puis Annuler | Sessions conservées, aucune preuve envoyée, retour au titre Sessions visible |
| Défi confirmé puis révocation | Une demande refusée puis une reprise autorisée, un POST de preuve, sessions retirées, titre visible focalisé |

Les mesures de focus portent sur le vrai `main` défilant. Les deux cas de
géométrie utilisent quinze sessions fictives avant révocation pour conserver
une page assez longue. Aucun débordement horizontal du document ou de `main`
n’est constaté dans ces deux cas. Avant correction, le titre focalisé restait
vers y=80 sous les onglets.

À 23 h 02, après déplacement du message d’incertitude depuis la carte « État du
compte » vers « Sessions actives », les deux cas 500 JSON et réponse perdue après
commit sont rejoués. Le banc vérifie explicitement l’appartenance du message à
`user-security-sessions-heading` et son absence de la carte d’état ; la capture
est inspectée. Les onze parcours et Mon compte ne sont pas répétés après cette
dernière modification de composition. Ce complément n’ajoute pas deux parcours
distincts aux onze déjà recensés.

## Limites

Ces essais ne prouvent pas la validité réelle des sessions datées des fixtures,
les transactions de révocation, les règles de preuve, le transport HTTP, ni
l’arrêt d’un traitement serveur après interruption du client. Ces points sont
distincts des tests serveur et de l’intégration authentifiée. La suspension du
corps HTTP après les en-têtes appartient aux tests du helper, pas à ce banc.
Les erreurs 401, les changements d’acteur, le double clic, les autres largeurs,
les appareils physiques et les lecteurs d’écran ne sont pas rejoués ici.

Le [suivi Utilisateurs](../../../pages/systeme/utilisateurs/README.md) porte
les décisions et la clôture de cette passe ciblée.
