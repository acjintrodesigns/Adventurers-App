'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ParentProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  relationship?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  photoUrl?: string;
  createdAt: string;
  secondaryGuardianJson?: string;
}

interface SecondaryGuardian {
  name: string;
  relationship: string;
  phone: string;
  altPhone?: string;
  email: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  idType?: string;
  idNumber?: string;
}

const RELATIONSHIP_OPTIONS = ['Mother', 'Father', 'Guardian', 'Grandparent', 'Other'];


export default function ParentDetailsPage() {
  const { token, user } = useAuth();
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009';

  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [secondaryGuardians, setSecondaryGuardians] = useState<SecondaryGuardian[]>([]);
  const [editingSecondary, setEditingSecondary] = useState<number | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    relationship: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    photoUrl: '',
  });

  const loadProfile = useCallback(async () => {
    if (!token) { setLoadingProfile(false); return; }

    if (token === 'mock-token') {
      const mockProfile: ParentProfile = {
        id: 1,
        name: user?.name ?? 'Demo Parent',
        email: user?.email ?? 'demo@example.com',
        role: 'Parent',
        createdAt: new Date().toISOString(),
      };
      setProfile(mockProfile);
      setForm({ name: mockProfile.name, phone: '', address: '', relationship: '', emergencyContactName: '', emergencyContactPhone: '', photoUrl: '' });
      setLoadingProfile(false);
      return;
    }

    try {
      const res = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load profile.');
      const data: ParentProfile = await res.json();
      setProfile(data);
      setForm({
        name: data.name ?? '',
        phone: data.phone ?? '',
        address: data.address ?? '',
        relationship: data.relationship ?? '',
        emergencyContactName: data.emergencyContactName ?? '',
        emergencyContactPhone: data.emergencyContactPhone ?? '',
        photoUrl: data.photoUrl ?? '',
      });
      if (data.photoUrl) setPhotoPreview(data.photoUrl);
      // Parse secondary guardians from JSON if present
      if (data.secondaryGuardianJson) {
        try {
          const secondary = JSON.parse(data.secondaryGuardianJson);
          setSecondaryGuardians(Array.isArray(secondary) ? secondary : []);
        } catch (e) {
          console.error('Failed to parse secondary guardians JSON:', data.secondaryGuardianJson, e);
          setSecondaryGuardians([]);
        }
      } else {
        setSecondaryGuardians([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load profile.');
    } finally {
      setLoadingProfile(false);
    }
  }, [token, base, user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Close photo menu on outside click
  useEffect(() => {
    if (!photoMenuOpen) return;
    const handler = () => setPhotoMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [photoMenuOpen]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const openCamera = useCallback(async () => {
    setCameraError('');
    setPhotoMenuOpen(false);
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
    setForm(f => ({ ...f, photoUrl: dataUrl }));
    stopCamera();
    setCameraOpen(false);
  }, [stopCamera]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) { setError('Name is required.'); return; }

    if (token === 'mock-token') {
      setSuccess('Profile saved (demo mode — changes not persisted to database).');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${base}/api/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          relationship: form.relationship || null,
          emergencyContactName: form.emergencyContactName.trim() || null,
          emergencyContactPhone: form.emergencyContactPhone.trim() || null,
          photoUrl: form.photoUrl || null,
          secondaryGuardianJson: secondaryGuardians.length > 0 ? JSON.stringify(secondaryGuardians) : null,
        }),
      });

      if (!res.ok) throw new Error((await res.text()) || 'Failed to save profile.');
      const updated: ParentProfile = await res.json();
      setProfile(updated);
      setSuccess('Your details have been saved successfully.');
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return <div className="p-6 max-w-3xl mx-auto"><div className="text-center py-20 text-gray-400 text-sm">Loading profile...</div></div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Parent / Guardian Details</h1>
          <p className="text-gray-500 text-sm mt-1">Keep your contact and emergency information up to date.</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => { setError(''); setSuccess(''); setEditing(true); }}
            className="flex items-center gap-2 bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Profile
          </button>
        )}
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Camera modal — outside fieldset so it always works */}
        {cameraOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4">
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-sm rounded-xl object-cover" />
            <div className="flex gap-4">
              <button type="button" onClick={capturePhoto} className="bg-white text-gray-800 font-semibold px-6 py-2.5 rounded-full text-sm shadow hover:bg-gray-100">
                📸 Capture
              </button>
              <button type="button" onClick={() => { stopCamera(); setCameraOpen(false); }} className="bg-gray-700 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-gray-600">
                Cancel
              </button>
            </div>
          </div>
        )}

        <fieldset disabled={!editing} className={!editing ? 'opacity-70 pointer-events-none select-none' : ''}>
        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Personal Information</h2>
              <p className="text-xs text-gray-400">
                Member since {profile ? new Date(profile.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          {/* Photo widget */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative w-28 h-28 mx-auto">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="w-28 h-28 object-cover rounded-full border-4 border-white shadow" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-[#1e3a5f] border-4 border-white shadow-inner flex items-center justify-center text-white font-bold text-4xl">
                  {form.name.charAt(0) || '?'}
                </div>
              )}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setPhotoMenuOpen(v => !v); }}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gray-500 text-white border-2 border-white shadow flex items-center justify-center text-xl font-semibold hover:bg-gray-600"
                aria-label="Photo options"
              >
                +
              </button>
              {photoMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                  <button type="button" onClick={e => { e.stopPropagation(); openCamera(); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50">
                    📷 Take Photo
                  </button>
                  <button type="button" onClick={e => { e.stopPropagation(); setPhotoMenuOpen(false); fileInputRef.current?.click(); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50">
                    📁 Upload Photo
                  </button>
                  {photoPreview && (
                    <button type="button" onClick={e => { e.stopPropagation(); setPhotoPreview(''); setForm(f => ({ ...f, photoUrl: '' })); setPhotoMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50">
                      Remove Photo
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3">{photoPreview ? 'Photo selected' : 'Tap + to add your profile photo'}</p>
            {cameraError && <p className="text-xs text-red-500 mt-1">{cameraError}</p>}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => { const dataUrl = reader.result as string; setPhotoPreview(dataUrl); setForm(f => ({ ...f, photoUrl: dataUrl })); };
            reader.readAsDataURL(file);
            setPhotoMenuOpen(false);
            e.target.value = '';
          }} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={profile?.email ?? ''}
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                placeholder="e.g. 082 000 0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship to Child</label>
              <select
                value={form.relationship}
                onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-white"
              >
                <option value="">— Select —</option>
                {RELATIONSHIP_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Home Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
                placeholder="Street address, suburb, city"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Emergency Contact</h2>
          <p className="text-xs text-gray-400 mb-4">Someone we can reach if you cannot be contacted during club activities or camps.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={form.emergencyContactName}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                placeholder="e.g. Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={form.emergencyContactPhone}
                onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                placeholder="e.g. 083 000 0000"
              />
            </div>
          </div>
        </div>

        {/* Secondary Guardians */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Secondary Guardians</h2>
          {secondaryGuardians.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4">No secondary guardians registered.</p>
          ) : (
            <div className="space-y-4">
              {secondaryGuardians.map((guardian, idx) => (
                <div key={idx} className={`border rounded-lg p-5 transition-colors ${editingSecondary === idx ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                  {editingSecondary === idx ? (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Secondary Guardian {idx + 1}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={guardian.name}
                            onChange={(e) => {
                              const updated = [...secondaryGuardians];
                              updated[idx].name = e.target.value;
                              setSecondaryGuardians(updated);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                          <select
                            value={guardian.relationship}
                            onChange={(e) => {
                              const updated = [...secondaryGuardians];
                              updated[idx].relationship = e.target.value;
                              setSecondaryGuardians(updated);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-white"
                          >
                            <option value="">— Select —</option>
                            {RELATIONSHIP_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                          <input
                            type="tel"
                            value={guardian.phone}
                            onChange={(e) => {
                              const updated = [...secondaryGuardians];
                              updated[idx].phone = e.target.value;
                              setSecondaryGuardians(updated);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Alternative Phone (Optional)</label>
                          <input
                            type="tel"
                            value={guardian.altPhone || ''}
                            onChange={(e) => {
                              const updated = [...secondaryGuardians];
                              updated[idx].altPhone = e.target.value;
                              setSecondaryGuardians(updated);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={guardian.email}
                            onChange={(e) => {
                              const updated = [...secondaryGuardians];
                              updated[idx].email = e.target.value;
                              setSecondaryGuardians(updated);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
                          <input
                            type="text"
                            value={guardian.emergencyContactName}
                            onChange={(e) => {
                              const updated = [...secondaryGuardians];
                              updated[idx].emergencyContactName = e.target.value;
                              setSecondaryGuardians(updated);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label>
                          <input
                            type="tel"
                            value={guardian.emergencyContactPhone}
                            onChange={(e) => {
                              const updated = [...secondaryGuardians];
                              updated[idx].emergencyContactPhone = e.target.value;
                              setSecondaryGuardians(updated);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Home Address</label>
                          <textarea
                            value={guardian.address}
                            onChange={(e) => {
                              const updated = [...secondaryGuardians];
                              updated[idx].address = e.target.value;
                              setSecondaryGuardians(updated);
                            }}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingSecondary(null)}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{guardian.name}</p>
                          <p className="text-xs text-gray-500">{guardian.relationship}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingSecondary(idx)}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs mt-3 pt-3 border-t border-gray-200">
                        <div><span className="text-gray-500">Phone:</span> <span className="text-gray-700">{guardian.phone}</span></div>
                        {guardian.altPhone && <div><span className="text-gray-500">Alt Phone:</span> <span className="text-gray-700">{guardian.altPhone}</span></div>}
                        <div><span className="text-gray-500">Email:</span> <span className="text-gray-700">{guardian.email}</span></div>
                        <div><span className="text-gray-500">Emergency:</span> <span className="text-gray-700">{guardian.emergencyContactName} ({guardian.emergencyContactPhone})</span></div>
                        <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="text-gray-700">{guardian.address}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        </fieldset>

        {editing && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setEditing(false); setError(''); setSuccess(''); loadProfile(); }}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1e3a5f] text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c] disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
