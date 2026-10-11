# Banc client — Paramètres système

Revue commencée le 11 octobre 2026 au commit `c67e055`. Passe finale exécutée
le **12 octobre 2026 à 00 h 03, Europe/Paris**, avec les corrections locales de
la revue. Le dossier conserve la date de début.
[Métadonnées de la passe finale](preuves/execution.json).

Le banc charge `SystemSettingsPage`, son contrôleur, `SystemSettingRow`, les
composants partagés et les styles réels du dépôt. Il reprend le montage des
audits précédents, notamment les confirmations du banc Modales. API, acteur,
navigation Next et shell authentifié sont simulés. Les preuves de mot de passe
et de MFA sont fictives ; aucune configuration, session ou base réelle utilisée.

Depuis la racine du dépôt, dépendances et Chromium installés :

```powershell
node docs/audits/parametres-complet-2026-10-11/banc-client/run.cjs
```

Le script affiche son dossier temporaire, ferme le serveur et Chromium en fin
d'exécution et fournit observations JSON/captures. `AUDIT_ONLY` filtre les noms
des scénarios ; retirer cette variable pour exécuter les 30 parcours. Les champs
de preuve sont exclus des charges utiles consignées. Les erreurs de navigateur
peuvent citer une valeur fictive de test, jamais une preuve réelle.

## Preuves exécutées

| Passe | Résultat | Interprétation |
| --- | --- | --- |
| [Passage réduction vers preuve, avant correction](preuves/transfert-focus-avant.json) | 0/1 | Le champ de durée derrière le dialogue reprend le focus après ouverture du mot de passe |
| [Preuve refusée, avant correction](preuves/preuve-refusee-focus-avant.json) | 0/1 | Le focus reste sur le conteneur du dialogue, le champ étant encore désactivé lors de la tentative de focus |
| [Preuve refusée, après correction](preuves/preuve-refusee-focus-apres.json) | 1/1 | Le champ est réactivé puis refocalisé |
| [Passe intermédiaire](preuves/passe-intermediaire-27.json) | 22/27 | Quatre scénarios révèlent les défauts de focus ; un cinquième avait une attente erronée sur un override de permission |
| [Passe finale du 12 octobre](preuves/parcours-30-apres.json) | **30/30** | Tous les scénarios ci-dessous, avec contrat de réparation et corrections de focus intégrés |

Les cinq échecs intermédiaires ne sont pas tous des défauts produit. Deux
concernaient le focus après refus GET 403 JSON/non JSON, un le passage entre
confirmations et un la preuve refusée. Le dernier supposait à tort qu'un override
`settings:update: false` retire l'édition à ADMIN : les paramètres sont liés au
rôle et cet override n'est pas attribuable. Le banc vérifie désormais la règle
réelle, sans inventer une variante de permission.

Les 11 tests existants de contrats des sous-composants de la fiche utilisateur,
consommatrice du dialogue partagé, passent. Le lint du dialogue partagé passe
sans avertissement. Les tests du contrôleur, les contrats serveur, l'intégration
SQL/Next et la validation globale restent distincts de ces preuves navigateur.

## Couverture

- Lecture et édition à **320, 390, 768, 1 024, 1 440 et 1 920 px**. Mesures du
  document et du contenu principal : aucun débordement horizontal. Captures
  inspectées à 320, 1 440 et 1 920 px.
- Ouverture au clavier et focus initial ; ajustement −/+ par clic et
  clavier, flèches natives, bornes 365–3 650 jours. Saisies vide, fractionnaire et
  hors bornes conservées et signalées, actions bloquées. Molette réelle sur le
  champ focalisé sans modification involontaire ; Annuler referme sans écriture
  et rend le focus à Modifier.
- Attributs sans autocomplétion sur durée et preuve. Rétablir le défaut conserve
  le focus ; `01095` est reconnu comme numériquement égal à `1095`.
- Entrée native déclenche une écriture ; deux soumissions supplémentaires pendant
  la réponse lente ne produisent aucun PUT supplémentaire. Champ et actions
  restent bloqués jusqu'à réception, puis focus à Modifier.
- Actualisation et navigation avec brouillon : confirmations explicites,
  annulation conservant la saisie et le focus du déclencheur. Actualiser conserve
  le focus pendant une requête lente et ignore l'activation répétée.
- Erreur initiale puis nouvelle tentative, catalogue incomplet refusé, erreur
  d'actualisation conservant le brouillon et reprise explicite. Refus GET 403,
  JSON ou non JSON, retire les valeurs et focalise la région d'accès refusé.
- Conflit de version : échec de relecture puis reprise, brouillon préservé,
  choix « Conserver ma saisie » ou « Utiliser la valeur actuelle », focus au
  champ et version attendue exacte dans le PUT suivant.
- PUT ambigu : simulation d'écriture suivie d'une perte réseau, ou réponse 500
  sans modification. Nouvelle écriture bloquée jusqu'à la vérification explicite.
  Adopter la valeur relue après écriture ne la rejoue pas ; conserver le
  brouillon après 500 permet une nouvelle confirmation volontaire.
- Réduction : Annuler garde la saisie ; confirmation ouvre une preuve de mot
  de passe, saisie incorrecte puis correcte, retour au champ réactivé et succès.
  Les preuves MFA `full` et `critical-mfa` du même dialogue sont exercées dans
  une fixture dédiée : code refusé effacé, focus revenu au code, puis succès.
- Valeur stockée invalide : « Durée proposée », diagnostic de conservation
  bloquée, édition de `1095` autorisée même sans changement numérique,
  confirmation de réparation et preuve récente ; réponse simulée valide,
  version 4→5 et retour au mode lecture.
- Changement d'acteur pendant PUT et perte d'accès pendant la preuve : aucun
  résultat tardif réinjecté dans l'ancienne portée, dialogue retiré. Refus USER
  sans requête et ADMIN avec override non attribuable conforme à la règle réelle.
- Montage StrictMode et confirmation sur viewport 390 × 550 px en couleurs
  forcées. Le mode lecture est l'état de repos de la page ; aucune capacité
  administrative de consultation seule n'est créée pour ce test.

## Correctif partagé possédé par ce banc

`AdminStepUpDialog` refocalise la preuve après le rendu qui réactive les champs.
Le callback différé vérifie que le dialogue est toujours monté ; le mot de passe
est sélectionné pour sa correction et un code refusé reste effacé. Le parcours
mot de passe et les deux variantes MFA passent. Aucun changement de validation,
de politique de preuve ou d'API n'a été ajouté à ce dialogue.

Les autres corrections de la page appartiennent au contrôleur/composants
Paramètres : ce banc les vérifie sans modifier leur logique.

[Lecture bureau](preuves/lecture-1440.png) ·
[Lecture mobile](preuves/lecture-320.png) ·
[Édition mobile](preuves/edition-320.png) ·
[Édition grand écran](preuves/edition-1920.png).

## Limites

Le faux serveur implémente explicitement le DTO `isStoredValueInvalid` et les
versions. Ces simulations n'établissent pas le comportement des projections,
permissions serveur, cookies, preuves réelles, CSRF, transactions ni maintenance.
Le scénario « écriture puis réponse perdue » modifie uniquement une variable du
banc. Aucun journal réel purgé et aucune réparation en base exécutée ici.

Le shell utilise une réservation latérale de 240 px sur bureau ; il ne remplace
pas le rendu Next authentifié. Chromium seul : pas de lecteur d'écran, Safari/iOS,
zoom natif ou clavier virtuel réel. L'autocomplétion est contrôlée par attributs,
pas par une extension installée. Les timeouts, initialisation lente, expiration
de preuve et fermeture avant callback RAF sont inspectés mais ne possèdent pas
de scénario navigateur distinct dans cette passe. Aucune mesure de performance
serveur n'est déduite du banc.
