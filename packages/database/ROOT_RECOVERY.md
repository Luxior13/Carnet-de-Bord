# Récupération MFA hors ligne du compte racine

Cette procédure est réservée au cas d’urgence où le téléphone **et** tous les
codes de récupération du compte racine sont perdus. Elle ne change jamais son
identifiant, son mot de passe ni son adresse de contact.

Cette procédure ne couvre pas la perte du mot de passe racine : conserver ce
mot de passe dans le coffre-fort d’urgence. S’il est perdu lui aussi, ne pas
modifier directement son hash dans la base. Ce dépôt ne fournit volontairement
aucun outil de remplacement du mot de passe racine : avant la production,
prévoir sa conservation dans un coffre-fort d’urgence chiffré et tester la
restauration d’une sauvegarde vérifiée.

## Prérequis

- travailler depuis une machine d’administration de confiance, pendant une
  fenêtre de maintenance ;
- vérifier que `DATABASE_URL` cible exactement la bonne base ;
- avoir appliqué toutes les migrations avec
  `bun run db:migrate:deploy` puis contrôlé leur état avec
  `bun run --filter @repo/database db:migrate:status` ;
- conserver `MFA_ENCRYPTION_KEY_V1` dans le gestionnaire de secrets et dans une
  sauvegarde distincte. Le script ne la lit pas, mais elle reste indispensable
  au fonctionnement normal des autres comptes MFA.

Depuis la racine du dépôt, remplacer `IDENTIFIANT_ACTUEL` par l’identifiant
racine exact. Commencer obligatoirement par la vérification sans écriture :

```powershell
bun run --filter @repo/database db:root:mfa:recover -- --confirm-login="IDENTIFIANT_ACTUEL" --confirm-reset-mfa=RESET-PROTECTED-ROOT-MFA --dry-run
```

Si la base et l’identité annoncées sont correctes, exécuter la récupération :

```powershell
bun run --filter @repo/database db:root:mfa:recover -- --confirm-login="IDENTIFIANT_ACTUEL" --confirm-reset-mfa=RESET-PROTECTED-ROOT-MFA
```

## Garanties et résultat

Avant toute mutation, le script crée une sauvegarde locale dans
`.codex-tmp/database-backups/` et affiche son chemin. Cette sauvegarde contient
des données d’authentification sensibles : ne pas la envoyer, la publier ni la
copier vers un stockage non chiffré.

Dans une transaction sérialisable, le script verrouille puis revalide qu’il
existe exactement un utilisateur protégé, `ADMIN`, actif, non supprimé, dont
l’identifiant correspond à la confirmation. Il incrémente sa version de
sécurité, retire son ancien MFA et ses codes, supprime ses défis temporaires et
révoque toutes ses sessions. Pour garantir le prochain accès, elle remet aussi
à zéro les quotas temporaires `auth-login:*` et `auth-mfa:*` de l’application
(pour tous les comptes), ainsi que les quotas d’actions sensibles propres au
root et l’éventuel ancien verrouillage de ce compte. L’opération est inscrite
dans le journal d’audit. Toute erreur annule intégralement la transaction ; la
sauvegarde reste alors disponible.

L’effacement des quotas de connexion est volontairement global : les clés IP,
paire identifiant/IP et défi ne sont pas toutes reconstructibles hors ligne.
C’est pourquoi l’opération doit rester exceptionnelle et se dérouler pendant
la fenêtre de maintenance indiquée plus haut.

Au prochain accès, se connecter avec l’identifiant et le mot de passe habituels.
L’application imposera immédiatement l’association d’un nouvel authentificateur
TOTP. Enregistrer ensuite les nouveaux codes de récupération hors du téléphone,
dans un coffre-fort distinct et chiffré.
