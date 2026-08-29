import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import { Camera, Check, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { loadFaceEmbedder, extractFaceEmbedding, FACE_EMBEDDING_DIM } from '../lib/face-embedding';

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (faceVector: number[], snapshotUrl: string) => void;
  subscriberName: string;
}

const MODEL_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';

export function FaceEnrollmentModal({ isOpen, onClose, onEnroll, subscriberName }: FaceEnrollmentModalProps) {
  const webcamRef = useRef<Webcam>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captureStage, setCaptureStage] = useState<'initialize' | 'capture' | 'success'>('initialize');
  const [capturedVector, setCapturedVector] = useState<number[] | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  // Load Models on Mount
  useEffect(() => {
    if (isOpen && !modelsLoaded) {
      loadModels();
    }
  }, [isOpen, modelsLoaded]);

  const loadModels = async () => {
    try {
      setCaptureStage('initialize');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        loadFaceEmbedder(),
      ]);
      setModelsLoaded(true);
      setCaptureStage('capture');
    } catch (err: any) {
      console.error('Failed to load models:', err);
      setError('Could not load the face recognition model: ' + (err?.message || err));
    }
  };

  const captureAndDetect = useCallback(async () => {
    if (!webcamRef.current) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture webcam image.');
      }

      // Create HTMLImageElement to pass to face-api
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve) => { img.onload = resolve; });

      // Detect single face
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks();

      if (!detection) {
        throw new Error('No face detected. Please ensure you are clearly visible and well-lit.');
      }

      // Extract FaceNet 128-d embedding (matching the kiosk app's facenet.tflite model)
      // MobileFaceNet only — no fallback. A vector from any other extractor
      // would be cached on the kiosk but could never match a live scan.
      const descriptorArray = await extractFaceEmbedding(
        img,
        detection.alignedRect?.box ?? detection.detection.box,
        detection.landmarks
      );
      
      setSnapshot(imageSrc);
      setCapturedVector(descriptorArray);
      setCaptureStage('success');
      
    } catch (err: any) {
      setError(err.message || 'Error processing facial data.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleRetake = () => {
    setCaptureStage('capture');
    setCapturedVector(null);
    setSnapshot(null);
    setError(null);
  };

  const handleConfirm = () => {
    if (capturedVector && snapshot) {
      onEnroll(capturedVector, snapshot);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden w-full max-w-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-800/40">
            <div>
              <h2 className="text-lg font-semibold text-white">Enroll Facial Biometrics</h2>
              <p className="text-sm text-slate-400">Capturing face vector for {subscriberName || 'New Subscriber'}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {captureStage === 'initialize' && (
                <div className="flex flex-col items-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mb-3 text-indigo-400" />
                  <p>Loading AI Models...</p>
                </div>
              )}

              {captureStage === 'capture' && modelsLoaded && (
                <>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  
                  {/* Face Guide Overlay */}
                  <div className="absolute inset-0 border-[3px] border-indigo-500/30 rounded-3xl m-8 flex items-center justify-center pointer-events-none">
                    <div className="text-white/50 text-xs font-mono absolute bottom-4">Center face in frame</div>
                  </div>
                </>
              )}

              {captureStage === 'success' && snapshot && (
                <div className="relative w-full h-full">
                  <img src={snapshot} alt="Captured face" className="w-full h-full object-cover transform -scale-x-100 opacity-70" />
                  <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/20">
                    <div className="bg-slate-900/80 backdrop-blur border border-indigo-500/50 p-4 rounded-xl flex flex-col items-center">
                      <Check className="w-10 h-10 text-emerald-400 mb-2" />
                      <span className="text-white font-medium">Embedding Extracted</span>
                      <span className="text-xs text-indigo-300 font-mono mt-1">128D Vector Generated</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-slate-800/80 bg-slate-800/20 flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            
            <div className="flex gap-3">
              {captureStage === 'success' ? (
                <>
                  <button
                    onClick={handleRetake}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                  >
                    Confirm & Save
                  </button>
                </>
              ) : (
                <button
                  onClick={captureAndDetect}
                  disabled={!modelsLoaded || isProcessing}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                  {isProcessing ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Camera className="w-4 h-4" /> Scan Face</>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
