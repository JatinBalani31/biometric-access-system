# ==============================================================================
# Google Cloud SQL PostgreSQL Provisioning Script
# ==============================================================================
param (
    [string]$ProjectId = "b2b-sub-mgmt-api",
    [string]$Region = "us-central1",
    [string]$InstanceName = "b2b-postgres-instance",
    [string]$DbName = "b2b_subscription_db",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "postgres_password",
    [string]$Tier = "db-f1-micro"
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " GCP Cloud SQL PostgreSQL Automated Setup" -ForegroundColor Cyan
Write-Host " Project:   $ProjectId" -ForegroundColor Yellow
Write-Host " Region:    $Region" -ForegroundColor Yellow
Write-Host " Instance:  $InstanceName" -ForegroundColor Yellow
Write-Host " Database:  $DbName" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Set default GCP project
Write-Host "`n[1/6] Setting GCP project to $ProjectId..." -ForegroundColor Green
gcloud config set project $ProjectId

# 2. Enable Cloud SQL Admin API
Write-Host "`n[2/6] Enabling sqladmin.googleapis.com API..." -ForegroundColor Green
gcloud services enable sqladmin.googleapis.com

# 3. Create Cloud SQL Postgres Instance
Write-Host "`n[3/6] Creating Cloud SQL PostgreSQL instance '$InstanceName'..." -ForegroundColor Green
gcloud sql instances create $InstanceName `
    --project=$ProjectId `
    --database-version=POSTGRES_15 `
    --tier=$Tier `
    --region=$Region `
    --storage-type=SSD `
    --storage-size=10GB `
    --backup `
    --root-password=$DbPassword

# 4. Create the Application Database
Write-Host "`n[4/6] Creating PostgreSQL database '$DbName'..." -ForegroundColor Green
gcloud sql databases create $DbName --instance=$InstanceName --project=$ProjectId

# 5. Create Database User
Write-Host "`n[5/6] Creating / configuring database user '$DbUser'..." -ForegroundColor Green
gcloud sql users create $DbUser --instance=$InstanceName --password=$DbPassword --project=$ProjectId

# 6. Retrieve Connection Details
Write-Host "`n[6/6] Retrieving instance connection name..." -ForegroundColor Green
$ConnectionName = (gcloud sql instances describe $InstanceName --project=$ProjectId --format="value(connectionName)")

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host " Cloud SQL PostgreSQL Instance Ready!" -ForegroundColor Green
Write-Host " Instance Connection Name: $ConnectionName" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "`nTo connect via Cloud SQL Auth Proxy:"
Write-Host "cloud-sql-proxy $ConnectionName --port 5432"
Write-Host "`nThen execute migrations:"
Write-Host "npm run db:migrate"
