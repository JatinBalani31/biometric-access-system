/**
 * Grants an admin role to a Firebase Auth user.
 *
 * Custom claims can only be set with the Admin SDK, never from the browser — that
 * is what makes them trustworthy as the source of a caller's role. Run this once
 * per admin account.
 *
 *   npx tsx scripts/grant-admin.ts <email> company_admin
 *   npx tsx scripts/grant-admin.ts <email> tenant_admin <tenantId> [tenantRole]
 *
 * The account must already exist in Firebase Authentication (create it in the
 * console under Authentication → Users, or let the person sign up first).
 * The user must sign out and back in for a new claim to reach their token.
 */
import { adminAuth } from '../src/lib/firebase-admin.ts';
import { collections, createDoc, findOne, updateDoc } from '../src/db/firestore.ts';
import { CompanyAdmin, TenantAdmin, Tenant } from '../src/db/models.ts';
import { getDoc } from '../src/db/firestore.ts';
import { tenantRoles, TenantRole } from '../src/lib/permissions.ts';

async function main() {
  const [email, role, tenantIdArg, tenantRoleArg = 'owner'] = process.argv.slice(2);

  if (!email || !role) {
    console.error(
      'Usage: npx tsx scripts/grant-admin.ts <email> <company_admin|tenant_admin> [tenantId] [owner|manager|front-desk|read-only-auditor]'
    );
    process.exit(1);
  }

  if (role !== 'company_admin' && role !== 'tenant_admin') {
    console.error(`Unknown role "${role}". Use company_admin or tenant_admin.`);
    process.exit(1);
  }

  const tenantId = tenantIdArg ? parseInt(tenantIdArg, 10) : undefined;

  if (role === 'tenant_admin' && (tenantId === undefined || !Number.isInteger(tenantId))) {
    console.error('tenant_admin requires a numeric tenantId as the third argument.');
    process.exit(1);
  }

  if (role === 'tenant_admin' && !tenantRoles.includes(tenantRoleArg as TenantRole)) {
    console.error(`Unknown tenant role "${tenantRoleArg}". Use: ${tenantRoles.join(', ')}.`);
    process.exit(1);
  }

  let user;
  const projectId = adminAuth.app.options.projectId || process.env.FIREBASE_PROJECT_ID || 'unknown project';
  try {
    user = await adminAuth.getUserByEmail(email);
  } catch (error: any) {
    if (error?.code === 'auth/user-not-found') {
      console.error(`No Firebase Auth user found for ${email} in project ${projectId}.`);
      console.error('Check that the account was created in this exact Firebase project and that the email is correct.');
    } else {
      console.error(`Firebase Auth lookup failed in project ${projectId} (${error?.code || 'unknown error'}).`);
      console.error(error?.message || 'Check Application Default Credentials and Firebase Authentication IAM permissions.');
    }
    process.exit(1);
  }

  if (role === 'tenant_admin') {
    const tenant = await getDoc<Tenant>(collections.tenants, tenantId!);
    if (!tenant) {
      console.error(`Tenant ${tenantId} does not exist.`);
      process.exit(1);
    }
    console.log(`Tenant ${tenantId} → ${tenant.companyName}`);
  }

  const tenantRole = tenantRoleArg as TenantRole;
  const claims = role === 'company_admin' ? { role } : { role, tenantId, tenantRole };
  await adminAuth.setCustomUserClaims(user.uid, claims);

  // Mirror into Firestore so the collection-lookup fallback and the admin lists agree.
  if (role === 'company_admin') {
    const existing = await findOne<CompanyAdmin>(collections.companyAdmins, 'email', email);
    if (existing) {
      await updateDoc(collections.companyAdmins, existing.id, { uid: user.uid, role });
    } else {
      await createDoc<CompanyAdmin>(collections.companyAdmins, {
        email,
        uid: user.uid,
        createdAt: new Date().toISOString(),
      } as any);
      console.log('Created company_admins record.');
    }
  } else {
    const existing = await findOne<TenantAdmin>(collections.tenantAdmins, 'email', email);
    if (existing) {
      await updateDoc(collections.tenantAdmins, existing.id, {
        tenantId: tenantId!,
        email,
        uid: user.uid,
        role: tenantRole,
      });
    } else {
      await createDoc<TenantAdmin>(collections.tenantAdmins, {
        tenantId: tenantId!,
        email,
        uid: user.uid,
        role: tenantRole,
        createdAt: new Date().toISOString(),
      } as any);
      console.log('Created tenant_admins record.');
    }
  }

  console.log(
    `\nGranted ${role}${tenantId !== undefined ? ` (${tenantRole}, tenant ${tenantId})` : ''} to ${email}`
  );
  console.log('They must sign out and back in before the new claim reaches their token.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
