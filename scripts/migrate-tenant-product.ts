import { adminDb } from '../src/lib/firebase-admin.ts';
import { createDoc, collections, updateDoc } from '../src/db/firestore.ts';
import { Offering, SubscriptionPlan, Tenant } from '../src/db/models.ts';
import { resolveTenantLabels, tenantTypeConfig, tenantTypes, TenantType } from '../src/lib/tenant-product.ts';

const migrationId = 'tenant-product-v1';

function parseOptions() {
  const args = process.argv.slice(2);
  const explicitTypes = new Map<number, TenantType>();
  for (const arg of args.filter((value) => value.startsWith('--tenant='))) {
    const [idText, typeText] = arg.slice('--tenant='.length).split(':');
    const id = Number(idText);
    if (!Number.isInteger(id) || !tenantTypes.includes(typeText as TenantType)) {
      throw new Error(`Invalid tenant mapping "${arg}". Use --tenant=<id>:gym|mess|class.`);
    }
    explicitTypes.set(id, typeText as TenantType);
  }
  const defaultText = args.find((value) => value.startsWith('--default-type='))?.split('=')[1];
  if (defaultText && !tenantTypes.includes(defaultText as TenantType)) throw new Error('--default-type must be gym, mess, or class.');
  return {
    apply: args.includes('--apply'),
    defaultType: defaultText as TenantType | undefined,
    currency: args.find((value) => value.startsWith('--currency='))?.split('=')[1] ?? 'INR',
    explicitTypes,
  };
}

function priceToMinor(value: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error(`Invalid legacy plan price: ${value}`);
  return Math.round(amount * 100);
}

async function main() {
  const options = parseOptions();
  const [tenantRows, planRows] = await Promise.all([
    adminDb.collection(collections.tenants).get(),
    adminDb.collection(collections.subscriptionPlans).get(),
  ]);
  const tenants = tenantRows.docs.map((entry) => entry.data() as Tenant);
  const plans = planRows.docs.map((entry) => entry.data() as SubscriptionPlan);
  const unresolved = tenants.filter((tenant) => !options.explicitTypes.has(tenant.id) && !tenant.tenantType && !options.defaultType);
  if (unresolved.length) {
    throw new Error(`Tenant type is required for ${unresolved.map((tenant) => tenant.id).join(', ')}. Pass --tenant=<id>:type or --default-type=type.`);
  }
  if (!/^[A-Z]{3}$/.test(options.currency)) throw new Error('--currency must be a three-letter uppercase code.');

  const plan = tenants.map((tenant) => ({
    tenantId: tenant.id,
    tenantName: tenant.companyName,
    targetType: options.explicitTypes.get(tenant.id) ?? tenant.tenantType ?? options.defaultType!,
    planCount: plans.filter((entry) => entry.tenantId === tenant.id).length,
    existingType: tenant.tenantType ?? null,
  }));
  console.table(plan);
  if (!options.apply) {
    console.log('Dry run only; no documents changed. Pass --apply to write migration backups, tenant config, and offerings.');
    return;
  }

  for (const row of plan) {
    const tenant = tenants.find((entry) => entry.id === row.tenantId)!;
    const backupRef = adminDb.collection('_schema_migrations').doc(`${migrationId}_${tenant.id}`);
    const backup = await backupRef.get();
    if (backup.data()?.status === 'applied') {
      console.log(`Tenant ${tenant.id} already migrated; skipping.`);
      continue;
    }
    await backupRef.set({
      migrationId,
      tenantId: tenant.id,
      status: 'running',
      previous: { tenantType: tenant.tenantType ?? null, labels: tenant.labels ?? null },
      createdAt: new Date().toISOString(),
    }, { merge: true });

    const tenantType = row.targetType;
    const generatedOfferingIds: number[] = backup.data()?.generatedOfferingIds ?? [];
    const legacyPlans = plans.filter((entry) => entry.tenantId === tenant.id);
    for (const legacyPlan of legacyPlans) {
      const existing = await adminDb.collection(collections.offerings)
        .where('tenantId', '==', tenant.id)
        .where('legacyPlanId', '==', legacyPlan.id)
        .limit(1)
        .get();
      if (!existing.empty) continue;

      const kind = tenantTypeConfig[tenantType].defaultOfferingKind;
      const durationDays = Math.max(1, legacyPlan.durationDays || 30);
      const offering = await createDoc<Offering>(collections.offerings, {
        tenantId: tenant.id,
        legacyPlanId: legacyPlan.id,
        migrationId,
        name: legacyPlan.name,
        description: 'Migrated from the legacy subscription plan.',
        kind,
        priceMinor: priceToMinor(legacyPlan.price),
        currency: options.currency,
        active: true,
        period: durationDays === 30 ? { kind: 'monthly' } : durationDays === 90 ? { kind: 'quarterly' } : { kind: 'custom', customDays: durationDays },
        capacityLimit: null,
        timezone: 'UTC',
        maxEntriesPerDay: null,
        duplicateWindowMinutes: 2,
        slots: [],
        ...(kind === 'meal-plan' ? { mealsPerDay: 1, mealSlotIds: [], skipRules: { cutoffMinutes: 0, maxSkipsPerPeriod: 0 } } : {}),
        ...(kind === 'class-course' ? { enrollmentLimit: null } : {}),
        createdAt: legacyPlan.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      generatedOfferingIds.push(offering.id);
      await backupRef.set({ generatedOfferingIds }, { merge: true });
    }

    await updateDoc(collections.tenants, tenant.id, {
      tenantType,
      labels: tenant.labels ?? resolveTenantLabels(tenantType),
    });
    await backupRef.set({ status: 'applied', appliedAt: new Date().toISOString() }, { merge: true });
  }
  console.log(`Migration ${migrationId} applied. Run scripts/rollback-tenant-product.ts --apply to reverse it.`);
}

main().catch((error) => {
  console.error('Tenant product migration failed:', error.message);
  process.exit(1);
});