import { pgTable, serial, text, integer, timestamp, numeric } from 'drizzle-orm/pg-core';
import { relations, InferInsertModel, InferSelectModel } from 'drizzle-orm';

// Tenants table
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  companyName: text('company_name').notNull(),
  contactEmail: text('contact_email').notNull(),
  planTier: text('plan_tier').default('starter'), // 'starter' | 'pro' | 'enterprise'
  subscriberLimit: integer('subscriber_limit').default(100),
  status: text('status').default('active'), // 'active' | 'suspended' | 'canceled'
  createdAt: timestamp('created_at').defaultNow(),
});

// Tenant Admins table
export const tenantAdmins = pgTable('tenant_admins', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').default('admin'), // 'admin' | 'manager' | 'viewer'
  uid: text('uid'), // Firebase UID
  createdAt: timestamp('created_at').defaultNow(),
});

// Subscription Plans table
export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  durationDays: integer('duration_days').default(30),
  price: numeric('price', { precision: 10, scale: 2 }).default('0.00'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Subscribers table
export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  planId: integer('plan_id').references(() => subscriptionPlans.id, { onDelete: 'set null' }),
  startDate: timestamp('start_date').defaultNow(),
  endDate: timestamp('end_date').notNull(),
  status: text('status').default('active'), // 'active' | 'expired' | 'suspended'
  createdAt: timestamp('created_at').defaultNow(),
});

// Devices table (Kiosks / Access Gates)
export const devices = pgTable('devices', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  deviceName: text('device_name').notNull(),
  deviceToken: text('device_token').notNull().unique(),
  status: text('status').default('active'), // 'active' | 'revoked' | 'maintenance'
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Company Admins (Global Superadmins)
export const companyAdmins = pgTable('company_admins', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  role: text('role').default('superadmin'),
  uid: text('uid').unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Audit Logs table (Accountability for administrative actions)
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorEmail: text('actor_email').notNull(),
  actorRole: text('actor_role').default('company_admin'),
  action: text('action').notNull(), // 'TENANT_CREATED' | 'TENANT_LIMIT_UPDATED' | 'TENANT_PLAN_UPDATED' | 'TENANT_STATUS_UPDATED' | 'ADMIN_INVITED'
  tenantId: integer('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  tenantName: text('tenant_name'),
  targetType: text('target_type').default('tenant'),
  targetId: text('target_id'),
  previousState: text('previous_state'),
  newState: text('new_state'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Types
export type Tenant = InferSelectModel<typeof tenants>;
export type NewTenant = InferInsertModel<typeof tenants>;

export type TenantAdmin = InferSelectModel<typeof tenantAdmins>;
export type NewTenantAdmin = InferInsertModel<typeof tenantAdmins>;

export type SubscriptionPlan = InferSelectModel<typeof subscriptionPlans>;
export type NewSubscriptionPlan = InferInsertModel<typeof subscriptionPlans>;

export type Subscriber = InferSelectModel<typeof subscribers>;
export type NewSubscriber = InferInsertModel<typeof subscribers>;

export type Device = InferSelectModel<typeof devices>;
export type NewDevice = InferInsertModel<typeof devices>;

export type CompanyAdmin = InferSelectModel<typeof companyAdmins>;
export type NewCompanyAdmin = InferInsertModel<typeof companyAdmins>;

export type AuditLog = InferSelectModel<typeof auditLogs>;
export type NewAuditLog = InferInsertModel<typeof auditLogs>;

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  admins: many(tenantAdmins),
  plans: many(subscriptionPlans),
  subscribers: many(subscribers),
  devices: many(devices),
}));

export const tenantAdminsRelations = relations(tenantAdmins, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantAdmins.tenantId],
    references: [tenants.id],
  }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [subscriptionPlans.tenantId],
    references: [tenants.id],
  }),
  subscribers: many(subscribers),
}));

export const subscribersRelations = relations(subscribers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subscribers.tenantId],
    references: [tenants.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscribers.planId],
    references: [subscriptionPlans.id],
  }),
}));

export const devicesRelations = relations(devices, ({ one }) => ({
  tenant: one(tenants, {
    fields: [devices.tenantId],
    references: [tenants.id],
  }),
}));
