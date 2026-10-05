# Tenant Workspace Permissions

`src/lib/permissions.ts` is the canonical UI/API permission matrix. Firestore Rules mirror this matrix because Rules cannot import TypeScript; `tests/firestore-rules.test.ts` compares every tenant role/resource/action against the canonical matrix in the emulator.

## Roles

| Resource | Action | Owner | Manager | Front desk | Read-only auditor |
|---|---|---:|---:|---:|---:|
| Organization profile | Read | Yes | Yes | Yes | Yes |
| Organization profile | Update | Yes | No | No | No |
| Members | Read | Yes | Yes | Yes | Yes |
| Members | Create | Yes | Yes | Yes | No |
| Members | Update | Yes | Yes | Yes | No |
| Members | Delete | Yes | No | No | No |
| Plans | Read | Yes | Yes | Yes | Yes |
| Plans | Create | Yes | Yes | No | No |
| Plans | Update | Yes | Yes | No | No |
| Plans | Delete | Yes | No | No | No |
| Devices | Read | Yes | Yes | Yes | Yes |
| Devices | Create | Yes | Yes | No | No |
| Devices | Update | Yes | Yes | No | No |
| Devices | Revoke | Yes | No | No | No |
| Activity | Read | Yes | Yes | No | Yes |
| Biometric vectors | Read | Yes | Yes | No | No |
| Biometric vectors | Create/update | Yes | Yes | No | No |
| Biometric vectors | Delete | Yes | No | No | No |

All actions not listed as allowed are denied. Activity log writes and tenant membership/role changes are server-only. Device tokens and short-lived pairing codes are stored in `device_secrets`, which client Firestore Rules deny entirely; APIs disclose a token only at creation or one-time pairing.

## Tenant Claims

Tenant Firebase ID tokens must contain all of:

```json
{
  "role": "tenant_admin",
  "tenantId": 42,
  "tenantRole": "owner"
}
```

Claims are assigned only by the Firebase Admin SDK. The login and API reject missing or invalid tenant claims. The role grant command is:

```powershell
npx tsx scripts/grant-admin.ts admin@example.com tenant_admin 42 owner
```

Supported tenant roles: `owner`, `manager`, `front-desk`, and `read-only-auditor`. After claims are changed, the user must refresh their Firebase ID token by signing out and back in.

## Isolation Notes

- Tenant API requests derive the tenant ID from verified token claims; request query/body tenant IDs cannot override it.
- API route handlers use the Admin SDK, which bypasses Firestore Rules. Express permission and ownership checks therefore remain mandatory.
- Direct Firestore client access is separately constrained by `firestore.rules`; unknown collections, including `_counters`, are denied.
- Firestore emulator tests cover every matrix cell, cross-tenant reads/writes, immutable tenant ownership, missing claims, and query scoping. API emulator tests cover tenant IDORs and role-restricted operations.

These rules are a prototype security layer. Review the rules, claims provisioning, and data retention policy before broad production rollout.