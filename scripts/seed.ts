import { db } from '../src/db/index.ts';
import { tenants, tenantAdmins, subscriptionPlans, subscribers, devices, companyAdmins } from '../src/db/schema.ts';
import { saveFaceEmbedding, updateTenantSyncStatus } from '../src/lib/firestore-sync.ts';
import dotenv from 'dotenv';

dotenv.config();

export async function seedDatabase() {
  console.log('[Seed] Seeding platform and multi-tenant database...');

  try {
    // 1. Superadmin
    const [superAdmin] = await db.insert(companyAdmins).values({
      email: 'superadmin@platform.io',
      role: 'superadmin',
    }).onConflictDoNothing().returning();

    console.log('[Seed] Created / Verified superadmin: superadmin@platform.io');

    // 2. Tenant 1: Apex Fitness Center
    const [tenant1] = await db.insert(tenants).values({
      companyName: 'Apex Health & Fitness',
      contactEmail: 'contact@apexfitness.com',
      planTier: 'pro',
      subscriberLimit: 100,
      status: 'active',
    }).returning();

    await db.insert(tenantAdmins).values([
      { tenantId: tenant1.id, email: 'admin@apexfitness.com', role: 'admin' },
      { tenantId: tenant1.id, email: 'manager@apexfitness.com', role: 'manager' },
    ]);

    const [plan1A] = await db.insert(subscriptionPlans).values({
      tenantId: tenant1.id,
      name: 'Monthly All-Access Pass',
      durationDays: 30,
      price: '59.00',
    }).returning();

    const [plan1B] = await db.insert(subscriptionPlans).values({
      tenantId: tenant1.id,
      name: 'Quarterly VIP Pass',
      durationDays: 90,
      price: '149.00',
    }).returning();

    const now = new Date();
    const subs1 = await db.insert(subscribers).values([
      {
        tenantId: tenant1.id,
        name: 'Elena Rostova',
        email: 'elena.rostova@example.com',
        phone: '+1 (555) 234-5678',
        planId: plan1B.id,
        startDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 70 * 24 * 60 * 60 * 1000),
        status: 'active',
      },
      {
        tenantId: tenant1.id,
        name: 'Marcus Vance',
        email: 'marcus.vance@example.com',
        phone: '+1 (555) 876-5432',
        planId: plan1A.id,
        startDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        status: 'active',
      },
      {
        tenantId: tenant1.id,
        name: 'David Miller',
        email: 'david.miller@example.com',
        phone: '+1 (555) 654-3210',
        planId: plan1A.id,
        startDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // Expired!
        status: 'expired',
      },
    ]).returning();

    const [dev1] = await db.insert(devices).values({
      tenantId: tenant1.id,
      deviceName: 'Main Turnstile Kiosk A',
      deviceToken: 'dev_apex_kiosk_main_a109bf83',
      status: 'active',
      lastSyncedAt: new Date(),
    }).returning();

    // 3. Tenant 2: Metro Co-Working Hub (Limit = 3)
    const [tenant2] = await db.insert(tenants).values({
      companyName: 'Metro Co-Working Hub',
      contactEmail: 'ops@metrohub.space',
      planTier: 'starter',
      subscriberLimit: 3,
      status: 'active',
    }).returning();

    await db.insert(tenantAdmins).values([
      { tenantId: tenant2.id, email: 'admin@metrohub.space', role: 'admin' },
    ]);

    const [plan2] = await db.insert(subscriptionPlans).values({
      tenantId: tenant2.id,
      name: 'Hot Desk Monthly',
      durationDays: 30,
      price: '199.00',
    }).returning();

    const subs2 = await db.insert(subscribers).values([
      {
        tenantId: tenant2.id,
        name: 'Jordan Hayes',
        email: 'jordan@techstartup.io',
        planId: plan2.id,
        startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
        status: 'active',
      },
      {
        tenantId: tenant2.id,
        name: 'Amara Okafor',
        email: 'amara@designstudio.co',
        planId: plan2.id,
        startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
        status: 'active',
      },
      {
        tenantId: tenant2.id,
        name: 'Liam Gallagher',
        email: 'liam@freelance.org',
        planId: plan2.id,
        startDate: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        status: 'active',
      },
    ]).returning();

    const [dev2] = await db.insert(devices).values({
      tenantId: tenant2.id,
      deviceName: 'Reception Facial Access Gate',
      deviceToken: 'dev_metro_reception_kiosk_c71a39d2',
      status: 'active',
      lastSyncedAt: new Date(),
    }).returning();

    // 4. Save Face Embeddings in Firestore
    for (const sub of [...subs1, ...subs2]) {
      await saveFaceEmbedding({
        tenantId: sub.tenantId,
        subscriberId: sub.id,
        subscriberName: sub.name,
        email: sub.email || '',
        status: sub.status === 'active' ? 'active' : 'revoked',
      });
    }

    // 5. Update initial sync status
    await updateTenantSyncStatus({
      tenantId: tenant1.id,
      deviceId: dev1.id,
      status: 'synced',
      syncedCount: subs1.length,
      action: 'Initial seed sync completed',
    });

    await updateTenantSyncStatus({
      tenantId: tenant2.id,
      deviceId: dev2.id,
      status: 'synced',
      syncedCount: subs2.length,
      action: 'Initial seed sync completed',
    });

    console.log('[Seed] Seeding completed successfully.');
    return { success: true };
  } catch (error: any) {
    console.error('[Seed Error]:', error.message);
    return { success: false, error: error.message };
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase().catch(console.error);
}
