#!/usr/bin/env bash
# ==============================================================================
# Google Firebase Project, Auth, and Firestore Provisioning Script (Bash)
# ==============================================================================
set -e

PROJECT_ID="${1:-b2b-sub-mgmt-api}"
PROJECT_NAME="${2:-B2B Subscription Management API}"
REGION="${3:-nam5}" # us-central multi-region

echo "================================================================="
echo " Firebase Project, Auth, & Firestore Automated Setup"
echo " Project ID:    $PROJECT_ID"
echo " Project Name:  $PROJECT_NAME"
echo " Location:      $REGION"
echo "================================================================="

# 1. Create or link Firebase Project
echo -e "\n[1/5] Creating / linking Firebase project..."
firebase projects:create "$PROJECT_ID" --display-name "$PROJECT_NAME" || true

# 2. Enable Firebase Auth
echo -e "\n[2/5] Enabling Firebase Auth..."
gcloud services enable identitytoolkit.googleapis.com --project="$PROJECT_ID"

# 3. Create Firestore Database in Native Mode
echo -e "\n[3/5] Creating Cloud Firestore database (Native Mode)..."
gcloud firestore databases create --location="$REGION" --type=firestore-native --project="$PROJECT_ID" || true

# 4. Deploy Firestore Security Rules & Indexes
echo -e "\n[4/5] Deploying Firestore Security Rules and Indexes..."
firebase deploy --only firestore:rules,firestore:indexes --project="$PROJECT_ID"

# 5. Initialize face_embeddings & sync_status collections
echo -e "\n[5/5] Initializing 'face_embeddings' and 'sync_status' collections..."
npm run db:setup

echo "================================================================="
echo " Firebase Backend Setup Completed Successfully!"
echo "================================================================="
