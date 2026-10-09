# Q10 — Sécurité et scénarios d’abus

[Revue générale](../REVUE_GENERALE.md) · Questions de sélection : Une entrée, une session, une donnée sensible ou une frontière de confiance est-elle touchée ?

## Questions

- Quels actifs protège-t-on et quelles entrées sont contrôlables par un utilisateur ou un tiers ?
- La session, la MFA, la réauthentification et la révocation nécessaires sont-elles appliquées ?
- Une nouvelle route contourne-t-elle les protections partagées, le contrôle de permission ou le filtrage d’origine ?
- Les entrées sont-elles bornées et validées ; les champs non autorisés peuvent-ils être injectés ?
- Texte riche, URL, SQL, nom de fichier, redirection ou contenu externe peuvent-ils changer l’exécution attendue ?
- Quelles protections sont nécessaires contre requêtes forgées, injections, scripts, accès à des URL internes et abus de fichiers ?
- Les tokens, codes, clés, mots de passe et données personnelles peuvent-ils finir dans URL, logs, toast ou bundle navigateur ?
- Un abus répété épuise-t-il calcul, mémoire, stockage, quotas ou verrouille-t-il indûment une personne ?
- Les limites restent-elles correctes si le nombre de processus serveur change ?
- L’erreur révèle-t-elle l’existence d’un compte, d’un document ou d’un dossier confidentiel ?
- L’action sensible peut-elle être rejouée, détournée ou exécutée après un changement de droit ?
- Quelle réponse et quelle récupération sont possibles en cas d’incident ou compromission ?

## Vérifier selon les surfaces exposées

Établir quelques scénarios d’abus réalistes puis tester les frontières concernées.
Réutiliser les mécanismes du projet ; ne pas créer une cryptographie ou un système
d’authentification propre à une page. Une simulation de permission ne valide pas
l’intégration session/politique/base.

## Trace attendue

Données protégées, entrées, protections existantes réutilisées, scénarios testés et
risques résiduels. Relier un risque concret à son contrôle plutôt que recopier
une liste de menaces sans rapport avec le changement.

## Non-applicabilité et réexamen

Hors impact pour une retouche sans nouvelle entrée, donnée ni règle de confiance.
Réexaminer après exposition externe, dépendance sensible ou incident.

## Références

[Permissions](permissions.md) · [Exploitation](../../references/OPERATIONS.md) ·
[Références de sécurité](../REFERENCES.md).
