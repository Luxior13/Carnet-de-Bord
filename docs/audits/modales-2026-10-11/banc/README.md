# Banc isolé de régression des modales

Sources : [runner](run.cjs), [composants montés](fixture.tsx),
[contexte et navigation simulés](mocks.tsx).

Depuis la racine du dépôt, après installation de ses dépendances et de Chromium
pour Playwright : `node docs/audits/modales-2026-10-11/banc/run.cjs`.

Le banc ouvre un serveur HTTP sur une adresse locale et un port attribué par le
système. Il compile les composants du dépôt avec le CSS partagé, puis utilise
des comptes, coordonnées, réponses API et codes MFA **fictifs**. Il ne charge
aucun fichier d’environnement, ne se connecte pas à la base et n’utilise pas les
cookies d’un navigateur personnel. Il ne doit pas servir de preuve d’intégration
authentifiée ou de transaction réelle.

Chaque exécution écrit captures, bundle et observations dans un nouveau dossier
`noctambule-modal-audit-*` du répertoire temporaire système, dont le chemin est
affiché au démarrage. Le dossier est laissé disponible pour inspection ; les
preuves datées du dépôt ne sont pas remplacées. Nettoyer uniquement ce dossier
identifié après inspection.

Le filtre facultatif `AUDIT_ONLY` retient les noms de scénario contenant sa valeur
(par exemple `nested-focus`). Une passe filtrée ne constitue pas une réussite de
la totalité du banc. `AUDIT_ONLY=explore` produit des observations textuelles des
fixtures et sert au diagnostic, sans validation des interactions.

Cas protégés : retour du focus sans Trigger, confirmations superposées, transition
vers MFA, état après réponse tardive, doubles soumissions, conservation du
brouillon et de l’avertissement de doublon, actualisation des deux versions d’une
coordonnée, erreur puis reprise et faible hauteur disponible.

Le navigateur utilise un cadre simplifié et une police de substitution. Le CSS
des primitives est celui du dépôt ; les interactions métier s’arrêtent aux
réponses simulées. Les [résultats historiques](../observations.json) ne sont
valables que pour [la passe décrite](../../2026-10-11-modales.md).

Depuis la correction d'autocomplétion du 11 octobre, l'inspection vérifie aussi
les attributs d'exclusion sur les champs et formulaires des modales. Le filtre
`AUDIT_ONLY=layout-` permet de rejouer les 48 cas d'ouverture concernés ; il ne
teste aucune extension de gestionnaire de mots de passe.

`AUDIT_ONLY=contact` rejoue les huit cas ciblés de la modale de contact :
ouverture, suppression depuis la fiche utilisateur, protection du brouillon et
validation/soumission simulée après l'adaptation des champs d'autocomplétion.
Cette passe ne démontre pas la disparition d'une proposition Bitwarden réelle.

## Reprise du 25 octobre 2026

Aligné sur la règle d’autocomplétion du 25 octobre (REV-07) : un champ
d’authentification porte son jeton (`current-password`, `new-password`,
`one-time-code`, `username`) sans attribut d’exclusion, les autres restent
exclus. La fixture de contact reçoit les propriétés ajoutées depuis à
`ContactEmailDialog`. Résultat : les 79 scénarios de disposition et de
verrouillage passent ; les scénarios intégrés s’arrêtent à la page
Paramètres, dont les données simulées précèdent la refonte du 14 octobre.
Ces parcours sont couverts par les bancs à jour de chaque page ; reprendre ou
retirer les scénarios intégrés à la prochaine modification d’une fenêtre
([CLO-06](../../2026-10-25-verification-avant-fonctionnalite.md)).
