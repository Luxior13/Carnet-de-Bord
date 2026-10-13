# Pièces de la clôture du socle — 12–13 octobre 2026

Verdict et périmètre : [rapport de clôture](../AUDIT_CLOTURE_SOCLE_2026-10-12.md).

| Preuve | Portée |
| --- | --- |
| [Client](client/README.md) | Onze pages, navigation, modales, formulaires et reprises ; composants réels, réponses simulées |
| [Comptes et paramètres](serveur/README.md) | Autorité transactionnelle, cibles, preuves sensibles, données et migrations |
| [Personnes](personnes/README.md) | Liste, création, fiche, coordonnées, historique, suppression et schéma |
| [Compte personnel et MFA](personnel/README.md) | Profil/contact, mot de passe, configuration MFA, secours et session source |
| [Tests complets](integration/preuves/tests.json) | 1 482 tests, dont 218 PostgreSQL, aucun ignoré ; 114 fichiers |
| [Intégration et restauration](integration/README.md) | Smoke canonique réussi, 14 scénarios de panorama et quatre contrôles de restauration signée ; 13 captures inspectées |
| [Mesures Personnes](performance-personnes/observations.json) | 38 mesures de liste sur 25, 1 000 et 10 000 personnes fictives |
| [Mesures Utilisateurs](performance-utilisateurs/observations.json) | 33 mesures sur 25, 1 000 et 10 000 comptes fictifs |

Les deux scripts de mesure sont repris des protocoles du 11 octobre, exécutés
de nouveau sur le code courant et des schémas aléatoires du cluster isolé. Leurs
anciennes preuves ne sont pas remplacées. Personnes mesure le service réel et
ses requêtes ; Utilisateurs conserve aussi une comparaison avec une ancienne
lecture reconstituée. Cette comparaison historique n'est pas un nouvel état
« avant correction » du site.

À 10 000 entrées, médianes observées : Personnes **8,339 à 22,468 ms**,
Utilisateurs **2,636 à 31,226 ms** ; maximum du percentile 95 respectivement
**33,232 et 37,821 ms**. Deux appels de préchauffage, vingt mesures, cache chaud,
un client et une connexion sérialisée. Cela exclut HTTP, authentification,
navigateur, disque froid et écritures concurrentes. Le protocole de capacité à
100 000 personnes et plusieurs millions d'audits n'est pas exécuté ni requis
pour déclarer les pages actuelles prêtes au développement métier suivant.

Les scripts `integration/` utilisent exclusivement `socle_e2e_test` et
`socle_restore_test` sur le PostgreSQL local 54663, et Next sur 3132. Ils lisent
un environnement privé temporaire ; aucun secret de cette préparation n'est
versionné. La passe finale d'intégration et le nettoyage sont consignés dans le
rapport principal.

Les échecs de préparation du banc (sandbox esbuild, bannière stderr de Bun,
ancien oracle source du bouton de suppression, sélecteurs et synchronisation
du smoke canonique) ont été distingués des défauts
produit puis corrigés. La suite générale finale est entièrement réussie ; les
gros résultats bruts restent temporaires, cette pièce conserve les décomptes
utiles et les scénarios qui expliquent les corrections.
