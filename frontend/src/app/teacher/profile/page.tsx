'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TeacherRegistrationProfile {
  id: number;
  userId: number;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  phone?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  photoUrl?: string | null;
  medicalAidInfo?: string | null;
  uploadsJson?: string | null;
  createdAt: string;
}

interface UploadDoc {
  label: string;
  url: string;
}

function deriveGender(idNumber: string): 'Male' | 'Female' | null {
  const digits = idNumber.replace(/\D/g, '');
  if (digits.length < 7) return null;
  const genderDigit = parseInt(digits[6], 10);
  return Number.isNaN(genderDigit) ? null : (genderDigit >= 5 ? 'Male' : 'Female');
}

function deriveDobFromId(idNumber: string): string | null {
  const d = idNumber.replace(/\D/g, '');
  if (d.length < 6) return null;

  const year = parseInt(d.substring(0, 2), 10);
  const month = parseInt(d.substring(2, 4), 10);
  const day = parseInt(d.substring(4, 6), 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const currentYY = new Date().getFullYear() % 100;
  const fullYear = year <= currentYY ? 2000 + year : 1900 + year;
  const candidate = new Date(fullYear, month - 1, day);
  if (candidate.getFullYear() !== fullYear || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return null;

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${fullYear}-${mm}-${dd}`;
}

function validateSAID(idNumber: string): { valid: boolean; reason?: string } {
  const d = idNumber.replace(/\D/g, '');
  if (d.length !== 13) return { valid: false, reason: 'Must be exactly 13 digits' };

  const derivedDob = deriveDobFromId(d);
  if (!derivedDob) return { valid: false, reason: 'Invalid date of birth in ID number' };

  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const n = parseInt(d[i], 10);
    if (Number.isNaN(n)) return { valid: false, reason: 'Invalid ID number' };

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

function toInputDate(dateValue?: string | null): string {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read image file.'));
    };
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

export default function TeacherProfilePage() {
  const { token, user } = useAuth();
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009';

  const [profile, setProfile] = useState<TeacherRegistrationProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [idValidationError, setIdValidationError] = useState('');

  const [photoPreview, setPhotoPreview] = useState('');
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cardFrontInputRef = useRef<HTMLInputElement>(null);
  const cardBackInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullName: '',
    idNumber: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    photoUrl: '',

    noMedicalAid: false,
    medicalCoverType: 'Medical Aid',
    medicalAidName: '',
    medicalAidPlan: '',
    medicalAidNumber: '',
    allergies: '',
    medicalRequirements: '',
    medicalNotes: '',
    cardFrontUrl: '',
    cardBackUrl: '',
  });

  const syncDerivedFieldsFromId = useCallback((idNumber: string) => {
    const digits = idNumber.replace(/\D/g, '').slice(0, 13);

    if (digits.length === 13) {
      const validation = validateSAID(digits);
      if (!validation.valid) {
        setIdValidationError(validation.reason || 'Invalid ID number');
        setForm((prev) => ({ ...prev, idNumber: digits, dateOfBirth: '', gender: '' }));
        return;
      }

      setIdValidationError('');
      const derivedDob = deriveDobFromId(digits) || '';
      const derivedGender = deriveGender(digits) || '';
      setForm((prev) => ({
        ...prev,
        idNumber: digits,
        dateOfBirth: derivedDob,
        gender: derivedGender,
      }));
      return;
    }

    setIdValidationError(digits.length === 0 ? '' : 'ID number must be 13 digits');
    setForm((prev) => ({ ...prev, idNumber: digits, dateOfBirth: '', gender: '' }));
  }, []);

  const parseMedicalInfo = useCallback((medicalAidInfo?: string | null, uploadsJson?: string | null) => {
    const next = {
      noMedicalAid: false,
      medicalCoverType: 'Medical Aid',
      medicalAidName: '',
      medicalAidPlan: '',
      medicalAidNumber: '',
      allergies: '',
      medicalRequirements: '',
      medicalNotes: '',
      cardFrontUrl: '',
      cardBackUrl: '',
    };

    const info = (medicalAidInfo || '').trim();

    if (info.toLowerCase() === 'no medical aid') {
      next.noMedicalAid = true;
    } else {
      const [leftPart, rightPart] = info.split('||').map((part) => part.trim());
      const pieces = (leftPart || '').split('|').map((v) => v.trim()).filter(Boolean);

      if (pieces.length > 0 && (pieces[0] === 'Medical Aid' || pieces[0] === 'Medical Insurance')) {
        next.medicalCoverType = pieces[0];
      }
      next.medicalAidName = pieces[1] || '';
      next.medicalAidPlan = pieces[2] || '';
      next.medicalAidNumber = pieces[3] || '';

      const extra = (rightPart || '').split('|').map((v) => v.trim());
      for (const part of extra) {
        if (part.startsWith('Allergies:')) next.allergies = part.replace('Allergies:', '').trim();
        if (part.startsWith('Requirements:')) next.medicalRequirements = part.replace('Requirements:', '').trim();
        if (part.startsWith('Notes:')) next.medicalNotes = part.replace('Notes:', '').trim();
      }
    }

    if (uploadsJson) {
      try {
        const docs = JSON.parse(uploadsJson) as UploadDoc[];
        if (Array.isArray(docs)) {
          for (const doc of docs) {
            const label = (doc.label || '').toLowerCase();
            if (label.includes('medical card front')) next.cardFrontUrl = doc.url || '';
            if (label.includes('medical card back')) next.cardBackUrl = doc.url || '';
          }
        }
      } catch {
        // ignore invalid uploads JSON
      }
    }

    return next;
  }, []);

  const loadProfile = useCallback(async () => {
    if (!token) {
      setLoadingProfile(false);
      return;
    }

    if (token === 'mock-token') {
      setProfile(null);
      setForm((prev) => ({ ...prev, fullName: user?.name ?? 'Demo Teacher' }));
      setLoadingProfile(false);
      return;
    }

    try {
      const res = await fetch(`${base}/api/teachers/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 404) {
        setProfile(null);
        setForm((prev) => ({ ...prev, fullName: user?.name ?? prev.fullName }));
        setLoadingProfile(false);
        return;
      }

      if (!res.ok) throw new Error('Failed to load teacher profile.');

      const data: TeacherRegistrationProfile = await res.json();
      setProfile(data);

      const medical = parseMedicalInfo(data.medicalAidInfo, data.uploadsJson);
      const existingId = (data.documentNumber ?? '').replace(/\D/g, '').slice(0, 13);

      setForm({
        fullName: data.fullName ?? user?.name ?? '',
        idNumber: existingId,
        dateOfBirth: toInputDate(data.dateOfBirth),
        gender: data.gender ?? '',
        phone: data.phone ?? '',
        address: data.address ?? '',
        emergencyContactName: data.emergencyContactName ?? '',
        emergencyContactPhone: data.emergencyContactPhone ?? '',
        photoUrl: data.photoUrl ?? '',
        ...medical,
      });
      setPhotoPreview(data.photoUrl ?? '');

      if (existingId) {
        syncDerivedFieldsFromId(existingId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load teacher profile.');
    } finally {
      setLoadingProfile(false);
    }
  }, [base, parseMedicalInfo, syncDerivedFieldsFromId, token, user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!photoMenuOpen) return;
    const handler = () => setPhotoMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [photoMenuOpen]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const openCamera = useCallback(async () => {
    setCameraError('');
    setPhotoMenuOpen(false);
    setCameraOpen(true);

    try {
      let stream: MediaStream;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MEDIA_DEVICES_UNAVAILABLE');
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      const cameraException = err as DOMException | Error;
      let message = 'Camera unavailable. Use upload instead.';

      if (cameraException instanceof DOMException) {
        if (cameraException.name === 'NotAllowedError') {
          message = 'Camera permission was blocked. Allow camera access in your browser.';
        } else if (cameraException.name === 'NotReadableError') {
          message = 'Camera is currently in use by another application.';
        } else if (cameraException.name === 'NotFoundError') {
          message = 'No camera device was found on this computer.';
        }
      } else if (cameraException.message === 'MEDIA_DEVICES_UNAVAILABLE') {
        message = 'This browser session cannot access camera APIs here. Use upload instead.';
       }

      setCameraError(message);
      setCameraOpen(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPhotoPreview(dataUrl);
    setForm((prev) => ({ ...prev, photoUrl: dataUrl }));
    setPhotoMenuOpen(false);
    stopCamera();
    setCameraOpen(false);
  }, [stopCamera]);

  const onCardSelected = useCallback(async (which: 'front' | 'back', files: FileList | null) => {
    const selected = files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setError('Please select an image file for the medical card.');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(selected);
      if (which === 'front') setForm((prev) => ({ ...prev, cardFrontUrl: dataUrl }));
      if (which === 'back') setForm((prev) => ({ ...prev, cardBackUrl: dataUrl }));
    } catch {
      setError('Could not load selected medical card image.');
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    const idValidation = validateSAID(form.idNumber);
    if (!idValidation.valid) {
      setError(idValidation.reason || 'Please enter a valid South African ID number.');
      return;
    }

    if (!form.dateOfBirth || !form.gender) {
      setError('Date of birth and gender must be derived from a valid ID number.');
      return;
    }

    if (!form.noMedicalAid) {
      if (!form.medicalAidName.trim() || !form.medicalAidPlan.trim() || !form.medicalAidNumber.trim()) {
        setError('Medical aid/insurance name, plan, and number are required unless No medical aid is selected.');
        return;
      }
      if (!form.cardFrontUrl) {
        setError('Please upload the front image of the medical aid/insurance card.');
        return;
      }
    }

    if (token === 'mock-token') {
      setSuccess('Profile saved (demo mode - no database update).');
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const medicalAidInfo = form.noMedicalAid
        ? 'No medical aid'
        : [form.medicalCoverType, form.medicalAidName.trim(), form.medicalAidPlan.trim(), form.medicalAidNumber.trim()]
            .filter(Boolean)
            .join(' | ');

      const extraHealth = [
        form.allergies.trim() ? `Allergies: ${form.allergies.trim()}` : '',
        form.medicalRequirements.trim() ? `Requirements: ${form.medicalRequirements.trim()}` : '',
        form.medicalNotes.trim() ? `Notes: ${form.medicalNotes.trim()}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const uploads: UploadDoc[] = [];
      if (form.cardFrontUrl) uploads.push({ label: 'Medical Card Front', url: form.cardFrontUrl });
      if (form.cardBackUrl) uploads.push({ label: 'Medical Card Back', url: form.cardBackUrl });

      const res = await fetch(`${base}/api/teachers/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          documentType: 'ID',
          documentNumber: form.idNumber,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          emergencyContactName: form.emergencyContactName.trim() || null,
          emergencyContactPhone: form.emergencyContactPhone.trim() || null,
          photoUrl: form.photoUrl || null,
          medicalAidInfo: [medicalAidInfo, extraHealth].filter(Boolean).join(' || ') || null,
          uploadsJson: uploads.length > 0 ? JSON.stringify(uploads) : null,
          indemnitySignedByName: null,
          indemnitySignerRelationship: null,
          indemnitySignatureDataUrl: null,
        }),
      });

      if (!res.ok) throw new Error((await res.text()) || 'Failed to save teacher profile.');
      const updated: TeacherRegistrationProfile = await res.json();
      setProfile(updated);
      setSuccess('Teacher profile updated successfully.');
      setEditing(false);
      setIdValidationError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save teacher profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="text-center py-20 text-gray-400 text-sm">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Teacher Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Complete your personal, medical, and emergency details.</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setError('');
              setSuccess('');
              setEditing(true);
            }}
            className="flex items-center gap-2 bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]"
          >
            Edit Profile
          </button>
        )}
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      <form onSubmit={handleSave} className="space-y-6">
        {cameraOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4">
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-sm rounded-xl object-cover" />
            <div className="flex gap-4">
              <button type="button" onClick={capturePhoto} className="bg-white text-gray-800 font-semibold px-6 py-2.5 rounded-full text-sm shadow hover:bg-gray-100">
                Capture
              </button>
              <button type="button" onClick={() => { stopCamera(); setCameraOpen(false); }} className="bg-gray-700 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-gray-600">
                Cancel
              </button>
            </div>
          </div>
        )}

        <fieldset disabled={!editing} className={!editing ? 'opacity-70 pointer-events-none select-none' : ''}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Personal Information</h2>
                <p className="text-xs text-gray-400">
                  Member since {profile ? new Date(profile.createdAt).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center mb-4">
              <div className="relative w-28 h-28 mx-auto">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-28 h-28 object-cover rounded-full border-4 border-white shadow" />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-[#1e3a5f] border-4 border-white shadow-inner flex items-center justify-center text-white font-bold text-4xl">
                    {form.fullName.charAt(0) || '?'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoMenuOpen((open) => !open);
                  }}
                  className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gray-500 text-white border-2 border-white shadow flex items-center justify-center text-xl font-semibold hover:bg-gray-600"
                  aria-label="Photo options"
                >
                  +
                </button>
                {photoMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                    <button type="button" onClick={(e) => { e.stopPropagation(); void openCamera(); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50">
                      Take Photo
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setPhotoMenuOpen(false); fileInputRef.current?.click(); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50">
                      Upload Photo
                    </button>
                    {photoPreview && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPhotoPreview(''); setForm((prev) => ({ ...prev, photoUrl: '' })); setPhotoMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50">
                        Remove Photo
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">{photoPreview ? 'Photo selected' : 'Tap + to add your profile photo'}</p>
              {cameraError && <p className="text-xs text-red-500 mt-1">{cameraError}</p>}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  setPhotoPreview(dataUrl);
                  setForm((prev) => ({ ...prev, photoUrl: dataUrl }));
                };
                reader.readAsDataURL(file);
                setPhotoMenuOpen(false);
                e.target.value = '';
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">ID Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  value={form.idNumber}
                  onChange={(e) => syncDerivedFieldsFromId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  placeholder="13-digit South African ID"
                />
                {idValidationError && <p className="text-xs text-red-500 mt-1">{idValidationError}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Date of Birth (auto from ID)</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Gender (auto from ID)</label>
                <input
                  type="text"
                  value={form.gender}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1 font-medium">Address</label>
                <textarea
                  rows={3}
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
            <div className="flex items-start justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-800">Medical Cover Information</h2>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.noMedicalAid}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    noMedicalAid: e.target.checked,
                    medicalAidName: e.target.checked ? '' : prev.medicalAidName,
                    medicalAidPlan: e.target.checked ? '' : prev.medicalAidPlan,
                    medicalAidNumber: e.target.checked ? '' : prev.medicalAidNumber,
                    cardFrontUrl: e.target.checked ? '' : prev.cardFrontUrl,
                    cardBackUrl: e.target.checked ? '' : prev.cardBackUrl,
                  }))}
                  className="w-4 h-4 accent-[#1e3a5f]"
                />
                <span className="text-sm text-gray-500">No medical aid</span>
              </label>
            </div>

            <div className={`space-y-4 transition-opacity ${form.noMedicalAid ? 'opacity-40 pointer-events-none' : ''}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cover Type</label>
                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-300 px-3 py-2.5">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="teacherMedicalCoverType"
                      value="Medical Aid"
                      checked={form.medicalCoverType === 'Medical Aid'}
                      onChange={() => setForm((prev) => ({ ...prev, medicalCoverType: 'Medical Aid' }))}
                      className="accent-[#1e3a5f]"
                    />
                    Medical Aid
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="teacherMedicalCoverType"
                      value="Medical Insurance"
                      checked={form.medicalCoverType === 'Medical Insurance'}
                      onChange={() => setForm((prev) => ({ ...prev, medicalCoverType: 'Medical Insurance' }))}
                      className="accent-[#1e3a5f]"
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
                    value={form.medicalAidName}
                    onChange={(e) => setForm((prev) => ({ ...prev, medicalAidName: e.target.value }))}
                    placeholder="e.g. Discovery, Momentum"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan / Product</label>
                  <input
                    type="text"
                    value={form.medicalAidPlan}
                    onChange={(e) => setForm((prev) => ({ ...prev, medicalAidPlan: e.target.value }))}
                    placeholder="e.g. KeyCare, Coastal Core"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Membership / Policy Number</label>
                <input
                  type="text"
                  value={form.medicalAidNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, medicalAidNumber: e.target.value }))}
                  placeholder="Optional"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-2">Medical Aid Card — Front</p>
                  <p className="text-xs text-gray-400 mb-2">Take a photo or upload the front of the card</p>
                  {form.cardFrontUrl ? (
                    <img src={form.cardFrontUrl} alt="Medical card front" className="h-28 w-full object-contain rounded border border-gray-200 bg-white mb-2" />
                  ) : (
                    <div className="h-28 w-full rounded border border-dashed border-gray-300 bg-white flex items-center justify-center text-xs text-gray-400 mb-2">
                      No image
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => cardFrontInputRef.current?.click()} className="text-xs px-3 py-1.5 rounded bg-[#1e3a5f] text-white hover:bg-[#2a4f7c]">
                      Upload
                    </button>
                    {form.cardFrontUrl && (
                      <button type="button" onClick={() => setForm((prev) => ({ ...prev, cardFrontUrl: '' }))} className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50">
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-2">Medical Aid Card — Back</p>
                  <p className="text-xs text-gray-400 mb-2">Take a photo or upload the back of the card</p>
                  {form.cardBackUrl ? (
                    <img src={form.cardBackUrl} alt="Medical card back" className="h-28 w-full object-contain rounded border border-gray-200 bg-white mb-2" />
                  ) : (
                    <div className="h-28 w-full rounded border border-dashed border-gray-300 bg-white flex items-center justify-center text-xs text-gray-400 mb-2">
                      No image
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => cardBackInputRef.current?.click()} className="text-xs px-3 py-1.5 rounded bg-[#1e3a5f] text-white hover:bg-[#2a4f7c]">
                      Upload
                    </button>
                    {form.cardBackUrl && (
                      <button type="button" onClick={() => setForm((prev) => ({ ...prev, cardBackUrl: '' }))} className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <input
                ref={cardFrontInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { void onCardSelected('front', e.target.files); e.target.value = ''; }}
              />
              <input
                ref={cardBackInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { void onCardSelected('back', e.target.files); e.target.value = ''; }}
              />
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700">Health Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                <input
                  type="text"
                  value={form.allergies}
                  onChange={(e) => setForm((prev) => ({ ...prev, allergies: e.target.value }))}
                  placeholder="e.g. Peanuts, Penicillin, Bee stings — leave blank if none"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medical Requirements</label>
                <input
                  type="text"
                  value={form.medicalRequirements}
                  onChange={(e) => setForm((prev) => ({ ...prev, medicalRequirements: e.target.value }))}
                  placeholder="e.g. Inhaler, EpiPen, insulin — leave blank if none"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Medical Notes</label>
                <textarea
                  rows={3}
                  value={form.medicalNotes}
                  onChange={(e) => setForm((prev) => ({ ...prev, medicalNotes: e.target.value }))}
                  placeholder="Any other medical conditions, special care instructions, or notes for leaders…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
            <h2 className="text-base font-semibold text-gray-800 mb-5">Emergency Contact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Contact Name</label>
                <input
                  type="text"
                  value={form.emergencyContactName}
                  onChange={(e) => setForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Contact Phone</label>
                <input
                  type="text"
                  value={form.emergencyContactPhone}
                  onChange={(e) => setForm((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
            </div>
          </div>
        </fieldset>

        {editing && (
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError('');
                setSuccess('');
                setIdValidationError('');
                void loadProfile();
              }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#2a4f7c] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
