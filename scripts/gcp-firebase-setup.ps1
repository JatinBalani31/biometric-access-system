# ==============================================================================
# Google Firebase Project, Auth, and Firestore Provisioning Script
# ==============================================================================
param (
    [string]$ProjectId = "b2b-sub-mgmt-api",
    [string]$ProjectName = "B2B Subscription Management API",
    [string]$Region = "nam5" # us-central multi-region
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Firebase Project, Auth, & Firestore Automated Setup" -ForegroundColor Cyan
Write-Host " Project ID:    $ProjectId" -ForegroundColor Yellow
Write-Host " Project Name:  $ProjectName" -ForegroundColor Yellow
Write-Host " Location:      $Region" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Create or link Firebase Project
Write-Host "`n[1/5] Creating / linking Firebase project..." -ForegroundColor Green
firebase projects:create $ProjectId --display-name "$ProjectName"

# 2. Enable Firebase Auth
Write-Host "`n[2/5] Enabling Firebase Auth..." -ForegroundColor Green
gcloud services enable identitytoolkit.googleapis.com --project=$ProjectId

# 3. Create Firestore Database in Native Mode
Write-Host "`n[3/5] Creating Cloud Firestore database (Native Mode)..." -ForegroundColor Green
gcloud firestore databases create --location=$Region --type=firestore-native --project=$ProjectId

# 4. Deploy Firestore Security Rules & Indexes
Write-Host "`n[4/5] Deploying Firestore Security Rules and Indexes..." -ForegroundColor Green
firebase deploy --only firestore:rules,firestore:indexes --project=$ProjectId

# 5. Initialize face_embeddings & sync_status collections
Write-Host "`n[5/5] Initializing 'face_embeddings' and 'sync_status' collections..." -ForegroundColor Green
npm run db:setup

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host " Firebase Backend Setup Completed Successfully!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
