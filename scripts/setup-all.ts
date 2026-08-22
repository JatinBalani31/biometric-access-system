import { runMigrations } from '../src/db/migrate.ts';
import { initializeFirestoreCollections } from '../src/lib/firestore-sync.ts';
import { seedDatabase } from './seed.ts';
import dotenv from 'dotenv';

dotenv.config();

async function setupAll() {
  console.log('================================================================');
  console.log('  B2B Multi-Tenant Backend Setup & Orchestrator');
  console.log('  Cloud SQL Postgres + Firebase Auth + Firestore');
  console.log('================================================================\n');

  // 1. Run Cloud SQL / PostgreSQL Migrations
  console.log('--- Step 1: Running PostgreSQL DDL Migrations ---');
  const migrationResult = await runMigrations();
  if (migrationResult.success) {
    console.log('✅ PostgreSQL Schema Migrations applied successfully.');
  } else {
    console.warn('⚠️ PostgreSQL Migration note:', migrationResult.error);
  }

  // 2. Initialize Firestore Collections
  console.log('\n--- Step 2: Setting up Firestore Collections ---');
  const firestoreResult = await initializeFirestoreCollections();
  if (firestoreResult.success) {
    console.log('✅ Firestore collections ("face_embeddings", "sync_status") initialized.');
  } else {
    console.warn('⚠️ Firestore notice:', firestoreResult.error);
  }

  // 3. Seed Initial Demo & Multi-Tenant Data
  console.log('\n--- Step 3: Seeding Initial Platform Data ---');
  if (migrationResult.success) {
    const seedResult = await seedDatabase();
    if (seedResult.success) {
      console.log('✅ Demo tenants, admins, subscribers, devices & face vectors seeded.');
    }
  } else {
    console.log('ℹ️ Skipped database seed due to migration connection status.');
  }

  console.log('\n================================================================');
  console.log('  Setup complete! Ready to start server: npm run dev');
  console.log('================================================================');
}

setupAll().catch(console.error);
