Biometric subscriber platform — build roadmap
Three apps, one backend:
Kiosk APK — Android app on tenant's tablet/phone. Scans a face, identifies the subscriber, shows name, subscriber ID, plan, days left, active/expired status.
Tenant web app — the gym/clinic/coworking space (your B2B customer) manages their own subscribers, plans, renewals, and enrolls faces.
Company control panel — your internal super-admin app. See every tenant, their subscriber counts, usage, set subscriber limits per tenant plan, suspend/activate tenants, billing.
All three talk to one backend so data stays consistent everywhere.

0. The one technical decision that shapes everything: how face "recognition" actually works
Face detection (is there a face in frame, where are the eyes) is trivial and built into ML Kit for free. Face recognition (which of my 500 subscribers is this) is a different problem: 1-to-many identification. You need:
An embedding model that turns a face into a vector of numbers (e.g. 128 or 512 dimensions) — MobileFaceNet or Google's ML Kit Face Detection + a TFLite embedding model are the standard on-device choices.
A vector store per tenant — for small tenants (under ~2,000 subscribers) you can pull all embeddings for that tenant to the device and do cosine-similarity matching on-device, entirely offline. This is the recommended approach for a kiosk tablet — fast, works without internet, no per-scan cloud cost.
For very large tenants or centralized matching, use Vertex AI Vector Search or a managed vector DB, called from Cloud Functions.
Recommendation for v1: capture face embeddings during enrollment (tenant web app, from a photo or live capture), store the embedding (not the raw photo, or store the photo separately and privately) in Firestore per tenant, sync the tenant's embedding set to the kiosk APK, and match on-device with ML Kit + TFLite. This keeps the kiosk fast and working even with a spotty tenant Wi-Fi.

1. Data model (build this first, regardless of backend choice)
Relational (Cloud SQL — source of truth for billing/business logic):
tenants (id, company name, contact, plan_tier, subscriber_limit, status, created_at)
tenant_admins (id, tenant_id, email, role)
subscription_plans (id, tenant_id, name, duration_days, price)
subscribers (id, tenant_id, name, phone/email, plan_id, start_date, end_date, status)
devices (id, tenant_id, device_name, last_synced_at, app_version)
company_admins (id, email, role) — your internal team
Firebase (real-time + biometric + sync layer):
Auth — login for tenant admins, company admins, and device-level auth tokens for kiosk APKs
Firestore: face_embeddings/{tenantId}/{subscriberId} — the embedding vector + metadata, synced to kiosk devices
Storage — enrollment photos (private bucket, per-tenant rules)
Firestore: sync_status/{deviceId} — last sync time, used by control panel to flag offline kiosks

2. Roadmap (sequential phases)
Phase 0 — Foundations (3–5 days) Finalize the data model above. Decide your face-matching approach (on-device vs cloud). Set up one Firebase project and one Cloud SQL instance for dev. Set up a GitHub repo per app (3 repos, or a monorepo with 3 folders).
Phase 1 — Backend API (1–2 weeks) Build the API layer (Cloud Functions or Cloud Run) that both apps and the panel will call: tenant CRUD, subscriber CRUD, plan CRUD, subscription renewal logic (auto-calculate days left), device registration, embedding sync endpoint. This is the piece every other app depends on — build and deploy it before the UIs.
Phase 2 — Tenant web app (1–2 weeks) Subscriber enrollment (capture photo → generate embedding → save), plan management, renewals, dashboard showing active/expiring subscribers.
Phase 3 — Kiosk APK (1–2 weeks) Face capture → on-device match against synced embeddings for that tenant → display subscriber card (name, ID, plan, days left, active/expired badge). Background sync job to pull new/updated embeddings periodically.
Phase 4 — Company control panel (1 week) List all tenants, drill into a tenant's subscriber count vs their limit, set/change limits, suspend/activate a tenant, view device sync health, basic usage/billing view.
Phase 5 — Hardening (ongoing) Auth rules per tenant (a tenant must never see another tenant's data — enforce with Firestore security rules + row-level checks in Cloud SQL queries), device provisioning/revocation, consent capture at enrollment, offline-mode testing for the kiosk, load testing for larger tenants.

3. Prompts for AI Studio (one per app)
Paste each block as your initial prompt when starting that app's build in AI Studio. Each is self-contained — give AI Studio the data model context every time since it doesn't carry state between separate app projects.
3a. Backend API prompt
Build a backend API for a multi-tenant B2B subscription-management platform.

Entities:
- tenants (id, company_name, contact_email, plan_tier, subscriber_limit, status, created_at)
- tenant_admins (id, tenant_id, email, role)
- subscription_plans (id, tenant_id, name, duration_days, price)
- subscribers (id, tenant_id, name, phone, email, plan_id, start_date, end_date, status: active/expired)
- devices (id, tenant_id, device_name, last_synced_at)
- company_admins (id, email, role)

Requirements:
- REST API (Cloud Functions or Cloud Run) with endpoints for CRUD on tenants, subscribers, plans, and devices.
- Every subscriber/device/plan endpoint must filter by tenant_id from the authenticated caller's token — no tenant can read or write another tenant's data.
- An endpoint that computes and returns "days_left" for a subscriber based on end_date.
- An endpoint that enforces subscriber_limit: reject creating a new subscriber if the tenant is at their limit.
- An endpoint for kiosk devices to pull the current set of face embeddings for their tenant (paginated, with a "since" timestamp for incremental sync).
- Auth via Firebase Auth tokens; role check middleware for company_admin vs tenant_admin vs device.
- Use Cloud SQL (Postgres) for tenants/subscribers/plans/billing data, and Firebase (Firestore) for face embeddings and device sync state.
- Return clear error codes for: limit exceeded, tenant suspended, invalid device token.


That block is the actual prompt — you paste it as-is into AI Studio (or Antigravity's agent chat) to kick off the backend build. Here's the concrete sequence:
{(3a. To be executed)Step 1 — Where to paste it
 Go to Google AI Studio (aistudio.google.com), start a new "Build" / app project, and paste that whole prompt as your first message. It'll scaffold a Cloud Functions or Cloud Run project with the endpoints described.
Step 2 — What to expect back
 It'll generate code for something like:
POST /tenants, GET /tenants/:id, etc. (CRUD routes)
GET /subscribers/:id/days-left
POST /subscribers with the limit check
GET /devices/:id/embeddings?since=<timestamp>
Auth middleware reading the Firebase Auth token and checking tenant_id / role claims
It won't have a live database yet — it'll likely scaffold schema/migration files for Cloud SQL and Firestore rules, but you still need to actually provision the Cloud SQL instance and Firebase project.
Step 3 — Provision the actual infra
 This is where you move to Antigravity (AI Studio is better at generating code than provisioning cloud resources end-to-end). Open the exported project folder in Antigravity and tell the agent things like:
"Create a Firebase project called [name] and set up Firestore for face_embeddings and sync_status"
"Set up a Cloud SQL Postgres instance and run these migrations"
"Set custom claims on Firebase Auth users for role: company_admin / tenant_admin / device"
Step 4 — Test before building anything else
 Before you touch the tenant web app or kiosk APK, hit the API directly (Postman, curl, or ask the agent to write a quick test script) and confirm:
Tenant A's token genuinely cannot read Tenant B's subscribers
The subscriber_limit rejection actually fires at the limit
days_left calculates correctly for a subscriber whose end_date has already passed (should show 0 or negative → status expired, not a negative number displayed to a kiosk user)
Step 5 — Deploy it
 Once it works locally, tell the Antigravity agent "deploy this to Cloud Run" (or Cloud Functions) — it'll run the deploy command and give you a live base URL. That URL is what you'll plug into the tenant web app and kiosk APK prompts next (they both call this same API).
Once this backend is live and tested, move to prompt 3b (tenant web app) — it depends on this API existing first.}

3b. Tenant web app prompt
Build a web app for a business (a "tenant") to manage its own subscribers on a subscription platform.

Screens needed:
1. Login (tenant admin, via Firebase Auth)
2. Dashboard: total subscribers, active vs expired count, subscribers expiring in next 7 days
3. Subscriber list: name, plan, days left, status, search/filter
4. Add subscriber: name, contact, choose a plan, capture a face photo via webcam/upload, generate and store a face embedding (call the backend embedding endpoint), set start date
5. Edit/renew subscriber: extend end_date, change plan
6. Plan management: create/edit subscription plans (name, duration, price)
7. Device list: tablets/phones registered to this tenant, last sync time

Constraints:
- All data scoped to the logged-in tenant only — call the backend API described above, never query the database directly.
- Show a clear banner if the tenant is near their subscriber_limit.
- Face photo capture must show a consent checkbox before saving ("subscriber consents to biometric data storage for identification purposes") and store the consent timestamp.
- Use Firebase Auth for login and call the backend REST API for all data operations.

3c. Kiosk APK prompt
Build an Android app (Kotlin) for a tablet/phone kiosk installed at a business location. It should:

1. On launch, show a full-screen live camera preview waiting for a face.
2. Detect a face using ML Kit Face Detection.
3. Generate a face embedding on-device (TFLite MobileFaceNet or equivalent) from the detected face.
4. Compare the embedding against a locally cached set of embeddings for this device's tenant (cosine similarity, configurable threshold).
5. On a match, display a full-screen card: subscriber name, subscriber ID, plan name, days left, and a clear ACTIVE (green) or EXPIRED (red) badge. Auto-clear after 5 seconds and return to the scanning screen.
6. On no match, show "not recognized, please check in at the front desk."
7. Background sync job (runs every N minutes and on app start): pulls new/updated embeddings for this tenant from the backend's device-sync endpoint, using the device's registered auth token, and caches them locally (e.g. in an encrypted local database) so the kiosk keeps working if Wi-Fi drops.
8. A hidden admin/settings screen (PIN-protected) to re-register the device, view last sync time, and log out.

Constraints:
- Store only embeddings on-device, never raw photos.
- Kiosk mode: lock the app to the foreground, disable back/home gestures if possible (standard Android kiosk/lock-task-mode pattern).
- Use Firebase Auth for the device's identity token and call the backend REST API for sync and lookups.

3d. Company control panel prompt
Build an internal admin web app for our company to manage all B2B tenants on our subscription platform.

Screens needed:
1. Login (company_admin role only, via Firebase Auth)
2. Tenant list: company name, plan tier, subscriber count / subscriber_limit, status (active/suspended), last device sync
3. Tenant detail: full subscriber list for that tenant (read-only), device list and sync health, edit subscriber_limit, change plan_tier, suspend/activate tenant
4. Create new tenant: company name, contact, initial plan tier and subscriber_limit, auto-generate first tenant_admin invite
5. Usage dashboard: subscriber counts across all tenants over time (simple chart), tenants near their limit, tenants with stale device sync (no sync in X days)
6. Basic billing view: plan tier per tenant, if you're tracking revenue, a simple monthly total per tenant

Constraints:
- Only company_admin role can access this app — check the Firebase Auth custom claim on every screen.
- All writes (limit changes, suspend/activate) go through the backend API described above, not directly to the database, so business rules and audit logging stay in one place.
- Log every admin action (who changed what, when) to an audit_log table for accountability.


4. Deploying with Antigravity
Antigravity is Google's local, agent-first IDE — you describe what you want in the agent chat and it plans, edits code, and runs deploy commands for you, including a built-in Firebase MCP integration.
Setup (once):
Download Antigravity from antigravity.google and install it.
Install Node.js 20+ if you don't have it.
Install the Firebase CLI: npm install -g firebase-tools, then firebase login.
In Antigravity, open the Agent panel → MCP servers → add the Firebase MCP server (this gives the agent direct control over Firebase project setup, Firestore rules, hosting, etc.).
Per app (repeat for each of the 3 apps):
If you built the app in AI Studio, export/download the project, then open that folder in Antigravity.
In the Agent chat, tell it what backend to wire up, e.g.: "Connect this app to Firebase project [your-project-id], set up Firestore security rules so each tenant can only read their own data, and initialize Firebase Auth." The agent will use the MCP server to do this without you touching the console.
Ask it to run the app locally first ("Run and Debug" panel → Play) and test.
When ready, tell the agent: "Deploy this app" — for the web apps (tenant app, control panel) this runs a firebase deploy to Firebase Hosting/App Hosting and gives you a live URL.
For the kiosk APK, Antigravity works as a general code-first IDE for the Kotlin/Android project too, but the actual APK build/signing step still goes through Gradle — ask the agent to run the Gradle build (./gradlew assembleRelease) and produce a signed APK, then you sideload it onto the tablets directly (or push via an MDM tool like Google's Android Enterprise if you're managing many tablets remotely) rather than publishing to the Play Store, since this is an internal kiosk app, not a consumer app.

5. Firebase vs Cloud SQL — how to split them
Don't pick one exclusively; use both, matched to what they're good at:
Use Firebase for
Use Cloud SQL for
Auth (tenant admins, company admins, device identity)
Tenants, subscription plans, billing (needs joins, transactions, reporting)
Face embeddings + real-time sync to kiosk devices
Subscriber records if you need complex queries/reports across tenants
Storage for enrollment photos
Audit logs with relational integrity
Push notifications to kiosk devices (e.g. "force re-sync now")
Anything where you'll eventually want SQL joins for company-wide analytics

Firebase is faster to build with and free/cheap at low volume; Cloud SQL gives you real relational integrity and easier reporting once you have dozens of tenants and need cross-tenant analytics for your own control panel. The hybrid above is the standard pattern for this kind of product.
