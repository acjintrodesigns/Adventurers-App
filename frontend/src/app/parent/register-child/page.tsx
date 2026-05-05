'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiChild } from '@/lib/compliance';

const adventurerClasses = [
  { id: 'little-lamb', name: 'Little Lamb', ageRange: '6 years', logo: '/class-logos/little-lamb.png' },
  { id: 'early-bird', name: 'Early Bird', ageRange: '6–7 years', logo: '/class-logos/early-bird.png' },
  { id: 'busy-bee', name: 'Busy Bee', ageRange: '7 years', logo: '/class-logos/busy-bee.png' },
  { id: 'sunbeam', name: 'Sunbeam', ageRange: '7–8 years', logo: '/class-logos/sunbeam.png' },
  { id: 'builder', name: 'Builder', ageRange: '8–9 years', logo: '/class-logos/builder.png' },
  { id: 'helping-hand', name: 'Helping Hand', ageRange: '9 years', logo: '/class-logos/helping-hand.png' },
];

const STEPS = ['Your Details', 'Child Info', 'Medical Aid', 'Payment'];

function deriveGender(idNumber: string): 'Male' | 'Female' | null {
  const digits = idNumber.replace(/\D/g, '');
  if (digits.length < 7) return null;
  const genderDigit = parseInt(digits[6], 10);
  return genderDigit >= 5 ? 'Male' : 'Female';
}

function deriveDobFromId(idNumber: string): string | null {
  const d = idNumber.replace(/\D/g, '');
  if (d.length < 6) return null;
  const year = parseInt(d.substring(0, 2), 10);
  const month = parseInt(d.substring(2, 4), 10);
  const day = parseInt(d.substring(4, 6), 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const currentYY = new Date().getFullYear() % 100;
  const fullYear = year <= currentYY ? 2000 + year : 1900 + year;
  // Return as YYYY-MM-DD for the date input
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${fullYear}-${mm}-${dd}`;
}

function validateSAID(idNumber: string): { valid: boolean; reason?: string } {
  const d = idNumber.replace(/\D/g, '');
  if (d.length !== 13) return { valid: false, reason: 'Must be exactly 13 digits' };

  // Validate embedded date (YYMMDD)
  const year = parseInt(d.substring(0, 2), 10);
  const month = parseInt(d.substring(2, 4), 10);
  const day = parseInt(d.substring(4, 6), 10);
  const fullYear = year <= new Date().getFullYear() % 100 ? 2000 + year : 1900 + year;
  const dob = new Date(fullYear, month - 1, day);
  if (
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    dob.getFullYear() !== fullYear ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return { valid: false, reason: 'Invalid date of birth in ID number' };
  }

  // Luhn algorithm checksum
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = parseInt(d[i], 10);
    if (i % 2 === 0) {
      sum += n;
    } else {
      const doubled = n * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  if (checkDigit !== parseInt(d[12], 10)) {
    return { valid: false, reason: 'Invalid ID number (checksum failed)' };
  }

  return { valid: true };
}
const REGISTRATION_FEE = 450;

const DIET_OPTIONS = [
  { value: 'omnivore', label: 'Meat Eater', icon: '🍗', desc: 'Eats meat, fish, and plant-based foods' },
  { value: 'vegetarian', label: 'Vegetarian', icon: '🥗', desc: 'No meat or fish, dairy & eggs OK' },
  { value: 'vegan', label: 'Vegan', icon: '🌱', desc: 'No animal products at all' },
];

interface Guardian {
  photo: File | null;
  firstName: string;
  lastName: string;
  idType: 'id' | 'passport';
  idNumber: string;
  dob: string;
  gender: string;
  relationship: string;
  phone: string;
  altPhone: string;
  email: string;
  addressLine1: string;
  suburb: string;
  city: string;
  postalCode: string;
  emergencyName: string;
  emergencyPhone: string;
}

function emptyGuardian(): Guardian {
  return {
    photo: null,
    firstName: '',
    lastName: '',
    idType: 'id',
    idNumber: '',
    dob: '',
    gender: '',
    relationship: '',
    phone: '',
    altPhone: '',
    email: '',
    addressLine1: '',
    suburb: '',
    city: '',
    postalCode: '',
    emergencyName: '',
    emergencyPhone: '',
  };
}

interface Child {
  photo: File | null;
  firstName: string;
  lastName: string;
  idType: 'id' | 'passport';
  idNumber: string;
  dob: string;
  diet: string;
  birthCertificate: File | null;
  selectedClass: string;
}

function emptyChild(): Child {
  return {
    photo: null,
    firstName: '',
    lastName: '',
    idType: 'id',
    idNumber: '',
    dob: '',
    diet: '',
    birthCertificate: null,
    selectedClass: '',
  };
}

interface FormState {
  // Parent / Your Details (step 1)
  guardians: Guardian[];
  // Child Info (step 2)
  children: Child[];
  // Shared medical info (step 3)
  noMedicalAid: boolean;
  medicalCoverType: 'Medical Aid' | 'Medical Insurance';
  medicalAidName: string;
  medicalAidPlan: string;
  medicalAidNumber: string;
  allergies: string;
  medicalRequirements: string;
  medicalNotes: string;
  cardFront: File | null;
  cardBack: File | null;
}

interface PublicPaymentSettings {
  studentRegistrationFeePrice: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
  onlinePaymentsEnabled: boolean;
}

interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number };
  landmarks?: Array<{ type?: string; location: { x: number; y: number } }>;
}

interface BrowserFaceDetector {
  detect: (source: CanvasImageSource) => Promise<DetectedFace[]>;
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8 px-4">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isCompleted = current > step;
        const isActive = current === step;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  isCompleted
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : isActive
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={`text-xs mt-1 font-medium whitespace-nowrap ${
                  isActive ? 'text-purple-600' : isCompleted ? 'text-purple-400' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-12 sm:w-20 mx-1 mb-5 transition-all ${
                  current > step ? 'bg-purple-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FileUploadField({
  label,
  hint,
  accept,
  capture,
  file,
  onChange,
  required,
  error,
  preview,
}: {
  label: string;
  hint?: string;
  accept: string;
  capture?: 'environment' | 'user';
  file: File | null;
  onChange: (f: File | null) => void;
  required?: boolean;
  error?: string;
  preview?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = file && preview ? URL.createObjectURL(file) : null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <div
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
          file ? 'border-purple-300 bg-purple-50' : error ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-purple-300 bg-gray-50 hover:bg-purple-50'
        }`}
      >
        {file && preview && previewUrl ? (
          <img src={previewUrl} alt={label} className="w-24 h-24 object-cover rounded-lg mx-auto mb-2" />
        ) : (
          <div className="text-3xl mb-1">{preview ? '📷' : '📄'}</div>
        )}
        <p className="text-xs font-medium text-gray-600">
          {file ? file.name : `Tap to ${capture ? 'take photo or ' : ''}choose file`}
        </p>
        {file && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="text-xs text-red-500 mt-1 hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function CameraPhotoField({
  label,
  hint,
  file,
  onChange,
  required,
  error,
}: {
  label: string;
  hint?: string;
  file: File | null;
  onChange: (f: File | null) => void;
  required?: boolean;
  error?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const focusCanvasRef = useRef<HTMLCanvasElement>(null);
  const editCanvasRef = useRef<HTMLCanvasElement>(null);
  const faceDetectorRef = useRef<BrowserFaceDetector | null>(null);
  const analyzingRef = useRef(false);
  const aiAnalyzingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [focusScore, setFocusScore] = useState(0);
  const [focusReady, setFocusReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [inFrameReady, setInFrameReady] = useState(false);
  const [fullFaceVisible, setFullFaceVisible] = useState(false);
  const [poseReady, setPoseReady] = useState(false);
  const [pythonAiOnline, setPythonAiOnline] = useState<boolean | null>(null);
  const [editorImageUrl, setEditorImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.45);
  const previewUrl = file ? URL.createObjectURL(file) : null;
  const FOCUS_READY_THRESHOLD = 8.0;
  // captureReady: focus must be OK. Face detection guides the user but
  // doesn't hard-block (Haar cascade can fail under certain lighting).
  const captureReady = focusReady;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const openCamera = useCallback(async () => {
    setCameraError('');
    setFocusScore(0);
    setFocusReady(false);
    setFaceDetected(false);
    setFullFaceVisible(false);
    setInFrameReady(false);
    setPoseReady(false);
    setMenuOpen(false);
    setCameraOpen(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MEDIA_DEVICES_UNAVAILABLE');
      }

      let stream: MediaStream;
      try {
        // Preferred for phones; some laptop webcams reject strict facing mode.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        // Desktop/laptop fallback.
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      const e = err as DOMException | Error;
      let message = 'Camera unavailable. Upload photo will open instead.';
      let shouldAutoUploadFallback = true;

      if (e instanceof DOMException) {
        if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
          message = 'Camera permission was blocked. Please allow camera access in your browser.';
          shouldAutoUploadFallback = false;
        } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
          message = 'Camera is busy in another app. Close Teams/Zoom/Camera app and try again.';
        } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
          message = 'No camera device was found on this laptop/desktop.';
        } else if (e.name === 'OverconstrainedError' || e.name === 'ConstraintNotSatisfiedError') {
          message = 'Camera settings were not supported. Try again; upload is available as fallback.';
        }
      } else if (e.message === 'MEDIA_DEVICES_UNAVAILABLE') {
        message = 'This page cannot access camera APIs here. Use Upload Photo instead.';
      }

      setCameraError(message);
      setCameraOpen(false);

      // Seamless fallback so the user can continue registration,
      // but do not force upload when permission is blocked.
      if (shouldAutoUploadFallback) {
        setTimeout(() => fileInputRef.current?.click(), 50);
      }
    }
  }, []);

  const openEditor = useCallback((url: string) => {
    setEditorImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setZoom(1.45);
    setEditorOpen(true);
  }, []);

  const capture = useCallback(() => {
    if (!captureReady) return;
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const capturedUrl = URL.createObjectURL(blob);
        openEditor(capturedUrl);
      }
      stopCamera();
      setCameraOpen(false);
    }, 'image/jpeg', 0.92);
  }, [captureReady, openEditor, stopCamera]);

  useEffect(() => {
    if (!cameraOpen) return;

    const w = window as Window & {
      FaceDetector?: new (options: { fastMode: boolean; maxDetectedFaces: number }) => BrowserFaceDetector;
    };
    if (!faceDetectorRef.current && typeof w.FaceDetector === 'function') {
      faceDetectorRef.current = new w.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    }

    const interval = setInterval(async () => {
      if (analyzingRef.current) return;
      analyzingRef.current = true;
      const video = videoRef.current;
      const canvas = focusCanvasRef.current;
      if (!video || !canvas || video.readyState < 2 || !video.videoWidth) {
        analyzingRef.current = false;
        return;
      }

      const sampleW = 320;
      const sampleH = 320;
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        analyzingRef.current = false;
        return;
      }

      ctx.drawImage(video, 0, 0, sampleW, sampleH);
      const data = ctx.getImageData(0, 0, sampleW, sampleH).data;

      // Fast focus score (Laplacian-like contrast energy) similar to what CV Python uses.
      let sum = 0;
      let count = 0;
      const centerX = sampleW / 2;
      const centerY = sampleH / 2;
      const radius = sampleW * 0.28;
      const radiusSquared = radius * radius;

      for (let y = 1; y < sampleH - 1; y += 2) {
        for (let x = 1; x < sampleW - 1; x += 2) {
          const dx = x - centerX;
          const dy = y - centerY;
          // Score sharpness mostly around the expected face zone.
          if (dx * dx + dy * dy > radiusSquared) continue;

          const i = (y * sampleW + x) * 4;
          const up = ((y - 1) * sampleW + x) * 4;
          const down = ((y + 1) * sampleW + x) * 4;
          const left = (y * sampleW + (x - 1)) * 4;
          const right = (y * sampleW + (x + 1)) * 4;

          const g = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const gUp = (data[up] + data[up + 1] + data[up + 2]) / 3;
          const gDown = (data[down] + data[down + 1] + data[down + 2]) / 3;
          const gLeft = (data[left] + data[left + 1] + data[left + 2]) / 3;
          const gRight = (data[right] + data[right + 1] + data[right + 2]) / 3;

          const lap = Math.abs(gUp + gDown + gLeft + gRight - 4 * g);
          sum += lap;
          count++;
        }
      }

      const score = count ? sum / count : 0;
      setFocusScore(score);
      setFocusReady(score >= FOCUS_READY_THRESHOLD);

      let faceFound = false;
      let centeredOk = false;
      let fullFaceOk = false;
      let poseOk = false;

      try {
        if (faceDetectorRef.current) {
          const faces = await faceDetectorRef.current.detect(video);
          if (faces.length > 0) {
            faceFound = true;
            const face = faces[0];
            const box = face.boundingBox;

            const cx = (box.x + box.width / 2) / video.videoWidth;
            const cy = (box.y + box.height / 2) / video.videoHeight;
            const sizeRatio = box.width / video.videoWidth;
            const frameMarginX = video.videoWidth * 0.09;
            const frameMarginY = video.videoHeight * 0.09;
            fullFaceOk =
              box.x > frameMarginX &&
              box.y > frameMarginY &&
              box.x + box.width < video.videoWidth - frameMarginX &&
              box.y + box.height < video.videoHeight - frameMarginY;

            const dx = cx - 0.5;
            const dy = cy - 0.5;
            const inGuideCircle = dx * dx + dy * dy <= 0.028;
            const rightSize = sizeRatio >= 0.26 && sizeRatio <= 0.52;
            centeredOk = inGuideCircle && rightSize;

            // Pose check: require clear eye + nose landmarks in strict mode.
            poseOk = false;
            const landmarks = face.landmarks as Array<{ type?: string; location: { x: number; y: number } }> | undefined;
            if (landmarks && landmarks.length > 0) {
              const leftEye = landmarks.find((l) => l.type?.toLowerCase().includes('left') && l.type?.toLowerCase().includes('eye'));
              const rightEye = landmarks.find((l) => l.type?.toLowerCase().includes('right') && l.type?.toLowerCase().includes('eye'));
              const nose = landmarks.find((l) => l.type?.toLowerCase().includes('nose'));
              const mouth = landmarks.find((l) => l.type?.toLowerCase().includes('mouth') || l.type?.toLowerCase().includes('lip'));

              if (leftEye && rightEye && nose) {
                const eyeDx = Math.abs(rightEye.location.x - leftEye.location.x);
                const eyeDy = Math.abs(rightEye.location.y - leftEye.location.y);
                const eyesLevel = eyeDx > 0 ? eyeDy / eyeDx < 0.16 : false;

                const midEyeX = (leftEye.location.x + rightEye.location.x) / 2;
                const faceWidthPx = Math.max(box.width, 1);
                const noseOffset = Math.abs(nose.location.x - midEyeX) / faceWidthPx;
                const noseCentered = noseOffset < 0.065;

                const noseInsideFace =
                  nose.location.x > box.x + box.width * 0.2 &&
                  nose.location.x < box.x + box.width * 0.8 &&
                  nose.location.y > box.y + box.height * 0.28 &&
                  nose.location.y < box.y + box.height * 0.72;

                const mouthVisible = mouth
                  ? mouth.location.y > box.y + box.height * 0.55 && mouth.location.y < box.y + box.height * 0.95
                  : true;

                poseOk = eyesLevel && noseCentered && noseInsideFace && mouthVisible;
              }
            }
          }
        } else {
          // Without a face detector, never auto-pass face/pose/in-frame checks.
          faceFound = false;
          centeredOk = false;
          fullFaceOk = false;
          poseOk = false;
        }
      } catch {
        faceFound = false;
        centeredOk = false;
        fullFaceOk = false;
        poseOk = false;
      }

      setFullFaceVisible(fullFaceOk);
      setFaceDetected(faceFound);
      setInFrameReady(centeredOk);
      setPoseReady(poseOk);

      // Python AI quality check (if service is available) for stricter full-face validation.
      if (!aiAnalyzingRef.current) {
        aiAnalyzingRef.current = true;
        try {
          const imageBase64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
          const res = await fetch('http://localhost:8000/analyze-face-quality', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: imageBase64 }),
          });

          if (!res.ok) {
            throw new Error(`AI service HTTP ${res.status}`);
          }

          const ai = await res.json();
          setPythonAiOnline(true);
          setFocusScore(typeof ai.focus_score === 'number' ? ai.focus_score : score);
          setFocusReady(Boolean(ai.focus_ready));
          setFaceDetected(Boolean(ai.face_detected));
          setFullFaceVisible(Boolean(ai.full_face_visible));
          setInFrameReady(Boolean(ai.in_frame));
          setPoseReady(Boolean(ai.pose_ready));
        } catch {
          setPythonAiOnline(false);
        } finally {
          aiAnalyzingRef.current = false;
        }
      }
      analyzingRef.current = false;
    }, 150);

    return () => clearInterval(interval);
  }, [cameraOpen, FOCUS_READY_THRESHOLD]);

  const saveEditedPhoto = useCallback(() => {
    if (!editorImageUrl || !editCanvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = editCanvasRef.current;
      if (!canvas) return;
      const size = 600;
      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.46;

      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      const baseScale = Math.max(size / img.width, size / img.height);
      const finalScale = baseScale * zoom;
      const drawW = img.width * finalScale;
      const drawH = img.height * finalScale;
      const dx = (size - drawW) / 2;
      const dy = (size - drawH) / 2;

      ctx.drawImage(img, dx, dy, drawW, drawH);
      ctx.restore();

      canvas.toBlob((blob) => {
        if (!blob) return;
        const editedFile = new File([blob], 'child-photo.jpg', { type: 'image/jpeg' });
        onChange(editedFile);
        setEditorOpen(false);
      }, 'image/jpeg', 0.94);
    };
    img.src = editorImageUrl;
  }, [editorImageUrl, onChange, zoom]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (editorImageUrl) URL.revokeObjectURL(editorImageUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [editorImageUrl, previewUrl, stopCamera]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}

      {/* Camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">
            <div className="bg-gray-900 relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-square object-cover"
              />
              <div
                className={`absolute inset-0 border-4 rounded pointer-events-none transition-colors ${
                  captureReady ? 'border-green-400' : 'border-red-400'
                }`}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`w-[58%] h-[58%] rounded-full border-4 transition-colors ${
                    captureReady ? 'border-green-300' : 'border-red-300'
                  }`}
                />
              </div>
              <div className="absolute bottom-2 left-2 right-2 text-center">
                <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${captureReady ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                  {captureReady
                    ? 'Clear - ready to capture'
                    : !faceDetected
                    ? 'No face detected'
                    : !fullFaceVisible
                    ? 'Show full face (no cropping/covering)'
                    : !inFrameReady
                    ? 'Center face inside the circle'
                    : !poseReady
                    ? 'Look straight at the camera'
                    : 'Hold still for focus'}
                </span>
              </div>
            </div>
            <div className="p-4 flex gap-3">
              <button
                type="button"
                onClick={() => { stopCamera(); setCameraOpen(false); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capture}
                disabled={!captureReady}
                className={`flex-2 py-2.5 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
                  captureReady
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span className="text-lg">📸</span> Capture
              </button>
            </div>
            <div className="px-4 pb-3 -mt-1 text-center">
              <p className="text-xs text-gray-500">Focus score: {focusScore.toFixed(1)} (ready at {FOCUS_READY_THRESHOLD})</p>
              <p className="text-[11px] text-gray-400 mt-1">
                AI: {pythonAiOnline === true ? 'Python' : pythonAiOnline === false ? 'Local fallback' : 'Checking...'} | Face: {faceDetected ? 'OK' : 'No'} | Full face: {fullFaceVisible ? 'OK' : 'Adjust'} | Frame: {inFrameReady ? 'OK' : 'Adjust'} | Pose: {poseReady ? 'OK' : 'Adjust'} | Focus: {focusReady ? 'OK' : 'Wait'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Editor modal */}
      {editorOpen && editorImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Edit Photo</p>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="p-3">
              <div className="relative bg-[#c7cbd3] rounded-lg overflow-hidden aspect-square">
                <img
                  src={editorImageUrl}
                  alt="Edit child"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: `scale(${zoom})` }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[72%] h-[72%] rounded-full border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.2)]" />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-500">-</span>
                <input
                  type="range"
                  min={1}
                  max={2.6}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-purple-600"
                />
                <span className="text-xs text-gray-500">+</span>
                <span className="text-xs text-gray-400 w-9 text-right">{Math.round((zoom - 1) * 100)}%</span>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="border border-gray-300 text-gray-700 py-2 px-3 rounded-lg text-xs font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditedPhoto}
                  className="bg-[#2f6df6] text-white py-2 px-4 rounded-lg text-xs font-semibold hover:bg-[#2358c9]"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <canvas ref={captureCanvasRef} className="hidden" />
      <canvas ref={focusCanvasRef} className="hidden" />
      <canvas ref={editCanvasRef} className="hidden" />

      {/* Preview or action area */}
      <div className={`rounded-xl p-4 text-center transition-colors ${error ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
        <div className="relative w-28 h-28 mx-auto">
          {file && previewUrl ? (
            <img src={previewUrl} alt="Child photo" className="w-28 h-28 object-cover rounded-full border-4 border-white shadow" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gray-300 border-4 border-white shadow-inner" />
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gray-500 text-white border-2 border-white shadow flex items-center justify-center text-xl font-semibold hover:bg-gray-600"
            aria-label="Photo options"
          >
            +
          </button>

          {menuOpen && (
            <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
              <button
                type="button"
                onClick={openCamera}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-purple-50"
              >
                Take Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-purple-50"
              >
                Upload Photo
              </button>
              {file && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onChange(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                >
                  Remove Photo
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-3">
          {file ? 'Photo selected' : 'Tap + to add child profile photo'}
        </p>

        {cameraError && (
          <div className="mt-2">
            <p className="text-xs text-red-500">{cameraError}</p>
            <button
              type="button"
              onClick={openCamera}
              className="mt-2 text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline"
            >
              Try Camera Again
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (!f) return;
          setMenuOpen(false);
          const uploadUrl = URL.createObjectURL(f);
          openEditor(uploadUrl);
        }}
      />
    </div>
  );
}

export default function RegisterChildPage() {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [approvedChildren, setApprovedChildren] = useState<ApiChild[]>([]);
  const [loadingApprovedChildren, setLoadingApprovedChildren] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PublicPaymentSettings>({
    studentRegistrationFeePrice: REGISTRATION_FEE,
    bankName: 'First National Bank',
    accountName: 'Bassonia Adventurer Club',
    accountNumber: 'XXXX XXXX XXXX',
    branchCode: '250655',
    onlinePaymentsEnabled: false,
  });

  const { token } = useAuth();
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009';
  const registrationFee = paymentSettings.studentRegistrationFeePrice || REGISTRATION_FEE;

  const emptyForm: FormState = {
    guardians: [emptyGuardian()],
    children: [emptyChild()],
    noMedicalAid: false,
    medicalCoverType: 'Medical Aid',
    medicalAidName: '',
    medicalAidPlan: '',
    medicalAidNumber: '',
    allergies: '',
    medicalRequirements: '',
    medicalNotes: '',
    cardFront: null,
    cardBack: null,
  };

  const [form, setForm] = useState<FormState>(emptyForm);

  const set = (field: keyof FormState, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    set(name as keyof FormState, value);
  };

  function validateStep(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 1) {
      form.guardians.forEach((g, i) => {
        if (!g.firstName.trim()) e[`g${i}_firstName`] = 'First name is required';
        if (!g.lastName.trim()) e[`g${i}_lastName`] = 'Last name is required';
        if (!g.relationship) e[`g${i}_relationship`] = 'Please select your relationship to the child';
        if (!g.phone.trim()) e[`g${i}_phone`] = 'Phone number is required';
        if (g.idType === 'id' && g.idNumber.trim()) {
          const check = validateSAID(g.idNumber);
          if (!check.valid) e[`g${i}_idNumber`] = check.reason ?? 'Invalid ID number';
        }
      });
    }
    if (s === 2) {
      form.children.forEach((c, i) => {
        if (!c.firstName.trim()) e[`c${i}_firstName`] = 'First name is required';
        if (!c.lastName.trim()) e[`c${i}_lastName`] = 'Last name is required';
        if (!c.idNumber.trim()) {
          e[`c${i}_idNumber`] = c.idType === 'passport' ? 'Passport number is required' : 'ID number is required';
        } else if (c.idType === 'id') {
          const idCheck = validateSAID(c.idNumber);
          if (!idCheck.valid) e[`c${i}_idNumber`] = idCheck.reason ?? 'Invalid ID number';
        }
        if (!c.dob) e[`c${i}_dob`] = 'Date of birth is required';
        if (!c.photo) e[`c${i}_photo`] = 'Child photo is required';
        if (!c.birthCertificate) e[`c${i}_birthCertificate`] = 'Birth certificate is required';
        if (!c.diet) e[`c${i}_diet`] = 'Please select a dietary preference';
        if (!c.selectedClass) e[`c${i}_selectedClass`] = 'Please select a class for this child';
      });
    }
    return e;
  }

  function next() {
    const e = validateStep(step);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    // Persist guardian details silently when advancing from step 1
    if (step === 1 && token && token !== 'mock-token') {
      const g = form.guardians[0];
      // Build secondary guardians array (all guardians except the first)
      const secondaryGuardians = form.guardians.slice(1).map((sg) => ({
        name: [sg.firstName, sg.lastName].filter(Boolean).join(' '),
        relationship: sg.relationship || '',
        phone: sg.phone.trim(),
        altPhone: sg.altPhone?.trim() || '',
        email: sg.email.trim(),
        address: [sg.addressLine1, sg.suburb, sg.city, sg.postalCode].filter(Boolean).join(', '),
        emergencyContactName: sg.emergencyName.trim(),
        emergencyContactPhone: sg.emergencyPhone.trim(),
        idType: sg.idType,
        idNumber: sg.idNumber.trim(),
      }));
      fetch(`${base}/api/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: [g.firstName, g.lastName].filter(Boolean).join(' ') || null,
          relationship: g.relationship || null,
          phone: g.phone.trim() || null,
          address: [g.addressLine1, g.suburb, g.city].filter(Boolean).join(', ') || null,
          emergencyContactName: g.emergencyName.trim() || null,
          emergencyContactPhone: g.emergencyPhone.trim() || null,
          secondaryGuardianJson: secondaryGuardians.length > 0 ? JSON.stringify(secondaryGuardians) : null,
        }),
      }).catch(() => { /* non-fatal */ });
    }
    setStep((s) => s + 1);
  }

  function back() {
    setErrors({});
    setStep((s) => s - 1);
  }

  const getChildClass = (child: Child) => adventurerClasses.find((cl) => cl.id === child.selectedClass);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill first guardian from profile and load approved children for payment
  useEffect(() => {
    setLoadingApprovedChildren(true);
    if (!token || token === 'mock-token') {
      setLoadingApprovedChildren(false);
      return;
    }
    fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        setForm((prev) => ({
          ...prev,
          guardians: prev.guardians.map((g, i) => i === 0 ? {
            ...g,
            relationship: data.relationship ?? g.relationship,
            phone: data.phone ?? g.phone,
            addressLine1: data.address ?? g.addressLine1,
            emergencyName: data.emergencyContactName ?? g.emergencyName,
            emergencyPhone: data.emergencyContactPhone ?? g.emergencyPhone,
            firstName: data.name?.split(' ')[0] ?? g.firstName,
            lastName: data.name?.split(' ').slice(1).join(' ') ?? g.lastName,
            email: data.email ?? g.email,
          } : g),
        }));
      })
      .catch(() => { /* non-fatal */ });
    
    // Load approved children for payment
    fetch(`${base}/api/children`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((children: ApiChild[]) => {
        const paid = children.filter((c) => c.status === 'Paid');
        const approved = children.filter((c) => c.status === 'Approved');
        // If all children are paid, show completion state
        if (paid.length > 0 && approved.length === 0) {
          setApprovedChildren(paid);
          setSubmitted(true);
          setStep(4);
        } else {
          setApprovedChildren(approved);
        }
      })
      .catch(() => { /* non-fatal */ })
      .finally(() => setLoadingApprovedChildren(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // If approved children exist, jump to payment step
  useEffect(() => {
    if (!loadingApprovedChildren && approvedChildren.length > 0) {
      setStep(4);
    }
  }, [loadingApprovedChildren, approvedChildren]);

  useEffect(() => {
    const loadPaymentSettings = async () => {
      try {
        const data = await apiFetch('/api/payment-settings');
        setPaymentSettings({
          studentRegistrationFeePrice: data.studentRegistrationFeePrice ?? REGISTRATION_FEE,
          bankName: data.bankName ?? 'First National Bank',
          accountName: data.accountName ?? 'Bassonia Adventurer Club',
          accountNumber: data.accountNumber ?? 'XXXX XXXX XXXX',
          branchCode: data.branchCode ?? '250655',
          onlinePaymentsEnabled: data.onlinePaymentsEnabled ?? false,
        });
      } catch {
        // Keep defaults if settings API is unavailable.
      }
    };

    void loadPaymentSettings();
  }, []);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const medicalAidInfo = form.noMedicalAid
        ? 'No medical aid'
        : [form.medicalCoverType, form.medicalAidName, form.medicalAidPlan, form.medicalAidNumber]
            .filter(Boolean)
            .join(' | ') || undefined;

      const extraHealth = [
        form.allergies ? `Allergies: ${form.allergies}` : '',
        form.medicalRequirements ? `Requirements: ${form.medicalRequirements}` : '',
        form.medicalNotes ? `Notes: ${form.medicalNotes}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const selectedCls = (child: Child) => adventurerClasses.find((cl) => cl.id === child.selectedClass);
      const fileToDataUrl = (file: File | null) =>
        new Promise<string | null>((resolve) => {
          if (!file) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });

      // First, save the parent's profile with primary and secondary guardian details
      const primaryGuardian = form.guardians[0];
      const secondaryGuardians = form.guardians.slice(1).map((sg) => ({
        name: sg.firstName && sg.lastName ? `${sg.firstName} ${sg.lastName}` : sg.firstName || sg.lastName || '',
        relationship: sg.relationship,
        phone: sg.phone,
        altPhone: sg.altPhone || undefined,
        email: sg.email,
        address: sg.addressLine1 || '',
        emergencyContactName: sg.emergencyName,
        emergencyContactPhone: sg.emergencyPhone,
        idType: sg.idType || undefined,
        idNumber: sg.idNumber || undefined,
      }));

      await apiFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: primaryGuardian.firstName && primaryGuardian.lastName ? `${primaryGuardian.firstName} ${primaryGuardian.lastName}` : primaryGuardian.firstName || primaryGuardian.lastName || null,
          phone: primaryGuardian.phone || null,
          address: primaryGuardian.addressLine1 || null,
          relationship: primaryGuardian.relationship || null,
          emergencyContactName: primaryGuardian.emergencyName || null,
          emergencyContactPhone: primaryGuardian.emergencyPhone || null,
          secondaryGuardianJson: secondaryGuardians.length > 0 ? JSON.stringify(secondaryGuardians) : null,
        }),
      });

      // Register each child
      for (const child of form.children) {
        const cls = selectedCls(child);
        const photoUrl = await fileToDataUrl(child.photo);
        await apiFetch('/api/children', {
          method: 'POST',
          body: JSON.stringify({
            name: `${child.firstName.trim()} ${child.lastName.trim()}`,
            dateOfBirth: child.dob,
            class: cls?.name ?? child.selectedClass,
            documentType: child.idType === 'passport' ? 'Passport' : 'ID',
            documentNumber: child.idNumber.trim(),
            medicalAidInfo: [medicalAidInfo, extraHealth].filter(Boolean).join(' || ') || null,
            photoUrl,
          }),
        });
      }
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    // Payment completed or already fully registered - show adventurer codes
    if (approvedChildren.length > 0 && step === 4) {
      const allAlreadyPaid = approvedChildren.every((c) => c.status === 'Paid');
      return (
        <div className="p-6 max-w-2xl mx-auto mt-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{allAlreadyPaid ? '🎖️' : '✅'}</div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              {allAlreadyPaid ? 'Registration Complete' : 'Payment Successful!'}
            </h2>
            <p className="text-gray-500 text-sm">
              {allAlreadyPaid
                ? 'Your children are fully registered. No further action is needed.'
                : 'Your children are now fully registered and ready to start their adventure!'}
            </p>
          </div>

          {/* Adventurer codes card */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-200 p-6 mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-purple-900 mb-2">🎖️ Adventurer Codes</h3>
            {approvedChildren.map((child) => (
              <div key={child.id} className="bg-white rounded-xl p-4 text-left flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{child.name}</p>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{child.class}</p>
                </div>
                {child.adventurerCode ? (
                  <code className="text-base font-bold text-purple-700 bg-purple-100 px-4 py-1.5 rounded-lg font-mono tracking-widest flex-shrink-0">
                    {child.adventurerCode}
                  </code>
                ) : (
                  <span className="text-xs text-gray-400 italic">Code pending…</span>
                )}
              </div>
            ))}
          </div>

          <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-center">
            ℹ️ Save these codes — they will be used for check-in and activities!
          </p>

          {/* Greyed-out "registration already done" notice */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 mb-6 opacity-60 select-none">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Registration form</p>
            <div className="space-y-2">
              {['Guardian details', 'Child information', 'Medical information', 'Payment'].map((label) => (
                <div key={label} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                  <span className="text-green-500 text-base">✓</span>
                  <span className="text-sm text-gray-400">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">All steps completed — registration is closed.</p>
          </div>

          <button
            onClick={() => {
              setSubmitted(false);
              setStep(1);
              setForm(emptyForm);
              setApprovedChildren([]);
              window.location.href = '/parent/dashboard';
            }}
            className="w-full bg-[#1e3a5f] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#2a4f7c]"
          >
            Go to Dashboard
          </button>
        </div>
      );
    }

    // Initial registration - pending approval
    return (
      <div className="p-6 max-w-2xl mx-auto text-center mt-16">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-[#1e3a5f] mb-2">Registration Submitted!</h2>
        <p className="text-gray-500 mb-1">
          {form.children.length === 1
            ? `${form.children[0].firstName} ${form.children[0].lastName} has been registered for ${getChildClass(form.children[0])?.name ?? form.children[0].selectedClass}.`
            : `${form.children.length} children have been registered.`}
        </p>
        <p className="text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mt-3">
          ⏳ Your registration is pending director approval. You will receive payment instructions once approved.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setStep(1);
            setForm(emptyForm);
          }}
          className="mt-6 bg-[#1e3a5f] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]"
        >
          Register Another Child
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Register My Child</h1>
      <p className="text-sm text-gray-400 mb-6">Complete all 4 steps to register your child and proceed to payment.</p>

      <StepIndicator current={step} />

      <form onSubmit={handleFormSubmit}>

        {/* ── Step 1: Your Details ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-base font-semibold text-gray-800">Parent / Guardian Details</h2>
              <p className="text-xs text-gray-400 mt-0.5">Complete details for each parent or guardian. These are saved to your profile.</p>
            </div>

            {form.guardians.map((g, i) => {
              const upd = (field: keyof Guardian, value: unknown) =>
                setForm((prev) => ({
                  ...prev,
                  guardians: prev.guardians.map((gg, ii) => ii === i ? { ...gg, [field]: value } : gg),
                }));
              const err = (field: string) => errors[`g${i}_${field}`];

              // Auto-fill DOB and gender from SA ID
              const handleIdChange = (val: string) => {
                upd('idNumber', val);
                if (g.idType === 'id' && val.length >= 6) {
                  const derived = deriveDobFromId(val);
                  if (derived) upd('dob', derived);
                  const derivedGender = deriveGender(val);
                  if (derivedGender) upd('gender', derivedGender);
                }
              };

              return (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                  {/* Card header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                      {i === 0 ? 'Primary Guardian' : `Additional Guardian ${i + 1}`}
                    </h3>
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, guardians: prev.guardians.filter((_, ii) => ii !== i) }))}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {/* Photo */}
                  <div className="max-w-xs mx-auto">
                    <CameraPhotoField
                      label="Guardian Photo"
                      hint="Tap + to take or upload a profile photo"
                      file={g.photo}
                      onChange={(f) => upd('photo', f)}
                    />
                  </div>

                  {/* Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={g.firstName}
                        onChange={(e) => upd('firstName', e.target.value)}
                        placeholder="e.g. Jane"
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${err('firstName') ? 'border-red-400' : 'border-gray-300'}`}
                      />
                      {err('firstName') && <p className="text-xs text-red-500 mt-1">{err('firstName')}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={g.lastName}
                        onChange={(e) => upd('lastName', e.target.value)}
                        placeholder="e.g. Smith"
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${err('lastName') ? 'border-red-400' : 'border-gray-300'}`}
                      />
                      {err('lastName') && <p className="text-xs text-red-500 mt-1">{err('lastName')}</p>}
                    </div>
                  </div>

                  {/* Identification */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Identification Type</label>
                      <div className="flex flex-wrap gap-3 border border-gray-300 rounded-lg px-3 py-2.5">
                        {(['id', 'passport'] as const).map((t) => (
                          <label key={t} className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="radio"
                              checked={g.idType === t}
                              onChange={() => { upd('idType', t); upd('idNumber', ''); }}
                              className="accent-purple-600"
                            />
                            {t === 'id' ? 'SA ID Number' : 'Passport Number'}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {g.idType === 'id' ? 'SA ID Number' : 'Passport Number'}
                      </label>
                      <input
                        type="text"
                        value={g.idNumber}
                        onChange={(e) => handleIdChange(e.target.value)}
                        maxLength={g.idType === 'id' ? 13 : 20}
                        placeholder={g.idType === 'id' ? '13-digit SA ID' : 'Passport number'}
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${g.idType === 'id' ? 'tracking-widest pr-9' : ''} ${
                          err('idNumber')
                            ? 'border-red-400'
                            : g.idType === 'id' && g.idNumber.length === 13
                            ? validateSAID(g.idNumber).valid ? 'border-green-400' : 'border-red-400'
                            : 'border-gray-300'
                        }`}
                      />
                      {g.idType === 'id' && g.idNumber.length === 13 && (
                        <span className="absolute right-3 bottom-2.5 text-base">
                          {validateSAID(g.idNumber).valid ? '✅' : '❌'}
                        </span>
                      )}
                      {g.idType === 'id' && g.idNumber.length === 13 && !validateSAID(g.idNumber).valid && (
                        <p className="text-xs text-red-500 mt-1">{validateSAID(g.idNumber).reason}</p>
                      )}
                      {g.idType === 'id' && g.idNumber.length === 13 && validateSAID(g.idNumber).valid && (
                        <p className="text-xs text-green-600 mt-1">✓ Valid South African ID number</p>
                      )}
                      {err('idNumber') && <p className="text-xs text-red-500 mt-1">{err('idNumber')}</p>}
                    </div>
                  </div>

                  {/* DOB & Gender derived from ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={g.dob}
                          onChange={(e) => upd('dob', e.target.value)}
                          readOnly={g.idType === 'id' && g.idNumber.length >= 6 && deriveDobFromId(g.idNumber) !== null}
                          className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            g.idType === 'id' && g.idNumber.length >= 6 && deriveDobFromId(g.idNumber) !== null
                              ? 'bg-gray-50 border-purple-200 text-gray-600 cursor-default'
                              : err('dob') ? 'border-red-400' : 'border-gray-300'
                          }`}
                        />
                        {g.idType === 'id' && g.idNumber.length >= 6 && deriveDobFromId(g.idNumber) !== null && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-purple-500 italic">auto</span>
                        )}
                      </div>
                      {err('dob') && <p className="text-xs text-red-500 mt-1">{err('dob')}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      {(() => {
                        const derivedGender = g.idType === 'id' ? deriveGender(g.idNumber) : null;
                        return (
                          <div className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 text-sm bg-gray-50 ${
                            derivedGender ? 'border-purple-200' : 'border-gray-200'
                          }`}>
                            <span className="text-lg">{derivedGender === 'Male' ? '♂' : derivedGender === 'Female' ? '♀' : '—'}</span>
                            <span className={`font-semibold ${
                              derivedGender === 'Male' ? 'text-blue-600' : derivedGender === 'Female' ? 'text-pink-500' : 'text-gray-400'
                            }`}>
                              {derivedGender ?? (g.idType === 'id' ? 'Determined from ID number' : 'N/A for passport')}
                            </span>
                            {derivedGender && <span className="ml-auto text-xs text-gray-400 italic">auto-detected</span>}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship to Child <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['Mother', 'Father', 'Guardian', 'Grandparent', 'Other'].map((r) => (
                        <label
                          key={r}
                          className={`flex items-center gap-2 border-2 rounded-xl px-3 py-2 cursor-pointer text-sm font-medium transition-all ${
                            g.relationship === r
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 text-gray-700 hover:border-purple-300'
                          }`}
                        >
                          <input type="radio" checked={g.relationship === r} onChange={() => { upd('relationship', r); setErrors((prev) => ({ ...prev, [`g${i}_relationship`]: '' })); }} className="sr-only" />
                          {r}
                        </label>
                      ))}
                    </div>
                    {err('relationship') && <p className="text-xs text-red-500 mt-1">{err('relationship')}</p>}
                  </div>

                  {/* Contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={g.phone}
                        onChange={(e) => upd('phone', e.target.value)}
                        placeholder="e.g. 082 000 0000"
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${err('phone') ? 'border-red-400' : 'border-gray-300'}`}
                      />
                      {err('phone') && <p className="text-xs text-red-500 mt-1">{err('phone')}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alternative Phone</label>
                      <input
                        type="tel"
                        value={g.altPhone}
                        onChange={(e) => upd('altPhone', e.target.value)}
                        placeholder="e.g. 011 000 0000"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={g.email}
                        onChange={(e) => upd('email', e.target.value)}
                        placeholder="e.g. jane@example.com"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">Home Address</h4>
                      {i > 0 && (
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-purple-600"
                            checked={
                              g.addressLine1 === form.guardians[0].addressLine1 &&
                              g.suburb === form.guardians[0].suburb &&
                              g.city === form.guardians[0].city &&
                              g.postalCode === form.guardians[0].postalCode &&
                              (!!form.guardians[0].addressLine1 || !!form.guardians[0].suburb)
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                const p = form.guardians[0];
                                upd('addressLine1', p.addressLine1);
                                upd('suburb', p.suburb);
                                upd('city', p.city);
                                upd('postalCode', p.postalCode);
                              } else {
                                upd('addressLine1', '');
                                upd('suburb', '');
                                upd('city', '');
                                upd('postalCode', '');
                              }
                            }}
                          />
                          <span className="text-xs text-purple-600 font-medium">Same as primary guardian</span>
                        </label>
                      )}
                    </div>
                    {(() => {
                      const sameAsFirst = i > 0 &&
                        g.addressLine1 === form.guardians[0].addressLine1 &&
                        g.suburb === form.guardians[0].suburb &&
                        g.city === form.guardians[0].city &&
                        g.postalCode === form.guardians[0].postalCode &&
                        (!!form.guardians[0].addressLine1 || !!form.guardians[0].suburb);
                      return (
                        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${sameAsFirst ? 'opacity-50 pointer-events-none' : ''}`}>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                            <input
                              type="text"
                              value={g.addressLine1}
                              onChange={(e) => upd('addressLine1', e.target.value)}
                              placeholder="e.g. 12 Oak Street"
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Suburb</label>
                            <input
                              type="text"
                              value={g.suburb}
                              onChange={(e) => upd('suburb', e.target.value)}
                              placeholder="e.g. Bassonia"
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input
                              type="text"
                              value={g.city}
                              onChange={(e) => upd('city', e.target.value)}
                              placeholder="e.g. Johannesburg"
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                            <input
                              type="text"
                              value={g.postalCode}
                              onChange={(e) => upd('postalCode', e.target.value)}
                              placeholder="e.g. 2198"
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Emergency Contact */}
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contact</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                        <input
                          type="text"
                          value={g.emergencyName}
                          onChange={(e) => upd('emergencyName', e.target.value)}
                          placeholder="e.g. John Smith"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                        <input
                          type="tel"
                          value={g.emergencyPhone}
                          onChange={(e) => upd('emergencyPhone', e.target.value)}
                          placeholder="e.g. 083 000 0000"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add guardian button */}
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, guardians: [...prev.guardians, emptyGuardian()] }))}
              className="w-full border-2 border-dashed border-purple-300 rounded-2xl py-4 text-purple-600 font-semibold text-sm hover:border-purple-500 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl leading-none">+</span> Add Another Parent / Guardian
            </button>
          </div>
        )}

        {/* ── Step 2: Child Information ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-base font-semibold text-gray-800">Children Information</h2>
              <p className="text-xs text-gray-400 mt-0.5">Add details for each child you want to register.</p>
            </div>

            {form.children.map((c, i) => {
              const upd = (field: keyof Child, value: unknown) =>
                setForm((prev) => ({
                  ...prev,
                  children: prev.children.map((cc, ii) => ii === i ? { ...cc, [field]: value } : cc),
                }));
              const err = (field: string) => errors[`c${i}_${field}`];

              const handleIdChange = (val: string) => {
                upd('idNumber', val);
                if (c.idType === 'id' && val.length >= 6) {
                  const derived = deriveDobFromId(val);
                  if (derived) upd('dob', derived);
                }
              };

              return (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                  {/* Card header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                      {i === 0 ? 'Child 1' : `Child ${i + 1}`}
                    </h3>
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, children: prev.children.filter((_, ii) => ii !== i) }))}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {/* Photo */}
                  <div className="max-w-xs mx-auto">
                    <CameraPhotoField
                      label="Child Photo"
                      hint="Tap + to take or upload a profile photo"
                      file={c.photo}
                      onChange={(f) => upd('photo', f)}
                      required
                      error={err('photo')}
                    />
                  </div>

                  {/* Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={c.firstName}
                        onChange={(e) => upd('firstName', e.target.value)}
                        placeholder="e.g. Sarah"
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${err('firstName') ? 'border-red-400' : 'border-gray-300'}`}
                      />
                      {err('firstName') && <p className="text-xs text-red-500 mt-1">{err('firstName')}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={c.lastName}
                        onChange={(e) => upd('lastName', e.target.value)}
                        placeholder="e.g. Smith"
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${err('lastName') ? 'border-red-400' : 'border-gray-300'}`}
                      />
                      {err('lastName') && <p className="text-xs text-red-500 mt-1">{err('lastName')}</p>}
                    </div>
                  </div>

                  {/* Identification */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Identification Type</label>
                      <div className="flex flex-wrap gap-3 border border-gray-300 rounded-lg px-3 py-2.5">
                        {(['id', 'passport'] as const).map((t) => (
                          <label key={t} className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="radio"
                              checked={c.idType === t}
                              onChange={() => { upd('idType', t); upd('idNumber', ''); }}
                              className="accent-purple-600"
                            />
                            {t === 'id' ? 'SA ID Number' : 'Passport Number'}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {c.idType === 'id' ? 'SA ID Number' : 'Passport Number'}
                      </label>
                      <input
                        type="text"
                        value={c.idNumber}
                        onChange={(e) => handleIdChange(e.target.value)}
                        maxLength={c.idType === 'id' ? 13 : 20}
                        placeholder={c.idType === 'id' ? '13-digit SA ID' : 'Passport number'}
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${c.idType === 'id' ? 'tracking-widest pr-9' : ''} ${
                          err('idNumber')
                            ? 'border-red-400'
                            : c.idType === 'id' && c.idNumber.length === 13
                            ? validateSAID(c.idNumber).valid ? 'border-green-400' : 'border-red-400'
                            : 'border-gray-300'
                        }`}
                      />
                      {c.idType === 'id' && c.idNumber.length === 13 && (
                        <span className="absolute right-3 bottom-2.5 text-base">
                          {validateSAID(c.idNumber).valid ? '✅' : '❌'}
                        </span>
                      )}
                      {c.idType === 'id' && c.idNumber.length === 13 && !validateSAID(c.idNumber).valid && (
                        <p className="text-xs text-red-500 mt-1">{validateSAID(c.idNumber).reason}</p>
                      )}
                      {c.idType === 'id' && c.idNumber.length === 13 && validateSAID(c.idNumber).valid && (
                        <p className="text-xs text-green-600 mt-1">✓ Valid South African ID number</p>
                      )}
                      {err('idNumber') && <p className="text-xs text-red-500 mt-1">{err('idNumber')}</p>}
                    </div>
                  </div>

                  {/* DOB & Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={c.dob}
                          onChange={(e) => upd('dob', e.target.value)}
                          readOnly={c.idType === 'id' && c.idNumber.length >= 6 && deriveDobFromId(c.idNumber) !== null}
                          className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            c.idType === 'id' && c.idNumber.length >= 6 && deriveDobFromId(c.idNumber) !== null
                              ? 'bg-gray-50 border-purple-200 text-gray-600 cursor-default'
                              : err('dob') ? 'border-red-400' : 'border-gray-300'
                          }`}
                        />
                        {c.idType === 'id' && c.idNumber.length >= 6 && deriveDobFromId(c.idNumber) !== null && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-purple-500 italic">auto</span>
                        )}
                      </div>
                      {err('dob') && <p className="text-xs text-red-500 mt-1">{err('dob')}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      {(() => {
                        const gender = c.idType === 'id' ? deriveGender(c.idNumber) : null;
                        return (
                          <div className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 text-sm bg-gray-50 ${
                            gender ? 'border-purple-200' : 'border-gray-200'
                          }`}>
                            <span className="text-lg">{gender === 'Male' ? '♂' : gender === 'Female' ? '♀' : '—'}</span>
                            <span className={`font-semibold ${
                              gender === 'Male' ? 'text-blue-600' : gender === 'Female' ? 'text-pink-500' : 'text-gray-400'
                            }`}>
                              {gender ?? (c.idType === 'id' ? 'Determined from ID number' : 'N/A for passport')}
                            </span>
                            {gender && <span className="ml-auto text-xs text-gray-400 italic">auto-detected</span>}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Birth Certificate */}
                  <div className="max-w-md">
                    <FileUploadField
                      label="Birth Certificate"
                      hint="PDF or photo of the birth certificate"
                      accept=".pdf,image/*"
                      file={c.birthCertificate}
                      onChange={(f) => upd('birthCertificate', f)}
                      required
                      error={err('birthCertificate')}
                    />
                  </div>

                  {/* Dietary Preference */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Dietary Preference <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {DIET_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-start gap-3 border-2 rounded-xl p-3.5 cursor-pointer transition-all ${
                            c.diet === opt.value
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            value={opt.value}
                            checked={c.diet === opt.value}
                            onChange={() => upd('diet', opt.value)}
                            className="mt-0.5 accent-purple-600"
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{opt.icon} {opt.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {err('diet') && <p className="text-xs text-red-500 mt-2">{err('diet')}</p>}
                  </div>

                  {/* Class Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Adventurer Class <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {adventurerClasses.map((cls) => (
                        <button
                          type="button"
                          key={cls.id}
                          onClick={() => upd('selectedClass', cls.id)}
                          className={`border-2 rounded-xl p-3 text-center transition-all bg-white text-gray-700 hover:border-purple-300 ${
                            c.selectedClass === cls.id
                              ? 'border-purple-600 ring-2 ring-purple-300 ring-offset-1'
                              : 'border-gray-200'
                          }`}
                        >
                          <img src={cls.logo} alt={cls.name} className="w-10 h-10 object-contain mx-auto mb-1.5" />
                          <p className="font-lyla text-base">{cls.name}</p>
                          <p className="text-xs text-gray-400">{cls.ageRange}</p>
                        </button>
                      ))}
                    </div>
                    {err('selectedClass') && <p className="text-xs text-red-500 mt-2">{err('selectedClass')}</p>}
                  </div>
                </div>
              );
            })}

            {/* Add child button */}
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, children: [...prev.children, emptyChild()] }))}
              className="w-full border-2 border-dashed border-purple-300 rounded-2xl py-4 text-purple-600 font-semibold text-sm hover:border-purple-500 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl leading-none">+</span> Add Another Child
            </button>
          </div>
        )}

        {/* ── Step 3: Medical Aid ── */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div className="flex items-start justify-between">
              <h2 className="text-base font-semibold text-gray-800">Medical Cover Information</h2>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.noMedicalAid}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setForm((prev) => ({ ...prev, noMedicalAid: true, medicalAidName: '', medicalAidPlan: '', medicalAidNumber: '', cardFront: null, cardBack: null }));
                    } else {
                      set('noMedicalAid', false);
                    }
                  }}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-sm text-gray-500">No medical aid</span>
              </label>
            </div>

            <div className={`space-y-5 transition-opacity ${form.noMedicalAid ? 'opacity-40 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cover Type</label>
                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-300 px-3 py-2.5">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="medicalCoverType"
                      value="Medical Aid"
                      checked={form.medicalCoverType === 'Medical Aid'}
                      onChange={() => set('medicalCoverType', 'Medical Aid')}
                      className="accent-purple-600"
                    />
                    Medical Aid
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="medicalCoverType"
                      value="Medical Insurance"
                      checked={form.medicalCoverType === 'Medical Insurance'}
                      onChange={() => set('medicalCoverType', 'Medical Insurance')}
                      className="accent-purple-600"
                    />
                    Medical Insurance
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name</label>
                  <input
                    type="text"
                    name="medicalAidName"
                    value={form.medicalAidName}
                    onChange={handleText}
                    placeholder="e.g. Discovery, Momentum"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan / Product</label>
                  <input
                    type="text"
                    name="medicalAidPlan"
                    value={form.medicalAidPlan}
                    onChange={handleText}
                    placeholder="e.g. KeyCare, Coastal Core"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Membership / Policy Number</label>
                <input
                  type="text"
                  name="medicalAidNumber"
                  value={form.medicalAidNumber}
                  onChange={handleText}
                  placeholder="Optional"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileUploadField
                  label="Medical Aid Card — Front"
                  hint="Take a photo of the front of the card"
                  accept="image/*"
                  capture="environment"
                  file={form.cardFront}
                  onChange={(f) => set('cardFront', f)}
                  preview
                />
                <FileUploadField
                  label="Medical Aid Card — Back"
                  hint="Take a photo of the back of the card"
                  accept="image/*"
                  capture="environment"
                  file={form.cardBack}
                  onChange={(f) => set('cardBack', f)}
                  preview
                />
              </div>
            </div>

            {/* ── Health & Medical Notes (always visible) ── */}
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Health Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                <input
                  type="text"
                  name="allergies"
                  value={form.allergies}
                  onChange={handleText}
                  placeholder="e.g. Peanuts, Penicillin, Bee stings — leave blank if none"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medical Requirements</label>
                <input
                  type="text"
                  name="medicalRequirements"
                  value={form.medicalRequirements}
                  onChange={handleText}
                  placeholder="e.g. Inhaler, EpiPen, insulin — leave blank if none"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Medical Notes</label>
                <textarea
                  name="medicalNotes"
                  value={form.medicalNotes}
                  onChange={(e) => set('medicalNotes', e.target.value)}
                  rows={3}
                  placeholder="Any other medical conditions, special care instructions, or notes for leaders…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>

            {form.noMedicalAid && (
              <p className="text-sm text-gray-400 italic text-center py-2">
                No medical aid — this section will be skipped.
              </p>
            )}
          </div>
        )}

        {/* ── Step 4: Payment (PayFast) ── */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Display approved children waiting for payment */}
            {approvedChildren.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-green-900 mb-3">✓ Registration Approved</h3>
                <p className="text-sm text-green-800 mb-4">
                  The following children&apos;s registrations have been approved. Complete payment below to finalize their enrollment and receive their Adventurer Codes.
                </p>
                <div className="space-y-2">
                  {approvedChildren.map((child) => (
                    <div key={child.id} className="flex items-center gap-2 text-sm text-green-800">
                      <span className="inline-block w-2 h-2 bg-green-600 rounded-full" />
                      <span className="font-medium">{child.name}</span>
                      <span className="text-green-600">({child.class})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-800">Payment Summary</h2>
              
              <div className="space-y-2 border-b border-gray-100 pb-4">
                {approvedChildren.map((child) => (
                  <div key={child.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{child.name}</span>
                    <span className="font-medium text-gray-900">R {registrationFee.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center bg-purple-50 rounded-lg p-3">
                <span className="font-semibold text-gray-800">Total Amount Due:</span>
                <span className="text-xl font-bold text-purple-600">
                  R {(approvedChildren.length * registrationFee).toFixed(2)}
                </span>
              </div>
            </div>

            {/* PayFast Payment Form (Placeholder) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-800">Complete Payment</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> PayFast integration is being configured. For now, you can proceed with test payment by clicking the button below.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setPaymentError(null);
                  setPaymentProcessing(true);
                  try {
                    // Simulate PayFast payment processing
                    // In production, this would redirect to PayFast iframe or page
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    // After successful payment, generate adventurer codes for each child
                    for (const child of approvedChildren) {
                      await fetch(`${base}/api/children/${child.id}/finalize-payment`, {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${token}` },
                      });
                    }

                    // Re-fetch children to get the assigned adventurer codes
                    const refreshed = await fetch(`${base}/api/children`, {
                      headers: { Authorization: `Bearer ${token}` },
                    }).then((r) => r.ok ? r.json() as Promise<ApiChild[]> : [] as ApiChild[]);
                    const paidChildren = refreshed.filter((c) => c.status === 'Paid' && c.adventurerCode);
                    if (paidChildren.length > 0) setApprovedChildren(paidChildren);

                    setSubmitted(true);
                  } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Payment processing failed. Please try again.';
                    setPaymentError(message);
                  } finally {
                    setPaymentProcessing(false);
                  }
                }}
                disabled={paymentProcessing || approvedChildren.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {paymentProcessing ? 'Processing Payment…' : 'Pay with PayFast →'}
              </button>

              {paymentError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">{paymentError}</p>
              )}
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex justify-between mt-6 gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={back}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
          ) : (
            <div className="flex-1" />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={next}
              className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#1e3a5f] text-white py-3 rounded-xl font-semibold hover:bg-[#2a4f7c] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit Registration'}
            </button>
          )}
        </div>
        {submitError && (
          <p className="text-sm text-red-500 text-center mt-3">{submitError}</p>
        )}
      </form>
    </div>
  );
}
