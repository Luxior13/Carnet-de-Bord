# Contraintes User sur PostgreSQL isolé

[Programme](run.cjs) · [Résultats](observations.json).

Le programme utilise le JSON privé `AUDIT_ENV_FILE` du
[banc d'intégration](../banc-integration/README.md). Il refuse toute cible hors
`127.0.0.1`, le port 5432 et tout nom autre que `users_audit_test`. Les migrations
doivent être appliquées et le compte protégé E2E présent.

```powershell
node docs/audits/utilisateurs-2026-10-11/banc-schema/run.cjs
```

Dix-neuf contrôles réussis le 11 octobre 2026 sur les 52 migrations : état et
unicité du compte protégé, profil éditable, champs facultatifs, contraintes des
identifiants et emails, réservations, tombstones et index trigrammes. Les essais
de refus vérifient le code SQL attendu. Les opérations autorisées sont elles aussi
annulées en fin de transaction ; aucune fixture de ce banc ne reste en base.

Ces essais valident les contraintes exercées, pas l'ensemble des mutations de
compte, leur audit ou les règles organisationnelles futures. Aucun nouveau champ,
index ni migration n'est nécessaire pour les corrections de liste de cette passe.
