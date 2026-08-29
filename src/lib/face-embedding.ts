/**
 * Browser-side face embedding extractor — MobileFaceNet.
 *
 * This MUST stay identical to what the kiosk runs, because a cosine similarity
 * is only meaningful between vectors from the same extractor:
 *
 *   model        kiosk-app/app/src/main/assets/mobilefacenet.tflite  (same file)
 *   input        1 x 112 x 112 x 3, float32, RGB
 *   preprocess   (pixel - 127.5) / 128.0
 *   output       1 x 192, then L2-normalized
 *
 * See kiosk-app/.../ml/FaceEmbedder.kt for the device-side counterpart.
 *
 * Everything is served from /public — no CDN. The previous CDN-based loader
 * failed silently in the browser and the caller fell back to face-api.js's own
 * 128-D descriptor, which lives in a completely different vector space. That is
 * why enrolled members were cached on the kiosk but never recognized.
 */

export const FACE_MODEL_ID = 'mobilefacenet_112_v1';
export const FACE_EMBEDDING_DIM = 192;
export const FACE_INPUT_SIZE = 112;

const TFJS_URL = '/vendor/tfjs/tf.min.js';
// Served from inside the wasm directory: the loader probes its own script location
// for the runtime binaries before consulting setWasmPath, so co-locating them
// avoids a spurious 404 on every page load.
const TFLITE_URL = '/vendor/tflite/wasm/tf-tflite.min.js';
const TFLITE_WASM_DIR = '/vendor/tflite/wasm/';
const MODEL_URL = '/models/mobilefacenet.tflite';

/**
 * ArcFace canonical 112x112 landmark positions, in image coordinates.
 * Index 0 is the eye that appears on the LEFT of the image, which is what
 * face-api's getLeftEye() returns (dlib 68-point convention, points 36-41).
 */
const CANONICAL_LEFT_EYE = { x: 38.2946, y: 51.6963 };
const CANONICAL_RIGHT_EYE = { x: 73.5318, y: 51.5014 };

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Minimal shape of the face-api landmark object we depend on. */
export interface EyeLandmarks {
  getLeftEye(): Point[];
  getRightEye(): Point[];
}

let modelPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="' + src + '"]')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(script);
  });
}

/**
 * Load MobileFaceNet. Rejects loudly on failure — callers must NOT substitute a
 * different descriptor, because the resulting enrolment would be unmatchable.
 */
export async function loadFaceEmbedder(): Promise<any> {
  if (modelPromise) return modelPromise;

  modelPromise = (async () => {
    if (typeof window === 'undefined') {
      throw new Error('Face embedding is only available in the browser.');
    }

    if (!(window as any).tf) await loadScript(TFJS_URL);
    if (!(window as any).tflite) await loadScript(TFLITE_URL);

    const tflite = (window as any).tflite;
    if (!tflite || !tflite.loadTFLiteModel) {
      throw new Error('TFLite runtime failed to initialise.');
    }

    tflite.setWasmPath(TFLITE_WASM_DIR);
    const model = await tflite.loadTFLiteModel(MODEL_URL);

    console.info(
      '[FaceEmbedder] Loaded ' + FACE_MODEL_ID + ' — ' +
        FACE_INPUT_SIZE + 'x' + FACE_INPUT_SIZE + ' in, ' + FACE_EMBEDDING_DIM + '-D out'
    );
    return model;
  })();

  // Let a later attempt retry instead of caching the rejection forever.
  modelPromise.catch(() => {
    modelPromise = null;
  });

  return modelPromise;
}

const centroid = (pts: Point[]): Point => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});

/**
 * Align a face onto a canonical 112x112 crop using a two-point (eye) similarity
 * transform — the same normalisation MobileFaceNet was trained on. Removes
 * in-plane head roll and fixes scale, which is worth several points of accuracy
 * over feeding the raw detector box.
 */
function alignByEyes(
  source: CanvasImageSource,
  leftEye: Point,
  rightEye: Point
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = FACE_INPUT_SIZE;
  canvas.height = FACE_INPUT_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const tdx = CANONICAL_RIGHT_EYE.x - CANONICAL_LEFT_EYE.x;
  const tdy = CANONICAL_RIGHT_EYE.y - CANONICAL_LEFT_EYE.y;

  const srcDist = Math.hypot(dx, dy) || 1;
  const scale = Math.hypot(tdx, tdy) / srcDist;
  const angle = Math.atan2(tdy, tdx) - Math.atan2(dy, dx);

  const a = scale * Math.cos(angle);
  const b = scale * Math.sin(angle);
  const tx = CANONICAL_LEFT_EYE.x - (a * leftEye.x - b * leftEye.y);
  const ty = CANONICAL_LEFT_EYE.y - (b * leftEye.x + a * leftEye.y);

  // Canvas maps x' = m11*x + m21*y + dx, y' = m12*x + m22*y + dy
  ctx.setTransform(a, b, -b, a, tx, ty);
  ctx.drawImage(source, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  return ctx.getImageData(0, 0, FACE_INPUT_SIZE, FACE_INPUT_SIZE);
}

/**
 * Fallback when landmarks are unavailable: crop the detector box with the ~25%
 * margin MobileFaceNet's training crops include, then scale to 112x112.
 */
function cropByBox(source: CanvasImageSource, box: Box): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = FACE_INPUT_SIZE;
  canvas.height = FACE_INPUT_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const margin = 0.25;
  const side = Math.max(box.width, box.height) * (1 + margin);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  ctx.drawImage(
    source,
    cx - side / 2,
    cy - side / 2,
    side,
    side,
    0,
    0,
    FACE_INPUT_SIZE,
    FACE_INPUT_SIZE
  );
  return ctx.getImageData(0, 0, FACE_INPUT_SIZE, FACE_INPUT_SIZE);
}

/** RGBA bytes -> NHWC float32 model input, normalized to [-1, 1]. */
function toModelInput(image: ImageData): Float32Array {
  const out = new Float32Array(FACE_INPUT_SIZE * FACE_INPUT_SIZE * 3);
  const px = image.data;
  for (let i = 0, j = 0; i < px.length; i += 4) {
    out[j++] = (px[i] - 127.5) / 128.0;
    out[j++] = (px[i + 1] - 127.5) / 128.0;
    out[j++] = (px[i + 2] - 127.5) / 128.0;
  }
  return out;
}

function l2Normalize(v: Float32Array | number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < v.length; i++) sumSq += v[i] * v[i];
  const norm = Math.sqrt(sumSq) || 1;
  return Array.from(v, (x) => x / norm);
}

/**
 * Produce the L2-normalized 192-D MobileFaceNet embedding for one detected face.
 *
 * @param source     The full frame the face was detected in.
 * @param box        Detector bounding box, in source pixel coordinates.
 * @param landmarks  face-api 68-point landmarks. Strongly preferred — without
 *                   them the crop is unaligned and accuracy drops noticeably.
 * @throws if the model cannot run or returns an unexpected shape. Never returns
 *         a vector from a different extractor.
 */
export async function extractFaceEmbedding(
  source: CanvasImageSource,
  box: Box,
  landmarks?: EyeLandmarks | null
): Promise<number[]> {
  const model = await loadFaceEmbedder();
  const tf = (window as any).tf;

  const aligned = landmarks
    ? alignByEyes(source, centroid(landmarks.getLeftEye()), centroid(landmarks.getRightEye()))
    : cropByBox(source, box);

  const input = toModelInput(aligned);

  const raw: Float32Array = tf.tidy(() => {
    const tensor = tf.tensor4d(input, [1, FACE_INPUT_SIZE, FACE_INPUT_SIZE, 3]);
    const output = model.predict(tensor);
    return output.dataSync() as Float32Array;
  });

  if (raw.length !== FACE_EMBEDDING_DIM) {
    throw new Error(
      'Expected a ' + FACE_EMBEDDING_DIM + '-D embedding from ' + FACE_MODEL_ID +
        ', got ' + raw.length + '-D. The kiosk cannot match this vector.'
    );
  }

  return l2Normalize(raw);
}

/**
 * Average several captures of the same face into one enrolment vector.
 * A centroid of 3-5 poses is measurably more robust than a single frame.
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) throw new Error('No embeddings to average.');
  if (embeddings.length === 1) return embeddings[0];

  const dim = embeddings[0].length;
  const sum = new Float32Array(dim);
  for (const e of embeddings) {
    if (e.length !== dim) throw new Error('Cannot average embeddings of differing dimensions.');
    for (let i = 0; i < dim; i++) sum[i] += e[i];
  }
  return l2Normalize(sum);
}

/** Cosine similarity between two L2-normalized embeddings. Debug/QA helper. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
