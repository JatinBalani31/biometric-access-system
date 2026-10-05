# Phase 2 Prompt: Onboarding and Subscription Billing

You are a senior full-stack engineer continuing the multi-tenant biometric access and subscription system. Phase 1 added the tenant workspace, Firebase tenant claims, role-based permissions, and Firestore/API isolation tests. Treat `src/lib/permissions.ts` as the canonical tenant role matrix and preserve tenant isolation on every new route and query.

## Goal

Make onboarding and recurring subscription operations usable for gyms, meal services, and classes/coaching centers without hard-coding business-specific assumptions.

## Work

1. Inspect the current tenant creation, membership, plan, and billing models before changing them. State assumptions and propose a short implementation plan.
2. Design an organization-owned catalog that can represent gym memberships, meal entitlements, and course/class access with configurable names, durations, renewal behavior, quotas, and currency.
3. Replace placeholder MRR/status calculations with a payment-provider-backed lifecycle: checkout, active/trialing/past-due/canceled states, invoices/receipts, renewal, failed payment recovery, and cancellation.
4. Implement payment webhooks server-side with signature verification, idempotency, replay protection, and tenant-scoped audit events. Store provider IDs and status only; never store card data or provider secrets in source, browser code, or chat.
5. Add secure tenant owner workflows for inviting staff and changing roles. Role assignment must use trusted server/Admin SDK logic; users must never grant themselves claims.
6. Add migration/backfill support for existing tenants and plans, plus tests for duplicate/replayed webhooks, role permissions, and cross-tenant payment/customer references.
7. Before selecting a payment provider, confirm target countries, currencies, tax/invoice requirements, and whether the current Firebase project is the production project. Keep provider API keys in Secret Manager/environment configuration.

## Exit Criteria

- A tenant can select and pay for a configured offering, and the resulting subscription state is reflected consistently in the tenant and platform consoles.
- Webhook retries do not duplicate invoices, entitlements, or audit records.
- Failed payments and cancellations change access according to explicit policy and are recoverable/auditable.
- Tests prove one tenant cannot inspect or mutate another tenant's customer, payment, invoice, or entitlement records.
- Local lint, tests, emulator tests, and production build pass. Do not deploy or create live charges without explicit approval.