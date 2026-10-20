# API

[Cartographie](README.md) · [Fiche Sécurité](../references/securite.md) ·
[Fiche API et concurrence](../references/api-concurrence.md) ·
[Permissions](../domaines/permissions.md)

Relevé du 19 octobre 2026 : **33 fichiers `route.ts`** sous
`apps/web/src/app/api`. Contrat commun : `requireAuth()` →
`requirePermission(user, PERMISSIONS.X.Y)` → `parseJsonBody` et
`schema.safeParse` → service de `features/<module>/server` → `apiSuccess` /
`apiErrors` dans `withPrivateNoStore`. Le middleware impose le jeton CSRF sur
toute mutation et limite le débit.

**Protections relevées** : gardes et permissions citées dans le fichier de la
route. Une route qui délègue son contrôle à un service le fait dans le service ;
ce relevé n’est pas une revue de sécurité.

## Authentification et compte personnel

| Route | Méthodes | Protections relevées |
| --- | --- | --- |
| `/api/auth/login` | POST | Publique, limitation de débit, défi MFA |
| `/api/auth/mfa/challenge` | DELETE | Annule le défi de connexion en cours |
| `/api/auth/mfa/verify` | POST | Défi MFA valide (`requireMfaEnabled`) |
| `/api/auth/logout` | POST | `requireAuth` |
| `/api/auth/me` | GET, PATCH | `requireAuth` ; PATCH `account:update_profile` |
| `/api/auth/contact-email` | PATCH | `account:update_contact` |
| `/api/auth/change-password` | POST | `account:change_password` (contrôle dans la route) |
| `/api/auth/mfa` | GET, DELETE | `account:manage_mfa` |
| `/api/auth/mfa/setup` | POST, PUT | `account:manage_mfa`, `requireMfaEnabled` |
| `/api/auth/mfa/recovery-codes` | POST | `account:manage_mfa`, `requireMfaEnabled` |
| `/api/auth/sessions` | GET, DELETE | `account:manage_sessions` |
| `/api/auth/step-up` | GET, POST, DELETE | `requireAuth`, `requireRecentPasswordReauthentication` |

## Répertoire

| Route | Méthodes | Protections relevées |
| --- | --- | --- |
| `/api/personnes` | GET, POST | `persons:view` ; POST `persons:create` |
| `/api/personnes/[id]` | GET, PATCH, DELETE | `persons:view`, `persons:update`, `persons:delete` |
| `/api/personnes/[id]/historique-champ` | GET | `persons:view` et `audit:view_field_history` |
| `/api/personnes/[id]/emails` | POST | `persons:update_contact` |
| `/api/personnes/[id]/emails/[emailId]` | PATCH, DELETE | `persons:update_contact` |
| `/api/personnes/[id]/telephones` | POST | `persons:update_contact` |
| `/api/personnes/[id]/telephones/[phoneId]` | PATCH, DELETE | `persons:update_contact` |
| `/api/personnes/[id]/reseaux-sociaux` | POST | `persons:update_contact` |
| `/api/personnes/[id]/reseaux-sociaux/[profileId]` | PATCH, DELETE | `persons:update_contact` |

Toutes ces routes répondent avec `withPrivateNoStore`.

## Utilisateurs

| Route | Méthodes | Protections relevées |
| --- | --- | --- |
| `/api/users` | GET, POST | `users:view`, colonnes `users:view_contact` / `users:view_security` ; POST `users:create`, `users:update_contact`, preuve récente |
| `/api/users/[id]` | GET, PATCH, DELETE | `users:view`, `users:update_profile`, `users:update_login`, `users:update_contact`, `users:update_status`, `users:delete_account`, preuves récentes |
| `/api/users/[id]/sessions` | GET, DELETE | `users:view_sessions`, `users:revoke_sessions`, preuve récente |
| `/api/users/[id]/reset-password` | POST | `users:reset_password`, preuve récente |
| `/api/users/[id]/reset-mfa` | POST | `requireAuth`, autorisation et preuve déléguées au service (récupération par le compte racine) |
| `/api/users/[id]/audit` | GET | **Retirée** : répond 410 sans lecture, conservée volontairement ([SYS-03](constats.md)) |

## Système et observation

| Route | Méthodes | Protections relevées |
| --- | --- | --- |
| `/api/systeme/parametres` | GET | `settings:view` |
| `/api/systeme/parametres/[key]` | PUT | `settings:update`, preuve récente de mot de passe |
| `/api/observability/web-vitals` | POST | `requireAuth` |
| `/api/health`, `/api/health/live`, `/api/health/ready` | GET | Publiques ; aucune donnée personnelle |

## Relevé

```bash
for f in $(find apps/web/src/app/api -name route.ts | sort); do
  echo "$f: $(grep -oE 'export (async )?(const|function) (GET|POST|PATCH|PUT|DELETE)' "$f" | grep -oE '(GET|POST|PATCH|PUT|DELETE)' | tr '\n' ' ')"
done
```
