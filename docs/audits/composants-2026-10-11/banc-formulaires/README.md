# Banc des barres de formulaire — 11 octobre 2026

Depuis la racine :

```powershell
node docs/audits/composants-2026-10-11/banc-formulaires/run.cjs
```

`AUDIT_ONLY` filtre facultativement les noms de scénarios. Chaque exécution crée
un dossier temporaire `noctambule-savebars-*`, annoncé au démarrage, contenant
les captures et `observations.json`.

Le banc compile les composants réels et les styles du projet. Les contextes de
compte, les liens/navigation Next et les réponses HTTP sont simulés. Le routeur
de test réutilise celui du banc des barres de sections. Les données, comptes et
adresses sont fictifs ; aucune base, session réelle ou clé n'est utilisée.

## Périmètre et scénarios

À 320, 390, 768 et 1 440 px :

- Mon compte : saisie du profil, apparition de la barre, annulation, restitution
  des valeurs et maintien d'un focus clavier utile.
- Fiche Utilisateur : mêmes contrôles sur le profil ; résumé des changements
  d'autorisations après changement de rôle, avertissement de déconnexion,
  annulation, bouton Enregistrer désactivé sans modification ; modification
  puis annulation d'une permission personnelle, action Réinitialiser au rôle.
- Créations Utilisateur et Personne : vrai formulaire, requête retardée,
  double soumission bloquée, Annuler neutralisé aussi avec Entrée pendant
  l'attente, erreur 400 puis saisie conservée et actions à nouveau disponibles.
- Ligne de paramètre : barre inline, Annuler actif sans changement, retour du
  focus à Modifier, sauvegarde impossible sans modification ou si valeur
  invalide/conflit ; Entrée, blocage pendant sauvegarde et absence de doublon.

Scénarios supplémentaires :

- Mon compte, 390 px : Entrée envoie une seule requête malgré deux soumissions
  supplémentaires pendant l'attente ; 409, actualisation distincte de
  l'enregistrement, conservation du brouillon après lecture de la version récente.
- Fiche Utilisateur, 390 px : soumission par Entrée une seule fois, conflit 409,
  saisie conservée et nouvel enregistrement bloqué jusqu'à résolution.
- Barre isolée à 320 px : très long détail de conflit et long libellé d'action,
  absence de débordement et de recouvrement du champ focalisé, accès aux actions.
- Autorisations en paysage 900 × 480 px : sélecteur focalisé non masqué et
  accès aux actions de la barre.

Chaque cas vérifie aussi l'absence d'erreur JavaScript et de débordement global.
Le banc de composition traite séparément `PersonIdentitySection` : ses scénarios
ne sont pas comptés ici.

## Défauts révélés pendant la passe

- Les barres de profils disparaissaient après Annuler en laissant le focus sur
  le document. Le même défaut concernait les permissions personnelles ; pour
  les autorisations administratives, le bouton Annuler restant en place mais
  devenant désactivé faisait aussi perdre le focus.
- Une barre collante pouvait couvrir le sélecteur de rôle focalisé sur petit
  écran, ainsi qu'un champ précédant un long message de conflit.

Les quatre consommateurs rendent désormais le focus à un champ éditable ou à
un contrôle de permission après annulation. La barre reste dans le flux normal
sous 768 px de largeur ou jusqu'à 600 px de hauteur de fenêtre ; elle conserve
son comportement collant aux autres dimensions.

## Résultat final

[32 scénarios réussis](observations.json) après corrections, avec Chromium
149.0.7827.55. Les cas de focus et de recouvrement ci-dessus ont été réexécutés.

Captures après correction :

- [Autorisations sur 390 px](access-390.png) : barre après les contrôles,
  sélecteur de rôle focalisé visible.
- [Mon compte après conflit et actualisation, 390 px](account-conflict-390.png) :
  version récente signalée, brouillon conservé.
- [Conflit à long contenu, 320 px](long-conflict-320.png) : texte et actions
  accessibles, champ précédent non recouvert.

## Limites

Les résultats ne prouvent pas les contrôles d'accès serveur, les mutations en
base, les mécanismes Next de navigation ni une session authentifiée complète.
Le réglage utilise le vrai `SystemSettingRow` avec un contrôleur minimal simulé ;
la confirmation métier d'une réduction de conservation n'est pas rejouée.
La police est une police de repli. Le lecteur d'écran et les navigateurs autres
que Chromium ne sont pas testés par ce banc.
