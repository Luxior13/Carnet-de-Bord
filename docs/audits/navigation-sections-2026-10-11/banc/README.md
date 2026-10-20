# Banc des barres de sections

Depuis la racine du dépôt, dépendances installées et Chromium Playwright disponible :

```powershell
node docs/audits/navigation-sections-2026-10-11/banc/run.cjs
```

`AUDIT_ONLY` permet de filtrer les noms de scénarios. Le programme utilise un
serveur local sur un port libre, ouvre son propre navigateur puis ferme les deux.
Il écrit les captures et `observations.json` dans un nouveau dossier temporaire
dont le chemin est affiché. Il ne lance aucune session ni mutation applicative réelle.

[fixture.tsx](fixture.tsx) monte les trois pages consommatrices et une navigation
témoin de cinq sections, dont un libellé long. [mocks.tsx](mocks.tsx) réutilise les
comptes fictifs et le routeur du [banc des modales](../../modales-2026-10-11/banc/mocks.tsx).
Les composants, primitives Radix, styles globaux et modules CSS viennent du code
courant ; contexte, API, cadre authentifié, images et routeur Next sont simulés.
La police de repli Arial diffère de la police du site.

20 scénarios : trois pages et débordement/redimensionnement à quatre largeurs,
puis infobulle et clics modifiés, garde de brouillon Mon compte, barre collante
avec couleurs forcées, et interactions tactiles émulées. Les tests de clics
modifiés observent l'absence d'interception du composant puis neutralisent la
navigation au niveau document ; ils n'ouvrent pas de véritables nouveaux onglets.
Le mouvement réduit est activé dans les contextes de test.

La navigation de référence reste le code courant. Les pièces conservées à côté
de ce dossier décrivent uniquement la passe du 11 octobre : voir le
[rapport](../../2026-10-11-navigation-sections.md).
