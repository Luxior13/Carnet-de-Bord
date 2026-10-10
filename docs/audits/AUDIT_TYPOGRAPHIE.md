# Audit typographique — 22 septembre 2026

> Rapport historique : résultats valables pour la passe décrite, non rejoués par
> la correction documentaire. Voir [l’index](README.md) et les [suivis courants](../qualite/pages/README.md).
> Les chemins indiqués comme historiques peuvent désigner des fichiers retirés.

## Périmètre et méthode

Revue des 129 fichiers TSX, de la feuille CSS globale, des constantes TS et des
primitives UI : familles, tailles, graisses, interlignages, espacement des lettres,
titres sémantiques, textes tronqués, champs, tableaux, métadonnées et notifications.
L'inventaire AST des titres et des surcharges de champs a été complété par des
mesures de styles calculés dans Chromium, avec les polices réellement chargées.

## Constats et corrections

| Sujet                      | Constat                                                                                     | Correction                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Famille principale         | Geist était bien chargée et utilisée                                                        | Déclaration `font-sans` explicite sur le document ; variables Next conservées     |
| Notifications Sonner       | Police système et taille native de 13px indépendantes du site                               | Geist explicite et 14px, vérifiés dans le navigateur                              |
| Petites métadonnées        | Jeton `caption` à 11px dans la navigation et les compteurs                                  | Passage à 12px ; fil d'Ariane de 13 à 14px                                        |
| Graisses                   | Compteur de notifications seul en gras 700                                                  | 600, avec chiffres tabulaires ; palette usuelle 400/500/600                       |
| Titres de page             | Connexion, erreurs et refus utilisaient des tailles différentes                             | Échelle 20/28px sur petit écran, 24/32px à partir de 640px                        |
| Titres de panneau          | Base `CardTitle` à 16px, sections de gestion à 14px                                         | Base des panneaux à 14/20px ; titres de groupe explicitement à 16/24px            |
| Dialogues et confirmations | Interlignages 24 et 28px selon la primitive                                                 | Titres à 18/24px ; descriptions à 14/24px, y compris les panneaux latéraux        |
| Labels                     | `leading-none` donnait 14px de hauteur de ligne pour 14px de texte                          | 14/20px, lisible lorsque le libellé revient sur plusieurs lignes                  |
| Textes longs               | Protection des titres et descriptions inégale                                               | Retour des mots longs dans les titres HTML et les descriptions partagées          |
| MFA                        | Espacement de 0,25em appliqué aussi aux longs codes de secours ; taille réduite sur desktop | Espacement normal pour les codes de secours ; 16px partout ; TOTP espacé conservé |
| Actualités                 | Titre d'annonce `h2` sous un groupe de date également `h2`                                  | Annonce en `h3`, à 16/24px                                                        |
| Journal système            | Sous-titre de changements en `h4` sans niveau intermédiaire dans la liste                   | Sous-titre en `h3`                                                                |
| Page introuvable           | `h1` limité au nombre 404                                                                   | « Page introuvable » devient le `h1` ; grand 404 décoratif                        |

La densité des tableaux est conservée : corps à 14px, en-têtes et badges à 12px.
Les aides brèves peuvent rester à 12px ; les descriptions longues des panneaux
et fenêtres utilisent 14px. Les textes de plusieurs lignes ne sont pas tous
grossis indistinctement, ce qui ferait perdre la hiérarchie.

Geist Mono reste réservé aux identifiants, secrets à recopier, codes et détails
techniques. Les noms, boutons, labels et descriptions restent en Geist.
Les dates de groupe en capitales et l'espacement des codes sont des usages
limités ; aucune seconde famille éditoriale n'a été introduite.

## Mesures navigateur

- Connexion réelle à 320, 768 et 1440px : Geist effectivement chargée ; champs
  de 16px sur petit écran, 14px sur desktop ; aucun dépassement horizontal.
- Banc avec les véritables primitives à 320, 375, 768 et 1440px : titres
  20/28 puis 24/32px, labels 14/20px, métadonnées 12px, navigation 14px.
- TOTP et secours : Geist Mono 16/24px ; espacement de 4px sur les six chiffres,
  normal sur le code de secours. Un champ de code long peut défiler horizontalement
  à l'intérieur, sans agrandir la page.
- Dialogue et confirmation : mêmes titres 18/24px et descriptions 14/24px.
- Notification réelle Sonner : Geist 14px, interligne natif de 21px.
- Agrandissement du texte à 200 % dans le banc de composants à 768px : titre
  de 48px, labels de 28px, sans dépassement horizontal du document.
- Contrôle du shell et de la page utilisateurs avec données fictives de 320 à
  1920px : le changement de taille du fil d'Ariane et des métadonnées ne provoque
  pas de dépassement horizontal ; menus, clavier et focus restent opérationnels.
- Aucune erreur JavaScript dans les contrôles navigateur terminés.

## Validation et limites

La suite de 957 tests passe après les changements principaux ; TypeScript,
lint et budget d'architecture sont vérifiés. La compilation de production vérifie
aussi les dernières retouches de style.

La revue des sources couvre le site complet. Les mesures de rendu couvrent la
connexion, les primitives et le shell en prévisualisation isolée ; elles ne
certifient pas chaque état privé avec des données réelles. Le test à 200 % porte
sur l'agrandissement de la police racine du banc, pas sur tous les parcours ni
sur tous les mécanismes de zoom des navigateurs. Safari/iOS et Firefox ne sont
pas couverts par cette mesure Chromium.
