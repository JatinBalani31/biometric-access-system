import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import { motion, AnimatePresence } from 'motion/react';
import { loadFaceEmbedder, extractFaceEmbedding, FACE_EMBEDDING_DIM } from '../lib/face-embedding';
import {
  Fingerprint,
  User,
  Mail,
  Phone,
  Calendar,
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Building2,
  Sparkles,
  Shield,
  Clock,
  ArrowLeft,
  Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tenant {
  id: number;
  companyName: string;
  planTier: string;
}

interface Plan {
  id: number;
  name: string;
  durationDays: number;
  price: string;
}

interface RegistrationResult {
  subscriber: {
    id: number;
    name: string;
    email: string;
    phone: string;
    tenantName: string;
    planName: string;
    startDate: string;
    endDate: string;
    daysLeft: number;
    status: string;
  };
  embeddingId: string;
  vectorDimension: number;
  faceEnrolled: boolean;
  message: string;
}

// ─── Face Capture Step ────────────────────────────────────────────────────────
const MODEL_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';

interface FaceCaptureStepProps {
  subscriberName: string;
  onCapture: (vector: number[], snapshot: string) => void;
  onBack: () => void;
}

function FaceCaptureStep({ subscriberName, onCapture, onBack }: FaceCaptureStepProps) {
  const webcamRef = useRef<Webcam>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelProgress, setModelProgress] = useState('Loading AI models…');
  const [isProcessing, setIsProcessing] = useState(false);
  const [captureStage, setCaptureStage] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [vector, setVector] = useState<number[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setModelProgress('Loading face detector…');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelProgress('Loading landmark model…');
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setModelProgress('Loading MobileFaceNet recogniser…');
      await loadFaceEmbedder();
      setModelsLoaded(true);
      setCaptureStage('ready');
    } catch (err: any) {
      // Surface the real reason — a silent model-load failure is exactly what
      // produced unmatchable enrolments before.
      setErrorMsg('Could not load the face recognition model: ' + (err?.message || err));
      setCaptureStage('error');
    }
  };

  const captureAndDetect = useCallback(async () => {
    if (!webcamRef.current || !modelsLoaded) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error('Failed to capture image from webcam.');
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks();
      if (!detection) {
        throw new Error('No face detected. Make sure your face is centred and well-lit.');
      }
      // MobileFaceNet only — no fallback. A vector from any other extractor
      // would be cached on the kiosk but could never match a live scan.
      const descriptorArray = await extractFaceEmbedding(
        img,
        detection.alignedRect?.box ?? detection.detection.box,
        detection.landmarks
      );
      setSnapshot(imageSrc);
      setVector(descriptorArray);
      setCaptureStage('success');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [modelsLoaded]);

  const handleRetake = () => {
    setCaptureStage('ready');
    setSnapshot(null);
    setVector(null);
    setErrorMsg(null);
  };

  const handleConfirm = () => {
    if (vector && snapshot) onCapture(vector, snapshot);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 text-xs font-medium mb-2">
          <Fingerprint className="w-3.5 h-3.5" /> Step 2 of 3 — Face Enrollment
        </div>
        <h2 className="text-2xl font-bold text-white">Scan Your Face</h2>
        <p className="text-slate-400 text-sm">
          Look directly at the camera. Your face data stays on-device — only a math vector is stored.
        </p>
      </div>

      {/* Camera viewport */}
      <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-video max-w-md mx-auto shadow-2xl shadow-black/50">
        {/* Loading state */}
        {captureStage === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
              <Fingerprint className="w-7 h-7 text-violet-400 absolute inset-0 m-auto" />
            </div>
            <p className="text-slate-400 text-sm animate-pulse">{modelProgress}</p>
          </div>
        )}

        {/* Error state */}
        {captureStage === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-400" />
            <p className="text-rose-300 text-sm">{errorMsg}</p>
            <button
              onClick={loadModels}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Live camera */}
        {captureStage === 'ready' && (
          <>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
              className="w-full h-full object-cover transform -scale-x-100"
            />
            {/* Face guide */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-8 rounded-full border-2 border-violet-500/40 shadow-[0_0_30px_-5px_rgba(139,92,246,0.4)]" />
              <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/60 font-mono">
                Centre your face in the oval
              </div>
            </div>
          </>
        )}

        {/* Success — show frozen frame */}
        {captureStage === 'success' && snapshot && (
          <div className="relative w-full h-full">
            <img
              src={snapshot}
              alt="Captured"
              className="w-full h-full object-cover transform -scale-x-100 opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900/90 backdrop-blur border border-emerald-500/40 rounded-2xl p-6 flex flex-col items-center gap-2 shadow-2xl"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <span className="text-white font-semibold">Face Captured!</span>
                <span className="text-emerald-300 font-mono text-xs">{FACE_EMBEDDING_DIM}-D MobileFaceNet Vector</span>
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* Error message below camera */}
      {errorMsg && captureStage === 'ready' && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-sm text-center">
          {errorMsg}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between max-w-md mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex gap-3">
          {captureStage === 'success' ? (
            <>
              <button
                onClick={handleRetake}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition border border-slate-700"
              >
                Retake
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-violet-500/25 text-sm"
              >
                <Zap className="w-4 h-4" /> Enrol & Register
              </button>
            </>
          ) : (
            <button
              onClick={captureAndDetect}
              disabled={captureStage !== 'ready' || isProcessing}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition shadow-lg shadow-violet-500/25 text-sm"
            >
              {isProcessing ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <><Camera className="w-4 h-4" /> Scan Face</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Registration Portal ─────────────────────────────────────────────────
export function RegistrationPortal() {
  // Step control
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 form
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | ''>('');
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [plansLoading, setPlansLoading] = useState(false);

  // Step 2
  const [faceVector, setFaceVector] = useState<number[] | null>(null);

  // Step 3 / submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  // ─── Field-level validation ──────────────────────────────────────────────
  const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Indian mobile numbers: 10 digits, first digit 6-9. The +91 is fixed in the UI,
  // so only the national number is ever typed or validated here.
  const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

  const validateName = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return 'Full name is required.';
    if (trimmed.length < 2) return 'Name must be at least 2 characters.';
    if (trimmed.length > 80) return 'Name must be 80 characters or fewer.';
    if (!/[A-Za-z]{2}/.test(trimmed)) return 'Enter your real name — at least two letters.';
    if (!NAME_PATTERN.test(trimmed)) return 'Name can only contain letters, spaces, hyphens, and apostrophes.';
    return undefined;
  };

  const validateEmail = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined; // optional
    if (trimmed.length > 254) return 'Email address is too long.';
    if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address.';
    return undefined;
  };

  const validatePhone = (value: string): string | undefined => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return undefined; // optional
    if (digits.length < 10) return `Enter all 10 digits — ${10 - digits.length} more to go.`;
    if (digits.length > 10) return 'An Indian mobile number is exactly 10 digits.';
    if (!INDIAN_MOBILE_PATTERN.test(digits)) return 'Indian mobile numbers start with 6, 7, 8, or 9.';
    return undefined;
  };

  // Keep only digits, capped at 10, so the field can never hold an invalid shape.
  const handlePhoneChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
  };

  // Display as "98765 43210" while storing the bare digits.
  const formattedPhone = phone.length > 5 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;

  const handleNameBlur = () => setFieldErrors((prev) => ({ ...prev, name: validateName(name) }));
  const handleEmailBlur = () => setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }));
  const handlePhoneBlur = () => setFieldErrors((prev) => ({ ...prev, phone: validatePhone(phone) }));

  // Load tenants on mount
  useEffect(() => {
    fetch('/api/register/tenants')
      .then((r) => r.json())
      .then((data) => setTenants(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Load plans when tenant changes
  useEffect(() => {
    if (!selectedTenantId) {
      setPlans([]);
      setSelectedPlanId('');
      return;
    }
    setPlansLoading(true);
    fetch(`/api/register/plans?tenant_id=${selectedTenantId}`)
      .then((r) => r.json())
      .then((data) => { setPlans(Array.isArray(data) ? data : []); setPlansLoading(false); })
      .catch(() => setPlansLoading(false));
  }, [selectedTenantId]);

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!selectedTenantId) {
      setValidationError('Please select an organisation first.');
      return;
    }

    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);
    setFieldErrors({ name: nameErr, email: emailErr, phone: phoneErr });

    if (nameErr || emailErr || phoneErr) {
      setValidationError('Please fix the highlighted fields below.');
      return;
    }

    if (plans.length > 0 && !selectedPlanId) {
      setValidationError('Please choose a subscription plan.');
      return;
    }

    setStep(2);
  };

  const handleFaceCapture = (vector: number[], _snapshot: string) => {
    setFaceVector(vector);
    submitRegistration(vector);
  };

  const submitRegistration = async (vector: number[]) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: selectedTenantId,
          name: name.trim(),
          email: email.trim() || undefined,
          // Store E.164 so the kiosk and admin lookups have one canonical form.
          phone: phone ? `+91${phone}` : undefined,
          plan_id: selectedPlanId || undefined,
          face_vector: vector,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Registration failed (HTTP ${res.status})`);
      }
      setResult(data);
      setStep(3);
    } catch (err: any) {
      setSubmitError(err.message);
      setStep(2); // stay on face step so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPortal = () => {
    setStep(1);
    setName('');
    setEmail('');
    setPhone('');
    setSelectedTenantId('');
    setSelectedPlanId('');
    setPlans([]);
    setFaceVector(null);
    setResult(null);
    setSubmitError(null);
    setFieldErrors({});
    setValidationError(null);
  };

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <div className="min-h-screen bg-[#060810] relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-600/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-violet-900/5 blur-[150px]" />
      </div>

      {/* Top nav bar */}
      <div className="relative z-10 border-b border-white/5 bg-white/[0.02] backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Fingerprint className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-none">BiometricAccess</div>
              <div className="text-[10px] text-slate-500 leading-none mt-0.5">Member Registration</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy-first · No images stored</span>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-8">
        <div className="flex items-center justify-center gap-0 mb-10">
          {(['Details', 'Face Scan', 'Complete'] as const).map((label, idx) => {
            const stepNum = (idx + 1) as 1 | 2 | 3;
            const isDone = step > stepNum;
            const isActive = step === stepNum;
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                      isDone
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : isActive
                        ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30 ring-4 ring-violet-500/20'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : stepNum}
                  </div>
                  <span
                    className={`text-[11px] font-medium ${
                      isActive ? 'text-violet-300' : isDone ? 'text-emerald-400' : 'text-slate-600'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < 2 && (
                  <div
                    className={`h-px w-16 mb-5 mx-1 transition-all duration-500 ${
                      step > stepNum ? 'bg-emerald-500/60' : 'bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-6 pb-16">
        <AnimatePresence mode="wait">

          {/* ── STEP 1: Personal Details ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <div className="text-center mb-8 space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300 text-xs font-medium">
                  <User className="w-3.5 h-3.5" /> Step 1 of 3 — Your Details
                </div>
                <h1 className="text-3xl font-bold text-white">Create Your Membership</h1>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Fill in your details and pick a subscription plan. Your face scan is next.
                </p>
              </div>

              {validationError && (
                <div className="mb-6 p-4 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-sm text-center">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  {validationError}
                </div>
              )}

              <form onSubmit={handleDetailsSubmit} className="space-y-5">

                {/* Organisation picker */}
                <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 space-y-4 backdrop-blur">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Building2 className="w-4 h-4 text-violet-400" /> Select Organisation
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {tenants.length === 0 ? (
                      <div className="text-center py-4 text-slate-500 text-sm animate-pulse">
                        Loading organisations…
                      </div>
                    ) : (
                      tenants.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => { setSelectedTenantId(t.id); setSelectedPlanId(''); }}
                          className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all text-left ${
                            selectedTenantId === t.id
                              ? 'bg-violet-600/15 border-violet-500/50 shadow-lg shadow-violet-500/10'
                              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-sm text-white">{t.companyName}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 capitalize">{t.planTier} tier</div>
                          </div>
                          {selectedTenantId === t.id && (
                            <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Personal info */}
                <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 space-y-4 backdrop-blur">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <User className="w-4 h-4 text-violet-400" /> Personal Information
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name <span className="text-rose-400">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => { setName(e.target.value); if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined })); }}
                        onBlur={handleNameBlur}
                        placeholder="Your full name"
                        maxLength={80}
                        autoComplete="name"
                        aria-invalid={!!fieldErrors.name}
                        className={`w-full pl-10 pr-4 py-3 bg-slate-900/80 border text-white text-sm rounded-xl outline-none transition placeholder:text-slate-600 ${
                          fieldErrors.name
                            ? 'border-rose-500/70 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                            : 'border-slate-700 hover:border-slate-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30'
                        }`}
                      />
                    </div>
                    {fieldErrors.name && <p className="mt-1.5 text-xs text-rose-400">{fieldErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }}
                        onBlur={handleEmailBlur}
                        placeholder="Your email address"
                        maxLength={254}
                        autoComplete="email"
                        aria-invalid={!!fieldErrors.email}
                        className={`w-full pl-10 pr-4 py-3 bg-slate-900/80 border text-white text-sm rounded-xl outline-none transition placeholder:text-slate-600 ${
                          fieldErrors.email
                            ? 'border-rose-500/70 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                            : 'border-slate-700 hover:border-slate-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30'
                        }`}
                      />
                    </div>
                    {fieldErrors.email && <p className="mt-1.5 text-xs text-rose-400">{fieldErrors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="reg-phone" className="block text-xs font-medium text-slate-400 mb-1.5">Mobile Number</label>
                    <div
                      className={`flex items-stretch bg-slate-900/80 border rounded-xl overflow-hidden transition ${
                        fieldErrors.phone
                          ? 'border-rose-500/70 focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500/30'
                          : 'border-slate-700 hover:border-slate-600 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500/30'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 px-3 bg-slate-800/70 border-r border-slate-700 text-slate-300 text-sm font-medium select-none shrink-0">
                        <Phone className="w-4 h-4 text-slate-500" />
                        +91
                      </span>
                      <input
                        id="reg-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        maxLength={11}
                        value={formattedPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onBlur={handlePhoneBlur}
                        placeholder="10-digit mobile number"
                        aria-invalid={!!fieldErrors.phone}
                        aria-describedby={fieldErrors.phone ? 'reg-phone-error' : undefined}
                        className="flex-1 min-w-0 px-3 py-3 bg-transparent text-white text-sm outline-none placeholder:text-slate-600 tracking-wide"
                      />
                      {phone.length === 10 && !fieldErrors.phone && (
                        <span className="flex items-center pr-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </span>
                      )}
                    </div>
                    {fieldErrors.phone ? (
                      <p id="reg-phone-error" className="mt-1.5 text-xs text-rose-400">{fieldErrors.phone}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-slate-600">Used to look you up at the front desk.</p>
                    )}
                  </div>
                </div>

                {/* Plan picker */}
                {selectedTenantId && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 space-y-4 backdrop-blur"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <Sparkles className="w-4 h-4 text-violet-400" /> Choose a Subscription Plan
                    </div>

                    {plansLoading ? (
                      <div className="text-center py-4 text-slate-500 text-sm animate-pulse">Loading plans…</div>
                    ) : plans.length === 0 ? (
                      <div className="text-center py-4 text-slate-500 text-sm">No plans found for this organisation.</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {plans.map((plan, idx) => {
                          const isSelected = selectedPlanId === plan.id;
                          const isPopular = idx === 1;
                          return (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => setSelectedPlanId(plan.id)}
                              className={`relative flex items-center justify-between px-4 py-4 rounded-xl border transition-all text-left ${
                                isSelected
                                  ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border-violet-500/50 shadow-lg shadow-violet-500/10'
                                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {isPopular && (
                                <span className="absolute -top-2 right-4 px-2 py-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full text-[10px] font-bold text-white">
                                  Popular
                                </span>
                              )}
                              <div>
                                <div className="font-semibold text-sm text-white">{plan.name}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {plan.durationDays} days
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-lg font-bold text-white">${plan.price}</div>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-400 mt-1 ml-auto" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-xl shadow-violet-500/20 text-sm"
                >
                  Continue to Face Scan <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 2: Face Capture ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {isSubmitting ? (
                <div className="flex flex-col items-center justify-center gap-5 py-20">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                    <Fingerprint className="w-9 h-9 text-violet-400 absolute inset-0 m-auto" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-white font-semibold">Registering your membership…</p>
                    <p className="text-slate-400 text-sm">Saving face embedding to Firestore</p>
                  </div>
                </div>
              ) : (
                <>
                  {submitError && (
                    <div className="mb-4 p-4 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-sm text-center">
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      {submitError}
                    </div>
                  )}
                  <FaceCaptureStep
                    subscriberName={name}
                    onCapture={handleFaceCapture}
                    onBack={() => setStep(1)}
                  />
                </>
              )}
            </motion.div>
          )}

          {/* ── STEP 3: Success ── */}
          {step === 3 && result && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-center space-y-6"
            >
              {/* Celebration icon */}
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 shadow-2xl shadow-emerald-500/20 mx-auto"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </motion.div>

              <div className="space-y-1">
                <h2 className="text-3xl font-bold text-white">You're enrolled! 🎉</h2>
                <p className="text-slate-400 text-sm">{result.message}</p>
              </div>

              {/* Membership card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/60 rounded-2xl p-6 text-left space-y-4 shadow-2xl"
              >
                {/* Card header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <div className="text-lg font-bold text-white">{result.subscriber.name}</div>
                    <div className="text-sm text-violet-300">{result.subscriber.tenantName}</div>
                  </div>
                  <div className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-300 text-xs font-bold uppercase tracking-wider">
                    Active
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Plan</div>
                    <div className="text-sm font-semibold text-slate-100">{result.subscriber.planName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Duration</div>
                    <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-violet-400" />
                      {result.subscriber.daysLeft} days left
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Start Date</div>
                    <div className="text-sm font-mono text-slate-300">
                      {new Date(result.subscriber.startDate).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Expires</div>
                    <div className="text-sm font-mono text-slate-300">
                      {new Date(result.subscriber.endDate).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  {result.subscriber.email && (
                    <div className="col-span-2">
                      <div className="text-xs text-slate-500 mb-0.5">Email</div>
                      <div className="text-sm text-slate-300">{result.subscriber.email}</div>
                    </div>
                  )}
                </div>

                {/* Biometric badge */}
                <div className="flex items-center gap-3 p-3 bg-violet-500/8 border border-violet-500/20 rounded-xl">
                  <Fingerprint className="w-5 h-5 text-violet-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-violet-300">Face Biometrics Enrolled</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {result.vectorDimension}-D vector · ID: {result.embeddingId}
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />
                </div>

                {/* Kiosk test hint */}
                <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">Test on Kiosk Now</div>
                  <div className="font-mono text-slate-500 break-all">
                    POST /api/kiosk/verify-access<br />
                    {`{ "email": "${result.subscriber.email || result.subscriber.name}" }`}
                  </div>
                </div>
              </motion.div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={resetPortal}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold rounded-xl transition text-sm"
                >
                  Register Another Member
                </button>
                <a
                  href="/"
                  className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition text-sm text-center"
                >
                  Go to Admin Dashboard
                </a>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
