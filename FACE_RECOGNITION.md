# Face Recognition Pipeline

## The one rule

**Enrolment and matching must use the same extractor.** A cosine similarity between
embeddings from two different networks is meaningless noise — near zero for the same
person — which presents as "the kiosk caches the member but never recognises them".

That is exactly the bug this document exists to prevent recurring.

## The contract

| | |
|---|---|
| Model | `mobilefacenet.tflite` (sirius-ai MobileFaceNet_TF, ArcFace-trained) |
| Input | `1 × 112 × 112 × 3`, float32, RGB |
| Preprocess | `(pixel − 127.5) / 128.0` |
| Alignment | 2-point eye similarity transform to ArcFace canonical 112×112 |
| Output | `1 × 192`, then L2-normalized |
| `modelId` | `mobilefacenet_112_v1` |
| Match | cosine similarity (= dot product, since both sides are unit vectors) |
| Threshold | `0.62` default (`DevicePrefs.similarityThreshold`) |

Both implementations load the **same `.tflite` file**:

- Kiosk — [`ml/FaceEmbedder.kt`](kiosk-app/app/src/main/java/com/biometric/kiosk/ml/FaceEmbedder.kt)
  with [`ml/FaceAligner.kt`](kiosk-app/app/src/main/java/com/biometric/kiosk/ml/FaceAligner.kt)
- Web — [`src/lib/face-embedding.ts`](src/lib/face-embedding.ts), served from
  `public/models/mobilefacenet.tflite`

`public/vendor/` holds a local copy of the tfjs + tfjs-tflite runtime. It is served
from the app on purpose: the previous CDN-based loader failed silently in the browser
and the caller quietly fell back to face-api.js's own 128-D descriptor.

## Guards

Nothing in the pipeline is allowed to silently substitute a different vector:

- `src/lib/face-embedding.ts` **throws** if the model will not load or the output is
  not 192-D. There is no descriptor fallback.
- `POST /api/register` and `POST /api/kiosk/enroll-face` reject any vector whose
  length is not `FACE_EMBEDDING_DIM`, with a `422` naming the expected model.
- `GET /api/kiosk/face-embeddings` withholds foreign-model vectors from device
  galleries and reports how many in `skippedIncompatible`.
- `EmbeddingSyncWorker` evicts locally cached rows whose dimension no longer matches
  what the server reports, so stale entries cannot linger through an incremental sync.
- `CosineMatcher` skips mismatched vectors with an error log instead of truncating
  them to a common length and scoring garbage.
- `FaceEmbedder` logs a `MODEL CONTRACT MISMATCH` error at startup if the asset is
  ever swapped for one with different shapes.

## Changing the model

Any change to the extractor invalidates **every enrolled vector** — the embedding
space is different, so nobody will match.

1. Bump `FACE_MODEL_ID` in `src/types/api.ts` and update `FACE_EMBEDDING_DIM`.
2. Replace `mobilefacenet.tflite` in **both** `kiosk-app/app/src/main/assets/` and
   `public/models/`.
3. Update `DEFAULT_INPUT_SIZE` / `DEFAULT_EMBEDDING_SIZE` in `FaceEmbedder.kt` and the
   constants in `src/lib/face-embedding.ts`.
4. Re-tune `DEFAULT_THRESHOLD` — thresholds do not transfer between models.
5. Re-enrol every subscriber. Old vectors will be filtered out automatically and the
   kiosk will surface `IncompatibleGallery`.

## Accuracy notes

Ordered by how much they actually move the needle on a kiosk:

- **Alignment** is the largest single factor. Feeding a raw detector box to
  MobileFaceNet costs several points of accuracy versus the eye-aligned canonical
  crop. Both sides align.
- **Frame quality gating** (`FaceAligner.isGoodQuality`) rejects yaw/roll beyond ±20°
  and faces too far away. Rejecting a frame is free — the next one is ~30 ms away.
- **Consecutive-frame confirmation** (`REQUIRED_CONSECUTIVE_HITS = 2`) suppresses
  one-frame flukes without noticeable latency.
- **Multi-sample enrolment**: `averageEmbeddings()` in `src/lib/face-embedding.ts`
  averages several captures into one centroid vector. Not yet wired into the
  registration UI; capturing 3–5 poses is measurably more robust than one frame.

## Not addressed: liveness

The system currently has **no anti-spoofing**. A printed photo or a phone screen held
up to the kiosk will authenticate if the face is enrolled. 2D face recognition cannot
detect this on its own — no swap of recognition model fixes it.

The standard mitigation is a passive liveness classifier such as MiniFASNet
(Silent-Face-Anti-Spoofing, ~1.9 MB, <10 ms on-device) gating the match, or an
IR/depth camera module for a hardware-level answer.
