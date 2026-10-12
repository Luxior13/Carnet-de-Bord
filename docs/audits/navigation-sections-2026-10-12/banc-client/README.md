# Banc client — changement de section après défilement

Départ : `34fccaa2ce3b080d780d1d1d948b2bccc7562ed7`, 12 octobre 2026.

## Montage et limites

Le banc monte les vrais `PageSectionNavigation`, `PersistentAuthenticatedShell`,
`AuthenticatedLayout`, `PageIdentityHero`, conteneurs de page, primitives et garde
`useUnsavedNavigationGuard`, avec le CSS du dépôt. Le scroll mesuré appartient à
`main#main-content`, sous le vrai header. Le contenu des sections est explicitement
fictif : trente-cinq paragraphes permettent de distinguer un repositionnement voulu
du simple clamp du navigateur quand le contenu devient court.

Compte, disponibilités, routeur et `Link` sont simulés. Le routeur utilise
`history.pushState` ou `replaceState` et ne reproduit pas la restauration de scroll
de Next. Les dialogues obligatoires de sécurité restent fermés et sont remplacés.
La police utilise un remplacement local. Aucune donnée réelle, base, variable
`.env` ou session n’est employée ; une requête `/api/` ferait échouer le banc.

Ce montage isole les interactions du composant partagé. Il ne remplace pas les
parcours Next des véritables fiches Personne/Utilisateur et de Mon compte, dont
les hauteurs, chargements et remplacements de panneaux diffèrent.

## Avant correction

Les [trois observations](preuves/avant-3.json), exécutées le 12 octobre à 21 h 55
Europe/Paris, reproduisent le maintien d’un ancien scroll : `main.scrollTop=900`,
barre visible entre 56 et 105 px, mais titre de la nouvelle section à −616 px.
Ce constat est mesuré dans une navigation locale puis dans un `Link` simulé ;
le second cas ne démontre pas le comportement du routeur Next.

Le troisième parcours vérifie une annulation déjà correcte : « Rester » conserve
URL, saisie, scroll et focus du lien. Après confirmation, le nouveau contenu reste
masqué et l’historique passe de deux à trois entrées ; le parcours propre conservait
deux entrées. La garde réelle confirme alors via `router.push` malgré l’intention
`replace` de la barre. La mesure de focus après confirmation a été prise avant la
fermeture complète du dialogue et ne permet pas de conclure sur son retour final.

Dans ces preuves, `pass` signifie que le constat attendu a été reproduit.
La [capture à 390 px](preuves/avant-section-390.png) montre le nouveau contenu
commençant au milieu de sa liste fictive sous la barre.

## Après correction

**Huit parcours sur huit réussis**, le 12 octobre à 22 h 04 Europe/Paris.
Les [observations finales](preuves/apres-8.json) conservent les mesures du scroll,
de la barre, du titre et de l’historique. Captures inspectées :
[390 px](preuves/section-390.png) et [1440 px](preuves/section-1440.png).

| Cas | Vérifications exécutées                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–2 | Changement accepté à 390 et 1440 px : début du contenu visible sous la barre, focus sur le lien, remplacement d’historique conservé, sans remonter au bandeau.                                                                                                                                                                              |
| 3   | Même résultat à Entrée avec le chemin `Link`/routeur simulé, sans callback local.                                                                                                                                                                                                                                                           |
| 4   | Brouillon puis « Rester » : URL, saisie, scroll et focus conservés ; confirmation ensuite : début visible, focus du lien et historique inchangé.                                                                                                                                                                                            |
| 5   | Destination courte : début visible, clamp naturel admis ; le bandeau peut rester visible faute de hauteur à défiler.                                                                                                                                                                                                                        |
| 6   | Section active avec brouillon et URL initialement sans `section` : aucune confirmation ni navigation. Focus d’un autre lien et flèche horizontale sans scroll vertical. Resize vers 1920 px : flèches retirées, focus actif conservé, aucune commande verticale. Ctrl-clic ouvre une autre page et conserve section et scroll de la source. |
| 7   | Montage direct sur Coordonnées en StrictMode : pas de scroll initial. Changements externes d’URL, Back/Forward et actualisation du compte simulé ne remettent pas la page en haut.                                                                                                                                                          |
| 8   | Deux activations dans la même tâche : dernière section visible et focalisée, aucune entrée d’historique ajoutée.                                                                                                                                                                                                                            |

À 390 px, le scroll passe de 900 à 163 ; le titre cible arrive à 120,78 px sous
la barre finissant à 105 px. À 1440 px, il arrive à 121,39 px sous la barre finissant
à 105,39 px. Le nouveau repère absolu n’ajoute aucun espace : la
[mesure initiale](preuves/avant-geometrie.json) et la mesure après correction
conservent exactement, à 390 px, barre de 49 px, écart au contenu de 16 px,
scrollHeight de 3693 px et mêmes positions du bandeau et de la barre au repos.

Tous les cas contrôlent l’absence d’erreur JavaScript, de requête API et de
débordement horizontal du document ou du `main`.

La [passe intermédiaire](preuves/intermediaire-7-sur-8.json) contient un échec
d’oracle, pas un défaut produit confirmé : le resize de 390 à 1920 px change
la hauteur des paragraphes et l’ancrage natif ajuste `scrollTop` de 900 à 706.
Exiger 900 après ce repli de texte était incorrect. Le contrôle final garde
les changements de largeur réels et trace les commandes `Element.scrollBy` et
`scrollTo` : aucune commande verticale n’est émise pendant ce resize. Les
actions de clic, focus et flèche, avant le resize, conservent bien le scroll
exact ; le Ctrl-clic conserve ensuite la position issue de l’ancrage natif.

Le banc ne simule aucune réponse API tardive : ce composant partagé n’en reçoit
pas. La succession rapide concerne ses intentions d’activation, pas la gestion
des requêtes ou des versions d’un formulaire. Non exécutés ici : lecteur d’écran,
Firefox, Safari/iOS, zoom natif et restauration de scroll du routeur Next. Les
trois consommateurs réels sont exercés séparément dans le banc d’intégration.

## Reproduction

Depuis la racine, avec les dépendances du dépôt et Chromium installés :

```powershell
node docs/audits/navigation-sections-2026-10-12/banc-client/run.cjs
```

`AUDIT_ONLY` filtre les noms de parcours ; `AUDIT_BEFORE=1` active les trois
constats historiques et nécessite le code antérieur dans une copie isolée.
Le script affiche son dossier temporaire, ferme navigateur et serveur, écrit
`observations.json` et renvoie un code d’échec si une assertion échoue.

Les assertions sont dans [scenarios.cjs](scenarios.cjs). Les preuves sont copiées
explicitement depuis le dossier affiché ; les quatre dossiers temporaires de
cette passe ont été retirés après archivage.
