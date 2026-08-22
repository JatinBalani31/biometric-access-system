-- ==============================================================================
-- B2B Subscription Management Database Schema Migration
-- Dialect: PostgreSQL (Cloud SQL)
-- Creates tables: tenants, tenant_admins, subscription_plans, subscribers, devices, company_admins
-- ==============================================================================

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS "tenants" (
    "id" SERIAL PRIMARY KEY,
    "company_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "plan_tier" TEXT DEFAULT 'starter' NOT NULL,
    "subscriber_limit" INTEGER DEFAULT 100 NOT NULL,
    "status" TEXT DEFAULT 'active' NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Tenant Admins Table
CREATE TABLE IF NOT EXISTS "tenant_admins" (
    "id" SERIAL PRIMARY KEY,
    "tenant_id" INTEGER NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "role" TEXT DEFAULT 'admin' NOT NULL,
    "uid" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. Subscription Plans Table
CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" SERIAL PRIMARY KEY,
    "tenant_id" INTEGER NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "duration_days" INTEGER DEFAULT 30 NOT NULL,
    "price" NUMERIC(10, 2) DEFAULT '0.00' NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 4. Subscribers Table
CREATE TABLE IF NOT EXISTS "subscribers" (
    "id" SERIAL PRIMARY KEY,
    "tenant_id" INTEGER NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "plan_id" INTEGER REFERENCES "subscription_plans"("id") ON DELETE SET NULL,
    "start_date" TIMESTAMP DEFAULT NOW() NOT NULL,
    "end_date" TIMESTAMP NOT NULL,
    "status" TEXT DEFAULT 'active' NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 5. Devices Table (Kiosk / Turnstile / Gate Devices)
CREATE TABLE IF NOT EXISTS "devices" (
    "id" SERIAL PRIMARY KEY,
    "tenant_id" INTEGER NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "device_name" TEXT NOT NULL,
    "device_token" TEXT NOT NULL UNIQUE,
    "status" TEXT DEFAULT 'active' NOT NULL,
    "last_synced_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 6. Company Admins Table (Platform Superadmins)
CREATE TABLE IF NOT EXISTS "company_admins" (
    "id" SERIAL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "role" TEXT DEFAULT 'superadmin' NOT NULL,
    "uid" TEXT UNIQUE,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Performance & Query Optimization Indexes
CREATE INDEX IF NOT EXISTS "idx_tenant_admins_tenant_id" ON "tenant_admins" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_tenant_admins_email" ON "tenant_admins" ("email");
CREATE INDEX IF NOT EXISTS "idx_subscription_plans_tenant_id" ON "subscription_plans" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_subscribers_tenant_id" ON "subscribers" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_subscribers_status" ON "subscribers" ("status");
CREATE INDEX IF NOT EXISTS "idx_subscribers_plan_id" ON "subscribers" ("plan_id");
CREATE INDEX IF NOT EXISTS "idx_devices_tenant_id" ON "devices" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_devices_token" ON "devices" ("device_token");
