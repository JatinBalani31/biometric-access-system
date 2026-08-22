#!/usr/bin/env bash
# ==============================================================================
# Google Cloud SQL PostgreSQL Provisioning Script (Bash)
# ==============================================================================
set -e

PROJECT_ID="${1:-b2b-sub-mgmt-api}"
REGION="${2:-us-central1}"
INSTANCE_NAME="${3:-b2b-postgres-instance}"
DB_NAME="${4:-b2b_subscription_db}"
DB_USER="${5:-postgres}"
DB_PASSWORD="${6:-postgres_password}"
TIER="${7:-db-f1-micro}"

echo "================================================================="
echo " GCP Cloud SQL PostgreSQL Automated Setup"
echo " Project:   $PROJECT_ID"
echo " Region:    $REGION"
echo " Instance:  $INSTANCE_NAME"
echo " Database:  $DB_NAME"
echo "================================================================="

# 1. Set default GCP project
echo -e "\n[1/6] Setting GCP project to $PROJECT_ID..."
gcloud config set project "$PROJECT_ID"

# 2. Enable Cloud SQL Admin API
echo -e "\n[2/6] Enabling sqladmin.googleapis.com API..."
gcloud services enable sqladmin.googleapis.com

# 3. Create Cloud SQL Postgres Instance
echo -e "\n[3/6] Creating Cloud SQL PostgreSQL instance '$INSTANCE_NAME'..."
gcloud sql instances create "$INSTANCE_NAME" \
    --project="$PROJECT_ID" \
    --database-version=POSTGRES_15 \
    --tier="$TIER" \
    --region="$REGION" \
    --storage-type=SSD \
    --storage-size=10GB \
    --backup \
    --root-password="$DB_PASSWORD"

# 4. Create the Application Database
echo -e "\n[4/6] Creating PostgreSQL database '$DB_NAME'..."
gcloud sql databases create "$DB_NAME" --instance="$INSTANCE_NAME" --project="$PROJECT_ID"

# 5. Create Database User
echo -e "\n[5/6] Creating / configuring database user '$DB_USER'..."
gcloud sql users create "$DB_USER" --instance="$INSTANCE_NAME" --password="$DB_PASSWORD" --project="$PROJECT_ID"

# 6. Retrieve Connection Details
echo -e "\n[6/6] Retrieving instance connection name..."
CONNECTION_NAME=$(gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" --format="value(connectionName)")

echo "================================================================="
echo " Cloud SQL PostgreSQL Instance Ready!"
echo " Instance Connection Name: $CONNECTION_NAME"
echo "================================================================="
echo -e "\nTo connect via Cloud SQL Auth Proxy:"
echo "cloud-sql-proxy $CONNECTION_NAME --port 5432"
echo -e "\nThen execute migrations:"
echo "npm run db:migrate"
