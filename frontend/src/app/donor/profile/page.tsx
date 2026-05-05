'use client';

import { useState, useEffect, useRef, useCallback, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DonorProfile {
  displayName: string;
  phone: string;
  idType: 'id' | 'passport';
  idNumber: string;
  dob: string;
  gender: '' | 'Male' | 'Female';
  address: string;
  city: string;
  province: string;
  postalCode: string;
  photoDataUrl: string;
}

const defaultProfile: DonorProfile = {
  displayName: '',
  phone: '',
  idType: 'id',
  idNumber: '',
  dob: '',
  gender: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  photoDataUrl: '',
};

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
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${fullYear}-${mm}-${dd}`;
}

function validateSAID(idNumber: string): { valid: boolean; reason?: string } {
  const d = idNumber.replace(/\D/g, '');
  if (d.length !== 13) return { valid: false, reason: 'Must be exactly 13 digits' };

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

export default function DonorProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DonorProfile>(defaultProfile);
  const [saved, setSaved] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  // Photo menu + camera state
  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const storageKey = `donor-profile:${user?.id ?? 'guest'}`;

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed: DonorProfile = JSON.parse(raw);
        setProfile({ ...defaultProfile, ...parsed });
        if (parsed.photoDataUrl) setPhotoPreview(parsed.photoDataUrl);
      } catch {
        // ignore corrupt data
      }
    } else {
      setProfile(prev => ({ ...prev, displayName: user.name ?? '' }));
    }
  }, [user, storageKey]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  useEffect(() => {
    if (profile.idType !== 'id') return;

    const normalized = profile.idNumber.replace(/\D/g, '');
    if (normalized !== profile.idNumber) {
      setProfile(prev => ({ ...prev, idNumber: normalized }));
      return;
    }

    if (normalized.length === 13 && validateSAID(normalized).valid) {
      const dob = deriveDobFromId(normalized) ?? '';
      const gender = deriveGender(normalized) ?? '';
      setProfile(prev => ({ ...prev, dob, gender }));
    }
  }, [profile.idNumber, profile.idType]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const openCamera = useCallback(async () => {
    setCameraError('');
    setMenuOpen(false);
    setCameraOpen(true);
    try {
      let stream: MediaStream;
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
      const e = err as DOMException | Error;
      let message = 'Camera unavailable. Use Upload Photo instead.';
      if (e instanceof DOMException) {
        if (e.name === 'NotAllowedError') message = 'Camera permission was blocked. Allow camera access in your browser.';
        else if (e.name === 'NotReadableError') message = 'Camera is busy in another app.';
        else if (e.name === 'NotFoundError') message = 'No camera found on this device.';
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
    setProfile(prev => ({ ...prev, photoDataUrl: dataUrl }));
    stopCamera();
    setCameraOpen(false);
  }, [stopCamera]);

  function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);
      setProfile(prev => ({ ...prev, photoDataUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
    setMenuOpen(false);
    // reset so same file can be re-selected
    e.target.value = '';
  }

  function removePhoto() {
    setPhotoPreview('');
    setProfile(prev => ({ ...prev, photoDataUrl: '' }));
    setMenuOpen(false);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setProfile(prev => {
      if (name === 'idType') {
        if (value === 'passport') {
          return { ...prev, idType: 'passport', idNumber: '', gender: '', dob: '' };
        }
        return { ...prev, idType: 'id', idNumber: '', gender: '', dob: '' };
      }

      if (name === 'idNumber' && prev.idType === 'id') {
        const normalized = value.replace(/\D/g, '').slice(0, 13);
        const idCheck = validateSAID(normalized);
        if (normalized.length === 13 && idCheck.valid) {
          return {
            ...prev,
            idNumber: normalized,
            dob: deriveDobFromId(normalized) ?? prev.dob,
            gender: deriveGender(normalized) ?? prev.gender,
          };
        }
        return { ...prev, idNumber: normalized };
      }

      return { ...prev, [name]: value };
    });
    setSaved(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    localStorage.setItem(storageKey, JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const SA_PROVINCES = [
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
    'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape',
  ];

  const idCheck = profile.idType === 'id' ? validateSAID(profile.idNumber) : { valid: false };
  const isIdLocked = profile.idType === 'id' && profile.idNumber.length === 13 && idCheck.valid;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 font-lyla">My Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile photo — matches kids registration style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center gap-3">
          <div className="rounded-xl p-4 text-center bg-gray-50 border border-gray-200 w-full flex flex-col items-center">
            <div className="relative w-28 h-28 mx-auto">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="w-28 h-28 object-cover rounded-full border-4 border-white shadow" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gray-300 border-4 border-white shadow-inner" />
              )}

              <button
                type="button"
                onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gray-500 text-white border-2 border-white shadow flex items-center justify-center text-xl font-semibold hover:bg-gray-600"
                aria-label="Photo options"
              >
                +
              </button>

              {menuOpen && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); openCamera(); }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-purple-50"
                  >
                    Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setMenuOpen(false); fileInputRef.current?.click(); }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-purple-50"
                  >
                    Upload Photo
                  </button>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removePhoto(); }}
                      className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-3">
              {photoPreview ? 'Photo selected' : 'Tap + to add your profile photo'}
            </p>

            {cameraError && (
              <div className="mt-2">
                <p className="text-xs text-red-500">{cameraError}</p>
                <button type="button" onClick={openCamera} className="mt-2 text-xs font-semibold text-purple-600 hover:underline">
                  Try Camera Again
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {/* Camera modal */}
        {cameraOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-sm rounded-xl object-cover"
            />
            <div className="flex gap-4">
              <button
                type="button"
                onClick={capturePhoto}
                className="bg-white text-gray-800 font-semibold px-6 py-2.5 rounded-full text-sm shadow hover:bg-gray-100"
              >
                📸 Capture
              </button>
              <button
                type="button"
                onClick={() => { stopCamera(); setCameraOpen(false); }}
                className="bg-gray-700 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Personal details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Personal Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
            <input
              type="text"
              name="displayName"
              value={profile.displayName}
              onChange={handleChange}
              placeholder="Your full name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email is linked to your account and cannot be changed here.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
              placeholder="e.g. 071 234 5678"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* ID / Passport */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Identification Type</label>
            <div className="flex gap-6 mb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="idType"
                  value="id"
                  checked={profile.idType === 'id'}
                  onChange={handleChange}
                  className="accent-indigo-600"
                />
                South African ID
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="idType"
                  value="passport"
                  checked={profile.idType === 'passport'}
                  onChange={handleChange}
                  className="accent-indigo-600"
                />
                Passport
              </label>
            </div>
            <input
              type="text"
              name="idNumber"
              value={profile.idNumber}
              onChange={handleChange}
              placeholder={profile.idType === 'id' ? 'SA ID Number (13 digits)' : 'Passport Number'}
              maxLength={profile.idType === 'id' ? 13 : 20}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {profile.idType === 'id' && profile.idNumber.length === 13 && !idCheck.valid && (
              <p className="text-xs text-red-500 mt-1">{idCheck.reason ?? 'Invalid ID number'}</p>
            )}
            {isIdLocked && (
              <p className="text-xs text-green-600 mt-1">✓ Valid South African ID number</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Date of Birth</label>
              <div className="relative">
                <input
                  type="date"
                  name="dob"
                  value={profile.dob}
                  onChange={handleChange}
                  readOnly={isIdLocked}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                    isIdLocked ? 'bg-gray-50 border-indigo-200 text-gray-600 cursor-default' : 'border-gray-200'
                  }`}
                />
                {isIdLocked && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-500 italic">auto</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Gender</label>
              <input
                type="text"
                name="gender"
                value={profile.gender}
                onChange={handleChange}
                readOnly={isIdLocked}
                placeholder={profile.idType === 'id' ? 'Determined from ID number' : 'Enter gender'}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                  isIdLocked ? 'bg-gray-50 border-indigo-200 text-gray-600 cursor-default' : 'border-gray-200'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Address</h2>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Street Address</label>
            <input
              type="text"
              name="address"
              value={profile.address}
              onChange={handleChange}
              placeholder="e.g. 12 Oak Street"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">City / Town</label>
              <input
                type="text"
                name="city"
                value={profile.city}
                onChange={handleChange}
                placeholder="e.g. Johannesburg"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Postal Code</label>
              <input
                type="text"
                name="postalCode"
                value={profile.postalCode}
                onChange={handleChange}
                placeholder="e.g. 2090"
                maxLength={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Province</label>
            <select
              name="province"
              value={profile.province}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="">Select province</option>
              {SA_PROVINCES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition"
          >
            Save Profile
          </button>
          {saved && (
            <span className="text-green-600 text-sm font-medium">✓ Profile saved!</span>
          )}
        </div>
      </form>
    </div>
  );
}
