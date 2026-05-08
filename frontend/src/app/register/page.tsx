'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Step = 1 | 2 | 3;
type Role = 'Parent' | 'Teacher' | 'Donor';

const ROLE_CARDS: { role: Role; icon: string; title: string; subtitle: string }[] = [
  {
    role: 'Parent',
    icon: '👨‍👩‍👧',
    title: 'Parent / Guardian',
    subtitle: "Register and manage your child's adventurer journey",
  },
  {
    role: 'Teacher',
    icon: '🧑‍🏫',
    title: 'Teacher',
    subtitle: 'Join as a club teacher and manage your class',
  },
  {
    role: 'Donor',
    icon: '🤝',
    title: 'Donor',
    subtitle: 'Support the club with a donation',
  },
];

const STEP_LABELS = ['Credentials', 'Your Role', 'Your Details'];

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
  if (d.length !== 13) return { valid: false, reason: 'ID number must be exactly 13 digits.' };

  const dob = deriveDobFromId(d);
  if (!dob) return { valid: false, reason: 'Invalid date embedded in ID number.' };

  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const n = parseInt(d[i], 10);
    if (Number.isNaN(n)) return { valid: false, reason: 'Invalid ID number.' };

    if (i % 2 === 0) {
      sum += n;
    } else {
      const doubled = n * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  if (checkDigit !== parseInt(d[12], 10)) {
    return { valid: false, reason: 'ID number checksum failed.' };
  }

  return { valid: true };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read file.'));
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

function ProgressBar({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  done
                    ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                    : active
                    ? 'bg-white border-[#1e3a5f] text-[#1e3a5f]'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {done ? '✓' : n}
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? 'text-[#1e3a5f]' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`w-16 h-0.5 mx-1 mb-5 ${done ? 'bg-[#1e3a5f]' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [idNumber, setIdNumber] = useState('');

  const [noMedicalAid, setNoMedicalAid] = useState(false);
  const [medicalCoverType, setMedicalCoverType] = useState<'Medical Aid' | 'Medical Insurance'>('Medical Aid');
  const [medicalAidName, setMedicalAidName] = useState('');
  const [medicalAidPlan, setMedicalAidPlan] = useState('');
  const [medicalAidNumber, setMedicalAidNumber] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalRequirements, setMedicalRequirements] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [cardFrontFile, setCardFrontFile] = useState<File | null>(null);
  const [cardBackFile, setCardBackFile] = useState<File | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sanitizedId = useMemo(() => idNumber.replace(/\D/g, '').slice(0, 13), [idNumber]);
  const derivedDob = useMemo(() => deriveDobFromId(sanitizedId) || '', [sanitizedId]);
  const derivedGender = useMemo(() => deriveGender(sanitizedId) || '', [sanitizedId]);

  const submitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setStep(2);
  };

  const selectRole = (r: Role) => {
    setRole(r);
    setStep(3);
  };

  const submitStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!role) {
      setError('Please go back and select a role.');
      return;
    }

    if (role === 'Teacher') {
      const idValidation = validateSAID(sanitizedId);
      if (!idValidation.valid) {
        setError(idValidation.reason || 'Please enter a valid South African ID number.');
        return;
      }

      if (!derivedDob || !derivedGender) {
        setError('Date of birth and gender must be derived from a valid ID number.');
        return;
      }

      if (!noMedicalAid) {
        if (!medicalAidName.trim() || !medicalAidPlan.trim() || !medicalAidNumber.trim()) {
          setError('Medical provider name, plan, and member number are required for teachers.');
          return;
        }
        if (!cardFrontFile) {
          setError('Please upload the front image of the medical aid/insurance card.');
          return;
        }
      }
    }

    setLoading(true);
    try {
      const registerRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009'}/api/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email, password, role }),
        }
      );

      if (!registerRes.ok) {
        const body = await registerRes.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? 'Registration failed');
      }

      const registerData = await registerRes.json().catch(() => ({})) as { token?: string };

      if (role === 'Teacher' && registerData.token) {
        const cardFrontUrl = cardFrontFile ? await fileToDataUrl(cardFrontFile) : '';
        const cardBackUrl = cardBackFile ? await fileToDataUrl(cardBackFile) : '';

        const medicalAidInfo = noMedicalAid
          ? 'No medical aid'
          : [medicalCoverType, medicalAidName.trim(), medicalAidPlan.trim(), medicalAidNumber.trim()]
              .filter(Boolean)
              .join(' | ');

        const extraHealth = [
          allergies.trim() ? `Allergies: ${allergies.trim()}` : '',
          medicalRequirements.trim() ? `Requirements: ${medicalRequirements.trim()}` : '',
          medicalNotes.trim() ? `Notes: ${medicalNotes.trim()}` : '',
        ]
          .filter(Boolean)
          .join(' | ');

        const uploads: UploadDoc[] = [];
        if (cardFrontUrl) uploads.push({ label: 'Medical Card Front', url: cardFrontUrl });
        if (cardBackUrl) uploads.push({ label: 'Medical Card Back', url: cardBackUrl });

        const teacherRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009'}/api/teachers/me`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${registerData.token}`,
          },
          body: JSON.stringify({
            fullName: name.trim(),
            dateOfBirth: derivedDob,
            gender: derivedGender,
            documentType: 'ID',
            documentNumber: sanitizedId,
            phone: phone.trim() || null,
            address: null,
            emergencyContactName: null,
            emergencyContactPhone: null,
            photoUrl: null,
            medicalAidInfo: [medicalAidInfo, extraHealth].filter(Boolean).join(' || ') || null,
            uploadsJson: uploads.length > 0 ? JSON.stringify(uploads) : null,
            indemnitySignedByName: null,
            indemnitySignerRelationship: null,
            indemnitySignatureDataUrl: null,
          }),
        });

        if (!teacherRes.ok) {
          const text = await teacherRes.text();
          throw new Error(text || 'Teacher profile details could not be saved.');
        }
      }

      router.push('/login?registered=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2a5f8f] px-4 py-10">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Bassonia Adventurer Club" className="w-20 h-auto mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join Bassonia Adventurer Club</p>
        </div>

        <ProgressBar step={step} />

        {step === 1 && (
          <form onSubmit={submitStep1} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] pr-20"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-[#1e3a5f]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Use at least 8 characters with a mix of letters and numbers.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
            )}

            <button
              type="submit"
              className="w-full bg-[#1e3a5f] text-white py-2.5 rounded-lg font-semibold hover:bg-[#2a4f7c] transition-colors"
            >
              Next →
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center mb-2">Who are you registering as?</p>
            {ROLE_CARDS.map((card) => (
              <button
                key={card.role}
                type="button"
                onClick={() => selectRole(card.role)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#1e3a5f] hover:bg-[#f0f6ff] transition-all text-left group"
              >
                <span className="text-4xl">{card.icon}</span>
                <div>
                  <p className="font-semibold text-gray-800 group-hover:text-[#1e3a5f]">{card.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{card.subtitle}</p>
                </div>
                <span className="ml-auto text-gray-300 group-hover:text-[#1e3a5f] text-xl">›</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-sm text-gray-500 hover:text-[#1e3a5f] mt-2 underline"
            >
              ← Back
            </button>
          </div>
        )}

        {step === 3 && role && (
          <form onSubmit={submitStep3} className="space-y-5">
            <div className="flex items-center gap-2 bg-[#eef4fb] rounded-lg px-3 py-2 text-sm text-[#1e3a5f] font-medium">
              <span>{ROLE_CARDS.find((c) => c.role === role)?.icon}</span>
              <span>Registering as {ROLE_CARDS.find((c) => c.role === role)?.title}</span>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="ml-auto text-xs underline text-gray-500 hover:text-[#1e3a5f]"
              >
                Change
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                placeholder="e.g. John Smith"
              />
            </div>

            {(role === 'Parent' || role === 'Teacher') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  placeholder="e.g. 082 000 0000"
                />
              </div>
            )}

            {role === 'Parent' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship to Child <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-white"
                >
                  <option value="">Select relationship...</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            {role === 'Teacher' && (
              <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-700">Teacher Medical Registration</p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SA ID Number</label>
                  <input
                    type="text"
                    value={sanitizedId}
                    onChange={(e) => setIdNumber(e.target.value)}
                    maxLength={13}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                    placeholder="13-digit ID number"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date of Birth (auto)</label>
                    <input type="date" value={derivedDob} readOnly className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Gender (auto)</label>
                    <input type="text" value={derivedGender} readOnly className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600" />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={noMedicalAid}
                    onChange={(e) => {
                      setNoMedicalAid(e.target.checked);
                      if (e.target.checked) {
                        setMedicalAidName('');
                        setMedicalAidPlan('');
                        setMedicalAidNumber('');
                        setCardFrontFile(null);
                        setCardBackFile(null);
                      }
                    }}
                    className="accent-[#1e3a5f]"
                  />
                  I do not have medical aid/insurance
                </label>

                <div className={`space-y-4 transition-opacity ${noMedicalAid ? 'opacity-40 pointer-events-none' : ''}`}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cover Type</label>
                        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-300 px-3 py-2.5">
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="radio"
                              name="regMedicalCoverType"
                              value="Medical Aid"
                              checked={medicalCoverType === 'Medical Aid'}
                              onChange={() => setMedicalCoverType('Medical Aid')}
                              className="accent-[#1e3a5f]"
                            />
                            Medical Aid
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="radio"
                              name="regMedicalCoverType"
                              value="Medical Insurance"
                              checked={medicalCoverType === 'Medical Insurance'}
                              onChange={() => setMedicalCoverType('Medical Insurance')}
                              className="accent-[#1e3a5f]"
                            />
                            Medical Insurance
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name</label>
                          <input
                            type="text"
                            value={medicalAidName}
                            onChange={(e) => setMedicalAidName(e.target.value)}
                            placeholder="e.g. Discovery, Momentum"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Plan / Product</label>
                          <input
                            type="text"
                            value={medicalAidPlan}
                            onChange={(e) => setMedicalAidPlan(e.target.value)}
                            placeholder="e.g. KeyCare, Coastal Core"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Membership / Policy Number</label>
                        <input
                          type="text"
                          value={medicalAidNumber}
                          onChange={(e) => setMedicalAidNumber(e.target.value)}
                          placeholder="Optional"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Medical Aid Card — Front</label>
                          <p className="text-xs text-gray-400 mb-1">Take a photo of the front of the card</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setCardFrontFile(e.target.files?.[0] ?? null)}
                            className="w-full text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Medical Aid Card — Back</label>
                          <p className="text-xs text-gray-400 mb-1">Take a photo of the back of the card</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setCardBackFile(e.target.files?.[0] ?? null)}
                            className="w-full text-sm"
                          />
                        </div>
                      </div>
                    </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Health Information</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="e.g. Peanuts, Penicillin, Bee stings — leave blank if none"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical Requirements</label>
                    <input
                      type="text"
                      value={medicalRequirements}
                      onChange={(e) => setMedicalRequirements(e.target.value)}
                      placeholder="e.g. Inhaler, EpiPen, insulin — leave blank if none"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Medical Notes</label>
                    <textarea
                      rows={3}
                      value={medicalNotes}
                      onChange={(e) => setMedicalNotes(e.target.value)}
                      placeholder="Any other medical conditions, special care instructions, or notes for leaders…"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e3a5f] text-white py-2.5 rounded-lg font-semibold hover:bg-[#2a4f7c] transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

            <button
              type="button"
              onClick={() => { setStep(2); setError(''); }}
              className="w-full text-sm text-gray-500 hover:text-[#1e3a5f] underline"
            >
              ← Back
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#1e3a5f] font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
