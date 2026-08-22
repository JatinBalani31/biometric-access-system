# BiometricKiosk – Android Kiosk App

Full-screen face recognition kiosk for Android tablets and phones. Detects faces using **ML Kit**, generates **128-d MobileFaceNet embeddings** on-device via TFLite, matches against a locally cached (SQLCipher-encrypted) gallery, and displays an access result card within ~1 second — all **without sending any images to the server**.

---

## Architecture Overview

```
Camera (CameraX) ──▶ ML Kit Face Detector ──▶ TFLite MobileFaceNet
                                                        │
                                          128-d L2-normalized embedding
                                                        │
                                     Cosine Similarity (dot product)
                                                        │
                              SQLCipher Room DB (cached embeddings)
                                                        │
                          ┌─── MATCH ───────────────────┤
                          │                             │── NO MATCH
                  Full-screen card:                  "Not recognized"
                  Name · Plan · Days Left             Check front desk
                  ACTIVE / EXPIRED badge
                          │
                  Auto-clear after 5 seconds
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Android Studio | Hedgehog (2023.1.1) or newer |
| Android Gradle Plugin | 8.4.2 |
| Gradle | 8.7 |
| Kotlin | 1.9.24 |
| Min SDK | API 26 (Android 8.0) |
| Target SDK | API 34 (Android 14) |

---

## Quick Start

### 1. Get the TFLite MobileFaceNet model

The model file is **not included** in the repo (it's a binary). Download one of:

- **Recommended**: [MobileFaceNet TFLite from PINTO_model_zoo](https://github.com/PINTO0309/PINTO_model_zoo/tree/main/072_MobileFaceNet)
- Alternatively: [sirius-ai/MobileFaceNet_TF](https://github.com/sirius-ai/MobileFaceNet_TF) (convert `.pb` → `.tflite`)

Place the file at:
```
kiosk-app/app/src/main/assets/mobilefacenet.tflite
```

The model **must**:
- Accept input: `[1, 160, 160, 3]` float32 tensor, normalized to `[-1.0, 1.0]`
- Output: `[1, 128]` float32 embedding vector

### 2. Configure local.properties

```properties
# kiosk-app/local.properties
BACKEND_URL=https://your-cloud-run-url.run.app
DEVICE_TOKEN=dev_t1_your_kiosk_token
ADMIN_PIN=1234
sdk.dir=C\:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

### 3. Get google-services.json

1. Go to [Firebase Console](https://console.firebase.google.com) → Project `b2b-sub-mgmt-api`
2. Project Settings → Your apps → Add Android app (package: `com.biometric.kiosk`)
3. Download `google-services.json` → place in `kiosk-app/app/google-services.json`

### 4. Register your device with the backend

```bash
# POST /api/devices to get a device token
curl -X POST https://your-cloud-run-url.run.app/api/devices \
  -H "Content-Type: application/json" \
  -H "x-simulated-role: tenant_admin" \
  -H "x-simulated-tenant-id: 1" \
  -d '{"device_name": "Main Lobby Kiosk"}'
# Copy the deviceToken from the response into local.properties → DEVICE_TOKEN
```

### 5. Build and install

```bash
cd kiosk-app
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## Features

| Feature | Implementation |
|---------|---------------|
| Full-screen camera preview | CameraX `PreviewView` + `ImageAnalysis` |
| Face detection | ML Kit `FaceDetector` (PERFORMANCE_MODE_FAST) |
| On-device embedding | TFLite MobileFaceNet (160×160 → 128-d) |
| Face matching | Cosine similarity (dot product on L2-normalized vectors) |
| Encrypted local DB | Room + SQLCipher (key in Android Keystore) |
| Background sync | WorkManager `CoroutineWorker` (periodic + one-shot) |
| Delta sync | `?since=ISO-timestamp` for incremental updates |
| Kiosk lock | `startLockTask()` + HOME category launcher |
| Immersive mode | `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` |
| Admin access | Triple-tap hidden corner → PIN dialog |
| Admin PIN | SHA-256 hashed + random salt in EncryptedSharedPreferences |
| Privacy | Zero raw images stored or transmitted |

---

## Configuration

All settings are adjustable via the admin screen (triple-tap top-right corner):

| Setting | Default | Description |
|---------|---------|-------------|
| Backend URL | From `local.properties` | HTTPS URL of the Cloud Run backend |
| Device Token | From `local.properties` | `x-device-token` auth header value |
| Similarity Threshold | `0.65` | Cosine similarity to accept a match |
| Sync Interval | `15 min` | How often WorkManager runs background sync |
| Admin PIN | `1234` | 4-digit PIN to access admin settings |

---

## Kiosk Lock-Task Mode

For **full kiosk lockdown** (prevents users from exiting the app):

1. The device must be enrolled as a **Device Owner** via Android EMM/MDM or:
   ```bash
   adb shell dpm set-device-owner com.biometric.kiosk/.KioskAdminReceiver
   ```
2. The app calls `startLockTask()` automatically on launch.
3. To exit lock-task mode, go to admin settings → "Log Out".

Without Device Owner, the app still blocks the Back button and stays fullscreen, but users can swipe from the home gesture bar.

---

## Similarity Threshold Guide

| Threshold | Behavior |
|-----------|----------|
| `0.55–0.60` | Very permissive — allows lookalikes (not recommended) |
| `0.62–0.68` | **Balanced** — recommended for most deployments |
| `0.70–0.75` | Strict — may reject valid users in poor lighting |

**Lighting tips**: Front-facing cameras in dim environments degrade accuracy. Mount the kiosk where the face is well-lit from the front.

---

## File Structure

```
kiosk-app/
├── app/
│   ├── src/main/
│   │   ├── assets/
│   │   │   └── mobilefacenet.tflite          ← YOU MUST ADD THIS
│   │   ├── java/com/biometric/kiosk/
│   │   │   ├── data/
│   │   │   │   ├── db/         (Room + SQLCipher)
│   │   │   │   ├── api/        (Retrofit + Moshi)
│   │   │   │   └── prefs/      (EncryptedSharedPreferences)
│   │   │   ├── ml/
│   │   │   │   ├── FaceEmbedder.kt      (TFLite inference)
│   │   │   │   └── CosineMatcher.kt     (similarity matching)
│   │   │   ├── sync/
│   │   │   │   └── EmbeddingSyncWorker.kt
│   │   │   ├── ui/
│   │   │   │   ├── scanner/    (ScannerActivity, ViewModel, FaceGuideOverlay)
│   │   │   │   ├── result/     (AccessResultFragment)
│   │   │   │   └── admin/      (AdminActivity, AdminViewModel)
│   │   │   └── di/             (Hilt AppModule)
│   │   └── res/
│   │       ├── layout/         (5 XML layouts)
│   │       ├── drawable/       (Vector icons + gradient backgrounds)
│   │       ├── anim/           (Entrance animations)
│   │       └── values/         (Colors, strings, themes)
│   ├── google-services.json    ← Replace with real file from Firebase Console
│   └── proguard-rules.pro
├── gradle/
│   ├── libs.versions.toml      (Version catalog)
│   └── wrapper/
├── local.properties            ← DO NOT COMMIT
├── build.gradle.kts
└── settings.gradle.kts
```

---

## Privacy & Security

- **No images stored**: Only mathematical vectors (128 floats) per person
- **No images transmitted**: Vectors are synced from server, not the other way around  
- **Encrypted at rest**: SQLCipher AES-256 database, key in Android Keystore
- **Encrypted preferences**: EncryptedSharedPreferences (AES256-GCM) for device token and PIN
- **PIN hashing**: Admin PIN stored as SHA-256(PIN + random_salt), never in plaintext
- **Network**: All API calls use HTTPS with the device token header
