'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiChild, DemeritRecordSummary } from '@/lib/compliance';

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  status: 'Verified' | 'Pending' | 'Missing';
  icon: string;
  detail: string;
}

interface SecondaryGuardianItem {
  name?: string;
  relationship?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
};

const docStatusColors: Record<string, string> = {
  Verified: 'bg-green-100 text-green-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Missing: 'bg-red-100 text-red-700',
};

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read selected image.'));
    reader.readAsDataURL(file);
  });
}

function parseMedicalInfo(raw: string | null | undefined) {
  if (!raw) return null;
  const [coverPart, healthPart] = raw.split(' || ');
  const coverFields = coverPart ? coverPart.split(' | ').map(s => s.trim()).filter(Boolean) : [];
  const [coverType, ...rest] = coverFields;
  const [name, plan, number] = rest;
  const allergies = healthPart?.match(/Allergies:\s*([^|]+)/)?.[1]?.trim();
  const requirements = healthPart?.match(/Requirements:\s*(.+)/)?.[1]?.trim();
  return { coverType, name, plan, number, allergies, requirements };
}

function calcAge(dob: string) {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function parseSecondaryGuardians(raw: string | null | undefined): SecondaryGuardianItem[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is SecondaryGuardianItem => !!item && typeof item === 'object');
    }

    if (parsed && typeof parsed === 'object') {
      return [parsed as SecondaryGuardianItem];
    }
  } catch {
    return [];
  }

  return [];
}

export default function ChildProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { role } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [child, setChild] = useState<ApiChild | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState<'profile' | 'full' | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [demeritError, setDemeritError] = useState<string | null>(null);
  const [demeritSaving, setDemeritSaving] = useState(false);
  const [demeritForm, setDemeritForm] = useState({ reason: '', consequence: '', remedy: '' });

  const loadChild = useCallback(async () => {
    if (!id) {
      setError('Invalid child ID.');
      setLoading(false);
      return;
    }

    const childId = Number(id);
    if (!Number.isInteger(childId) || childId <= 0) {
      setError('Invalid child ID.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/children/${childId}`) as ApiChild | null;
      if (!data || typeof data !== 'object' || typeof data.id !== 'number') {
        throw new Error('Child not found. Please go back and select a learner again.');
      }
      setChild(data);
      setPhotoPreviewUrl(data.photoUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load child profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadChild();
  }, [loadChild]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const history = child?.demeritHistory ?? [];
  const pendingDemerits = history.filter((record) => record.status === 'PendingApproval');

  const submitDemerit = async () => {
    if (!id) return;
    if (!demeritForm.reason.trim() || !demeritForm.consequence.trim() || !demeritForm.remedy.trim()) {
      setDemeritError('Reason, consequence, and remedy are required.');
      return;
    }

    try {
      setDemeritSaving(true);
      setDemeritError(null);
      await apiFetch(`/api/children/${id}/demerits`, {
        method: 'POST',
        body: JSON.stringify(demeritForm),
      });
      setDemeritForm({ reason: '', consequence: '', remedy: '' });
      await loadChild();
    } catch (err) {
      setDemeritError(err instanceof Error ? err.message : 'Failed to submit demerit');
    } finally {
      setDemeritSaving(false);
    }
  };

  const runDemeritAction = async (record: DemeritRecordSummary, action: string) => {
    try {
      setDemeritSaving(true);
      setDemeritError(null);

      let payload: Record<string, string | null> = {};
      if (action === 'approve') {
        const consequence = window.prompt('Final consequence', record.consequence) ?? record.consequence;
        const remedy = window.prompt('Final remedy', record.remedy) ?? record.remedy;
        payload = { consequence, remedy, note: null };
      } else {
        const note = window.prompt('Add a note (optional)', '') ?? '';
        payload = { note };
      }

      await apiFetch(`/api/demerits/${record.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await loadChild();
    } catch (err) {
      setDemeritError(err instanceof Error ? err.message : 'Failed to update demerit');
    } finally {
      setDemeritSaving(false);
    }
  };

  const requestDemeritAction = async (record: DemeritRecordSummary, action: 'request-stop' | 'request-delete') => {
    try {
      setDemeritSaving(true);
      setDemeritError(null);
      const reason = window.prompt('Reason for this request', '') ?? '';
      await apiFetch(`/api/demerits/${record.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      await loadChild();
    } catch (err) {
      setDemeritError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setDemeritSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-400">Loading child profile...</div>;
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center text-red-500 mt-20">
        <p className="text-lg font-semibold">{error}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-[#1e3a5f] underline">
          Go back
        </button>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center text-gray-400 mt-20">
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-lg font-semibold text-gray-600">Child not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-[#1e3a5f] underline">
          Go back
        </button>
      </div>
    );
  }

  const medicalInfo = parseMedicalInfo(child.medicalAidInfo);
  const isApprovedOrPaid = child.status === 'Approved' || child.status === 'Paid';
  const documents: DocumentItem[] = [
    {
      id: 'birth-cert',
      name: 'Birth Certificate',
      type: 'PDF',
      icon: '📄',
      status: isApprovedOrPaid ? 'Verified' : 'Pending',
      detail: isApprovedOrPaid
        ? `Verified on approval${child.createdAt ? ` · Registered ${formatDate(child.createdAt)}` : ''}`
        : 'Awaiting director verification',
    },
    {
      id: 'identity',
      name: `SA ${child.documentType ?? 'ID'} / ${child.documentType === 'Passport' ? 'Passport' : 'ID'} Copy`,
      type: 'PDF',
      icon: '🪪',
      status: child.documentNumber?.trim() ? 'Verified' : 'Missing',
      detail: child.documentNumber?.trim()
        ? `${child.documentType ?? 'ID'} No. ${child.documentNumber}`
        : 'No document number on file',
    },
    {
      id: 'medical-card',
      name: 'Medical Aid Card',
      type: 'Image',
      icon: '💳',
      status: medicalInfo?.name ? 'Verified' : (medicalInfo ? 'Pending' : 'Missing'),
      detail: medicalInfo?.name
        ? [medicalInfo.name, medicalInfo.plan, medicalInfo.number].filter(Boolean).join(' · ')
        : medicalInfo
        ? 'Medical cover type recorded'
        : 'No medical aid information provided',
    },
    {
      id: 'allergy',
      name: 'Allergy / Medical Form',
      type: 'PDF',
      icon: '🏥',
      status: (medicalInfo?.allergies || medicalInfo?.requirements) ? 'Verified' : (medicalInfo ? 'Pending' : 'Missing'),
      detail: medicalInfo?.allergies
        ? `Allergies: ${medicalInfo.allergies}`
        : medicalInfo?.requirements
        ? `Requirements: ${medicalInfo.requirements}`
        : 'No allergy or medical requirements recorded',
    },
    {
      id: 'consent',
      name: 'Parent Consent Form',
      type: 'PDF',
      icon: '✍️',
      status: isApprovedOrPaid ? 'Verified' : 'Missing',
      detail: isApprovedOrPaid ? 'Consent confirmed on approval' : 'Not yet submitted',
    },
    {
      id: 'photo',
      name: 'Photo (Passport Size)',
      type: 'Image',
      icon: '🖼️',
      status: (photoPreviewUrl ?? child.photoUrl) ? 'Verified' : 'Missing',
      detail: (photoPreviewUrl ?? child.photoUrl)
        ? `Profile photo on file${child.createdAt ? ` · Registered ${formatDate(child.createdAt)}` : ''}`
        : 'No profile photo saved',
    },
    {
      id: 'indemnity',
      name: 'Parental Indemnity Form',
      type: 'Digital Form',
      icon: '📝',
      status: child.indemnitySigned ? 'Verified' : 'Missing',
      detail: child.indemnitySignedAt
        ? `Signed ${formatDate(child.indemnitySignedAt)}`
        : 'Indemnity form not yet signed',
    },
  ];
  const verifiedCount = documents.filter((d) => d.status === 'Verified').length;
  const secondaryGuardians = parseSecondaryGuardians(child.parentSecondaryGuardianJson);
  const canSignIndemnity = role === 'Parent';
  const childCode = child.adventurerCode?.trim() || 'Not assigned';

  const getClassLogoPath = (className?: string) => {
    const key = (className || '').trim().toLowerCase().replace(/\s+/g, '');
    if (key === 'littlelamb') return '/class-logos/little-lamb.png';
    if (key === 'earlybird') return '/class-logos/early-bird.png';
    if (key === 'busybee') return '/class-logos/busy-bee.png';
    if (key === 'sunbeam') return '/class-logos/sunbeam.png';
    if (key === 'builder') return '/class-logos/builder.png';
    if (key === 'helpinghand' || key === 'helpinghands') return '/class-logos/helping-hand.png';
    return '/class-logos/sunbeam.png';
  };

  const createExportContainer = (includeAttachments: boolean, latestChild?: ApiChild) => {
    const source = document.getElementById('profile-export');
    if (!source) {
      throw new Error('Profile export content not found.');
    }

    const container = document.createElement('div');
    container.style.cssText =
      'position:fixed;left:-10000px;top:0;z-index:-1;width:960px;background-color:#ffffff;padding:24px;';
    const exportChild = latestChild ?? child;
    const indemnitySignatureForExport = exportChild?.indemnitySignatureDataUrl ?? child?.indemnitySignatureDataUrl;

    const clone = source.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');
    clone.style.backgroundColor = '#ffffff';
    clone.querySelectorAll('[data-pdf-exclude="true"]').forEach((element) => element.remove());

    const logoHeader = document.createElement('div');
    logoHeader.className = 'mb-4 flex items-center justify-between';
    logoHeader.innerHTML = `
      <img src="/adventurer-logo.png" alt="Adventurer logo" class="h-14 w-14 object-contain" />
      <div class="flex-1 px-4 text-center text-lg font-semibold tracking-wide text-[#1e3a5f]">Bassonia Adventurer Club</div>
      <img src="${getClassLogoPath(child.class)}" alt="${escapeHtml(child.class || 'Class')} logo" class="h-14 w-14 object-contain" />
    `;

    container.appendChild(logoHeader);
    container.appendChild(clone);

    if (includeAttachments) {
      const attachments = document.createElement('div');
      attachments.innerHTML = `
        <div class="mt-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div class="mb-4">
            <h2 class="text-base font-semibold text-gray-700">Stored Attachments</h2>
            <p class="mt-1 text-xs text-gray-400">Full profile export includes the real records currently stored in the application.</p>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div class="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h3 class="mb-3 text-sm font-semibold text-gray-700">Learner Record</h3>
              <div class="mb-4 flex justify-center">
                ${photoPreviewUrl
                  ? `<img src="${photoPreviewUrl}" alt="${escapeHtml(child.name)} profile" class="h-40 w-40 rounded-2xl object-cover border border-gray-200" />`
                  : `<div class="flex h-40 w-40 items-center justify-center rounded-2xl bg-gray-300 text-6xl font-bold text-gray-700">${escapeHtml(child.name.charAt(0))}</div>`}
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between gap-4"><span class="text-gray-500">Learner</span><span class="text-right font-medium text-gray-800">${escapeHtml(child.name)}</span></div>
                <div class="flex justify-between gap-4"><span class="text-gray-500">Date of Birth</span><span class="text-right font-medium text-gray-800">${escapeHtml(formatDate(child.dateOfBirth || ''))}</span></div>
                <div class="flex justify-between gap-4"><span class="text-gray-500">Gender</span><span class="text-right font-medium text-gray-800">${escapeHtml(child.gender || 'Not recorded')}</span></div>
                <div class="flex justify-between gap-4"><span class="text-gray-500">ID / Passport No.</span><span class="text-right font-medium text-gray-800">${escapeHtml(child.documentNumber || 'Not on file')}</span></div>
                <div class="flex justify-between gap-4"><span class="text-gray-500">Code</span><span class="text-right font-medium text-[#1e3a5f]">${escapeHtml(childCode)}</span></div>
                <div class="flex justify-between gap-4"><span class="text-gray-500">Class</span><span class="text-right font-medium text-gray-800">${escapeHtml(child.class || '—')}</span></div>
                <div class="flex justify-between gap-4"><span class="text-gray-500">Status</span><span class="text-right font-medium text-gray-800">${escapeHtml(child.status || 'Pending')}</span></div>
              </div>
            </div>

            <div class="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h3 class="mb-3 text-sm font-semibold text-gray-700">Indemnity Record</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between gap-4"><span class="text-gray-500">Status</span><span class="text-right font-medium ${exportChild?.indemnitySigned ? 'text-green-700' : 'text-red-600'}">${exportChild?.indemnitySigned ? 'Signed' : 'Not signed'}</span></div>
                <div class="flex justify-between gap-4"><span class="text-gray-500">Signed By</span><span class="text-right font-medium text-gray-800">${escapeHtml(exportChild?.indemnitySignedByName || '—')}</span></div>
                <div class="flex justify-between gap-4"><span class="text-gray-500">Relationship</span><span class="text-right font-medium text-gray-800">${escapeHtml(exportChild?.indemnitySignerRelationship || '—')}</span></div>
                <div class="flex justify-between gap-4"><span class="text-gray-500">Signed At</span><span class="text-right font-medium text-gray-800">${escapeHtml(exportChild?.indemnitySignedAt ? formatDate(exportChild.indemnitySignedAt) : '—')}</span></div>
              </div>

              ${indemnitySignatureForExport
                ? `
                  <div class="mt-4 border-t border-gray-200 pt-4">
                    <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Saved Signature</p>
                    <div class="rounded-xl border border-gray-200 bg-white p-3">
                      <img src="${indemnitySignatureForExport}" alt="Indemnity signature" class="max-h-40 w-full object-contain" />
                    </div>
                  </div>
                `
                : '<p class="mt-4 text-xs italic text-gray-400">No saved signature available.</p>'}
            </div>
          </div>

          <div id="export-indemnity-form" class="mt-6 rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
            <div class="mb-8 border-b border-gray-200 pb-6 text-center">
              <img src="/adventurer-logo.png" alt="Adventurer logo" class="mx-auto mb-3 h-16 w-16 object-contain" />
              <h3 class="text-xl font-bold uppercase tracking-wide text-[#1e3a5f]">Bassonia Adventurer Club</h3>
              <p class="mt-1 text-sm text-gray-500">Affiliated with the Seventh-day Adventist Church</p>
              <div class="mt-4 inline-flex min-h-10 items-center justify-center rounded bg-gray-800 px-6 py-0 text-center text-sm font-bold uppercase tracking-widest text-white" style="line-height:1;">
                Parental Indemnity &amp; Code of Conduct Agreement
              </div>
            </div>

            <div class="space-y-5 text-sm leading-relaxed text-gray-700">
              <p>
                This Parental Indemnity and Code of Conduct Agreement (<strong>"Agreement"</strong>) is entered into between the
                <strong> Bassonia Adventurer Club</strong> ("the Club"), operating under the auspices of the Seventh-day Adventist Church,
                and the parent or legal guardian ("Parent/Guardian") of the child enrolled in the Club. By signing this Agreement,
                the Parent/Guardian acknowledges that they have read, understood, and agreed to all terms set out herein.
              </p>

              <div>
                <h4 class="font-semibold uppercase tracking-wide text-[#1e3a5f]">1. Limitation of Liability — Incidents &amp; Injuries</h4>
                <p class="mt-1">The Club, its directors, staff, volunteers, and affiliated church entities shall not be held liable for injury, illness, accident, loss, damage, or incident occurring during Club activities, meetings, outings, camps, or events.</p>
                <p class="mt-1">The Parent/Guardian accepts that children are active by nature and that minor incidents can occur in group activities. The ultimate responsibility for the child&apos;s wellbeing and supervision remains with the Parent/Guardian.</p>
              </div>

              <div>
                <h4 class="font-semibold uppercase tracking-wide text-[#1e3a5f]">2. Role &amp; Responsibilities of Teachers</h4>
                <p class="mt-1">Teachers and leaders are educators and mentors. They are not babysitters, childminders, or surrogate parents, and are not responsible for parental-level supervision beyond structured activities.</p>
                <p class="mt-1">Teachers and leaders are not authorised to administer parental discipline in any form beyond standard verbal redirection.</p>
              </div>

              <div>
                <h4 class="font-semibold uppercase tracking-wide text-[#1e3a5f]">3. Code of Conduct &amp; Demerit Policy</h4>
                <p class="mt-1">Learners are expected to show respect, kindness, and cooperation toward fellow Adventurers, teachers, leaders, and Club property.</p>
                <ul class="mt-3 list-none space-y-2">
                  <li class="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-800"><strong>1st &amp; 2nd Offence:</strong> verbal correction, incident logged, parent notified.</li>
                  <li class="rounded-lg border border-orange-300 bg-orange-50 p-3 text-xs text-orange-800"><strong>3rd Offence:</strong> formal demerit recorded, parent contacted for acknowledgement.</li>
                  <li class="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800"><strong>5 Demerits:</strong> learner may be delisted from camps/overnight events pending formal review.</li>
                </ul>
                <p class="mt-1 italic text-gray-500">Serious misconduct may result in immediate delisting without the normal escalation sequence.</p>
              </div>

              <div>
                <h4 class="font-semibold uppercase tracking-wide text-[#1e3a5f]">4. Medical &amp; Emergency Authorisation</h4>
                <p class="mt-1">In a medical emergency, the Club may seek emergency first aid and medical services where the Parent/Guardian cannot be reached in time. All related costs remain the responsibility of the Parent/Guardian.</p>
              </div>

              <div>
                <h4 class="font-semibold uppercase tracking-wide text-[#1e3a5f]">5. Acknowledgement &amp; Agreement</h4>
                <ul class="mt-2 list-disc space-y-1 pl-5">
                  <li>Agreement has been read and understood in full.</li>
                  <li>Limitation of liability terms are accepted.</li>
                  <li>Teacher role limitations are understood.</li>
                  <li>Code of Conduct and demerit policy are accepted.</li>
                  <li>Emergency medical authorisation is granted.</li>
                </ul>
              </div>
            </div>

            <div class="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
              <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Child Details</p>
              <div class="grid grid-cols-2 gap-x-8 gap-y-2">
                <div class="flex justify-between"><span class="text-gray-500">Child&apos;s Full Name</span><span class="font-medium text-gray-800">${escapeHtml(child.name)}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">Class</span><span class="font-medium text-gray-800">${escapeHtml(child.class || '—')}</span></div>
              </div>
            </div>

            <div class="mt-4 border-t border-gray-200 pt-4">
              <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Signature</p>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-xs text-gray-400">Parent / Guardian Name</p>
                  <p class="border-b border-gray-300 pb-1 font-semibold text-gray-800">${escapeHtml(exportChild?.indemnitySignedByName || '—')}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400">Relationship</p>
                  <p class="border-b border-gray-300 pb-1 font-semibold text-gray-800">${escapeHtml(exportChild?.indemnitySignerRelationship || '—')}</p>
                </div>
                <div class="col-span-2">
                  <p class="mb-1 text-xs text-gray-400">Digital Signature</p>
                  <div class="flex h-24 items-center justify-center overflow-hidden rounded border border-gray-300 bg-white">
                    ${indemnitySignatureForExport
                      ? `<img src="${indemnitySignatureForExport}" alt="Parental indemnity signature" class="max-h-20 w-full object-contain" />`
                      : '<span class="text-xs italic text-gray-400">No signed signature currently stored.</span>'}
                  </div>
                </div>
                <div>
                  <p class="text-xs text-gray-400">Date Signed</p>
                  <p class="border-b border-gray-300 pb-1 font-semibold text-gray-800">${escapeHtml(exportChild?.indemnitySignedAt ? formatDate(exportChild.indemnitySignedAt) : '—')}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400">Status</p>
                  <p class="border-b border-gray-300 pb-1 font-semibold ${exportChild?.indemnitySigned ? 'text-green-700' : 'text-red-600'}">${exportChild?.indemnitySigned ? 'Signed' : 'Not signed'}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            This full export contains the records currently stored in this application, including the learner profile, saved photo preview, and indemnity form details/signature where available.
          </div>
        </div>
      `;
      container.appendChild(attachments);
    }

    document.body.appendChild(container);
    return container;
  };

  const exportElementToPdf = async (element: HTMLElement, filename: string, forcePageBreakSelector?: string) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    const renderScale = 1.5;
    const forceBreakElement = forcePageBreakSelector ? element.querySelector(forcePageBreakSelector) as HTMLElement | null : null;
    const forceBreakCssY = forceBreakElement ? forceBreakElement.offsetTop : null;

    const canvas = await html2canvas(element, {
      scale: renderScale,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1280,
    });

    const getSmartSliceHeight = (
      sourceCanvas: HTMLCanvasElement,
      startY: number,
      idealSliceHeight: number,
    ) => {
      const remaining = sourceCanvas.height - startY;
      if (remaining <= idealSliceHeight) {
        return remaining;
      }

      const minSliceHeight = Math.max(1, Math.floor(idealSliceHeight * 0.72));
      const maxLookBack = Math.min(260, idealSliceHeight - minSliceHeight);
      if (maxLookBack <= 0) {
        return idealSliceHeight;
      }

      const searchStart = idealSliceHeight - maxLookBack;
      const ctx = sourceCanvas.getContext('2d');
      if (!ctx) {
        return idealSliceHeight;
      }

      const imageData = ctx.getImageData(
        0,
        startY + searchStart,
        sourceCanvas.width,
        maxLookBack,
      );

      const { data, width, height } = imageData;
      const whiteThreshold = 246;
      const maxInkRatio = 0.008;

      for (let row = height - 1; row >= 0; row -= 1) {
        let inkPixels = 0;
        for (let x = 0; x < width; x += 2) {
          const i = (row * width + x) * 4;
          const alpha = data[i + 3];
          if (alpha < 8) continue;

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r < whiteThreshold || g < whiteThreshold || b < whiteThreshold) {
            inkPixels += 1;
          }
        }

        const sampledColumns = Math.ceil(width / 2);
        if (inkPixels / sampledColumns <= maxInkRatio) {
          return searchStart + row;
        }
      }

      return idealSliceHeight;
    };

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginMm = 8;
    const renderWidth = pageWidth - (marginMm * 2);
    const renderHeight = pageHeight - (marginMm * 2);
    const pagePixelHeight = Math.max(1, Math.round((canvas.width * renderHeight) / renderWidth));
    const forceBreakPixelY = forceBreakCssY === null ? null : Math.round(forceBreakCssY * (canvas.width / Math.max(1, element.clientWidth)));

    let offsetY = 0;
    let pageIndex = 0;

    while (offsetY < canvas.height) {
      let sliceHeight = getSmartSliceHeight(canvas, offsetY, pagePixelHeight);
      if (forceBreakPixelY !== null && offsetY < forceBreakPixelY && offsetY + sliceHeight > forceBreakPixelY) {
        sliceHeight = Math.max(1, forceBreakPixelY - offsetY);
      }
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const pageCtx = pageCanvas.getContext('2d');
      if (!pageCtx) {
        throw new Error('Could not generate a PDF page.');
      }

      pageCtx.fillStyle = '#ffffff';
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageCtx.drawImage(
        canvas,
        0,
        offsetY,
        canvas.width,
        sliceHeight,
        0,
        0,
        pageCanvas.width,
        sliceHeight,
      );

      if (pageIndex > 0) {
        pdf.addPage();
      }

      const pageImage = pageCanvas.toDataURL('image/png');
      const renderedSliceHeight = (sliceHeight * renderWidth) / canvas.width;
      pdf.addImage(pageImage, 'PNG', marginMm, marginMm, renderWidth, renderedSliceHeight);

      offsetY += sliceHeight;
      pageIndex += 1;
    }

    pdf.save(filename);
  };

  const buildPreviewPages = async (target: 'profile' | 'full') => {
    const { default: html2canvas } = await import('html2canvas');
    const renderScale = 1.5;

    let exportContainer: HTMLElement | null = null;
    try {
      let previewChild: ApiChild | undefined;
      if (target === 'full' && child) {
        try {
          previewChild = await apiFetch(`/api/children/${child.id}`) as ApiChild;
        } catch {
          // Fall back to current state if refetch fails.
        }
      }
      exportContainer = createExportContainer(target === 'full', previewChild);
      const forceBreakElement = target === 'full'
        ? exportContainer.querySelector('#export-indemnity-form') as HTMLElement | null
        : null;
      const forceBreakCssY = forceBreakElement ? forceBreakElement.offsetTop : null;

      const canvas = await html2canvas(exportContainer, {
        scale: renderScale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1280,
      });

      const getSmartSliceHeight = (
        sourceCanvas: HTMLCanvasElement,
        startY: number,
        idealSliceHeight: number,
      ) => {
        const remaining = sourceCanvas.height - startY;
        if (remaining <= idealSliceHeight) {
          return remaining;
        }

        const minSliceHeight = Math.max(1, Math.floor(idealSliceHeight * 0.72));
        const maxLookBack = Math.min(260, idealSliceHeight - minSliceHeight);
        if (maxLookBack <= 0) {
          return idealSliceHeight;
        }

        const searchStart = idealSliceHeight - maxLookBack;
        const ctx = sourceCanvas.getContext('2d');
        if (!ctx) {
          return idealSliceHeight;
        }

        const imageData = ctx.getImageData(
          0,
          startY + searchStart,
          sourceCanvas.width,
          maxLookBack,
        );

        const { data, width, height } = imageData;
        const whiteThreshold = 246;
        const maxInkRatio = 0.008;

        for (let row = height - 1; row >= 0; row -= 1) {
          let inkPixels = 0;
          for (let x = 0; x < width; x += 2) {
            const i = (row * width + x) * 4;
            const alpha = data[i + 3];
            if (alpha < 8) continue;

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r < whiteThreshold || g < whiteThreshold || b < whiteThreshold) {
              inkPixels += 1;
            }
          }

          const sampledColumns = Math.ceil(width / 2);
          if (inkPixels / sampledColumns <= maxInkRatio) {
            return searchStart + row;
          }
        }

        return idealSliceHeight;
      };

      const pageWidthMm = 210;
      const pageHeightMm = 297;
      const marginMm = 8;
      const contentWidthMm = pageWidthMm - (marginMm * 2);
      const contentHeightMm = pageHeightMm - (marginMm * 2);

      const previewPageWidthPx = canvas.width;
      const pxPerMm = previewPageWidthPx / pageWidthMm;
      const previewPageHeightPx = Math.round(pageHeightMm * pxPerMm);
      const marginPx = Math.round(marginMm * pxPerMm);
      const contentWidthPx = Math.round(contentWidthMm * pxPerMm);
      const contentHeightPx = Math.round(contentHeightMm * pxPerMm);
      const sourceSliceHeightPx = Math.max(1, Math.round((canvas.width * contentHeightMm) / contentWidthMm));
      const forceBreakPixelY = forceBreakCssY === null ? null : Math.round(forceBreakCssY * (canvas.width / Math.max(1, exportContainer.clientWidth)));

      const pages: string[] = [];
      let offsetY = 0;

      while (offsetY < canvas.height) {
        let sliceHeight = getSmartSliceHeight(canvas, offsetY, sourceSliceHeightPx);
        if (forceBreakPixelY !== null && offsetY < forceBreakPixelY && offsetY + sliceHeight > forceBreakPixelY) {
          sliceHeight = Math.max(1, forceBreakPixelY - offsetY);
        }
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = previewPageWidthPx;
        pageCanvas.height = previewPageHeightPx;

        const pageCtx = pageCanvas.getContext('2d');
        if (!pageCtx) {
          throw new Error('Could not generate PDF page preview.');
        }

        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        pageCtx.drawImage(
          canvas,
          0,
          offsetY,
          canvas.width,
          sliceHeight,
          marginPx,
          marginPx,
          contentWidthPx,
          Math.min(contentHeightPx, Math.round((sliceHeight * contentWidthPx) / canvas.width)),
        );

        pages.push(pageCanvas.toDataURL('image/png'));
        offsetY += sliceHeight;
      }

      setPreviewPages(pages);
    } finally {
      if (exportContainer) {
        document.body.removeChild(exportContainer);
      }
    }
  };

  const handleOpenPreview = async (target: 'profile' | 'full') => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewPages([]);
    setPreviewError(null);

    try {
      await buildPreviewPages(target);
    } catch (previewRenderError) {
      console.error('PDF preview generation failed', previewRenderError);
      setPreviewError('Could not generate PDF preview. Please try again.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadPdf = async (target: 'profile' | 'full') => {
    const safeName = child.name.replace(/\s+/g, '_');
    const safeCode = childCode.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const filename = target === 'profile'
      ? `${safeCode || child.id}_Profile_${safeName}.pdf`
      : `${safeCode || child.id}_Full_Profile_${safeName}.pdf`;

    setDownloadingPdf(target);
    let exportContainer: HTMLElement | null = null;
    let latestChild: ApiChild | undefined;

    try {
      if (target === 'full') {
        try {
          latestChild = await apiFetch(`/api/children/${child.id}`) as ApiChild;
        } catch {
          // Use the already loaded page state if refresh fetch fails.
        }
      }

      exportContainer = createExportContainer(target === 'full', latestChild);
      await exportElementToPdf(exportContainer, filename, target === 'full' ? '#export-indemnity-form' : undefined);
    } catch (downloadError) {
      console.error('PDF generation failed', downloadError);
      window.alert(`Could not generate the ${target === 'profile' ? 'profile' : 'full profile'} PDF.`);
    } finally {
      if (exportContainer) {
        document.body.removeChild(exportContainer);
      }
      setDownloadingPdf(null);
    }
  };

  const onPhotoSelected = async (files: FileList | null) => {
    const selected = files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      window.alert('Please select an image file.');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(selected);
      setPhotoPreviewUrl(dataUrl);
      setPhotoMenuOpen(false);
      setCameraError('');
    } catch {
      window.alert('Could not load image preview. Please try a different image.');
    }
  };

  const openCamera = async () => {
    setCameraError('');
    setPhotoMenuOpen(false);
    setCameraOpen(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MEDIA_DEVICES_UNAVAILABLE');
      }

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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      const cameraException = err as DOMException | Error;
      let message = 'Camera unavailable. Upload photo will open instead.';
      let shouldOpenUpload = true;

      if (cameraException instanceof DOMException) {
        if (cameraException.name === 'NotAllowedError' || cameraException.name === 'SecurityError') {
          message = 'Camera permission was blocked. Please allow camera access in your browser.';
          shouldOpenUpload = false;
        } else if (cameraException.name === 'NotReadableError' || cameraException.name === 'TrackStartError') {
          message = 'Camera is busy in another app. Close Teams, Zoom, or the Camera app and try again.';
        } else if (cameraException.name === 'NotFoundError' || cameraException.name === 'DevicesNotFoundError') {
          message = 'No camera device was found on this computer.';
        } else if (cameraException.name === 'OverconstrainedError' || cameraException.name === 'ConstraintNotSatisfiedError') {
          message = 'Camera settings were not supported. Try again or upload a photo instead.';
        }
      } else if (cameraException.message === 'MEDIA_DEVICES_UNAVAILABLE') {
        message = 'This page cannot access camera APIs here. Use Upload Photo instead.';
      }

      setCameraError(message);
      setCameraOpen(false);
      if (shouldOpenUpload) {
        setTimeout(() => fileInputRef.current?.click(), 50);
      }
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    stopCamera();
    setCameraOpen(false);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPhotoPreviewUrl(dataUrl);
    setCameraError('');
  };

  const viewDocument = (doc: DocumentItem) => {
    if (doc.id === 'indemnity') {
      router.push(`/director/children/${child.id}/indemnity`);
      return;
    }

    if (doc.id === 'photo') {
      const url = photoPreviewUrl ?? child.photoUrl;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        window.alert('No profile photo is saved for this learner yet.');
      }
      return;
    }

    if (doc.id === 'identity') {
      if (!child.documentNumber?.trim()) {
        window.alert('No identity document number is on file for this learner yet.');
        return;
      }
      window.alert(`${child.documentType ?? 'Document'} number: ${child.documentNumber}`);
      return;
    }

    if (doc.id === 'medical-card' || doc.id === 'allergy') {
      if (!medicalInfo) {
        window.alert('No medical aid information is saved for this learner yet.');
        return;
      }
      const medicalDetails = [
        medicalInfo.coverType ? `Cover Type: ${medicalInfo.coverType}` : null,
        medicalInfo.name ? `Provider: ${medicalInfo.name}` : null,
        medicalInfo.plan ? `Plan: ${medicalInfo.plan}` : null,
        medicalInfo.number ? `Member No.: ${medicalInfo.number}` : null,
        medicalInfo.allergies ? `Allergies: ${medicalInfo.allergies}` : null,
        medicalInfo.requirements ? `Requirements: ${medicalInfo.requirements}` : null,
      ].filter(Boolean).join('\n');
      window.alert(medicalDetails || 'Medical aid information is saved for this learner.');
      return;
    }

    if (doc.status === 'Missing') {
      window.alert(`${doc.name} has not been uploaded yet.`);
      return;
    }

    window.alert(`${doc.name} is on file. Physical document uploads are not stored digitally in this version of the app — the status reflects approval-based verification.`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-start p-4 overflow-y-auto" data-pdf-exclude="true">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl sticky top-0 z-10">
              <p className="text-sm font-semibold text-gray-700">PDF Preview — Exactly As Download</p>
              <button
                type="button"
                onClick={() => {
                  setPreviewOpen(false);
                  setPreviewPages([]);
                  setPreviewError(null);
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="p-6 bg-[#f4f6f8] rounded-b-2xl space-y-6">
              {previewLoading && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
                  Generating preview pages...
                </div>
              )}

              {previewError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {previewError}
                </div>
              )}

              {!previewLoading && !previewError && previewPages.map((page, index) => (
                <div key={`preview-page-${index + 1}`} className="mx-auto w-full max-w-[820px]">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Page {index + 1}</p>
                  <img src={page} alt={`PDF page ${index + 1}`} className="w-full rounded-lg border border-gray-200 bg-white shadow" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4 p-4" data-pdf-exclude="true">
          <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-sm rounded-xl object-cover" />
          <div className="flex gap-4">
            <button
              type="button"
              onClick={capturePhoto}
              className="bg-white text-gray-800 font-semibold px-6 py-2.5 rounded-full text-sm shadow hover:bg-gray-100"
            >
              Capture
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setCameraOpen(false);
              }}
              className="bg-gray-700 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e3a5f] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Children
        </button>

        <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto" data-pdf-exclude="true">
          <button
            type="button"
            onClick={() => void handleOpenPreview('profile')}
            disabled={downloadingPdf !== null || previewLoading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {previewLoading ? 'Preparing Preview...' : 'Preview Template'}
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPdf('profile')}
            disabled={downloadingPdf !== null}
            className="rounded-lg border border-[#1e3a5f] bg-white px-4 py-2 text-sm font-semibold text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          >
            {downloadingPdf === 'profile' ? 'Generating...' : 'Download Profile'}
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPdf('full')}
            disabled={downloadingPdf !== null}
            className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a4f7c] disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          >
            {downloadingPdf === 'full' ? 'Generating...' : 'Download Full Profile'}
          </button>
        </div>
      </div>

      <div id="profile-export" className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-3xl flex-shrink-0 overflow-hidden border-4 border-white shadow">
              {photoPreviewUrl ? (
                <img
                  src={photoPreviewUrl}
                  alt={`${child.name} profile`}
                  className="w-full h-full object-cover"
                />
              ) : (
                child.name.charAt(0)
              )}
            </div>

            <button
              type="button"
              title="Change profile photo"
              data-pdf-exclude="true"
              onClick={() => setPhotoMenuOpen((current) => !current)}
              className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center cursor-pointer border-2 border-white shadow hover:bg-[#2a4f7c] transition-colors"
            >
              ✎
            </button>

            {photoMenuOpen && (
              <div className="absolute top-full right-0 z-20 mt-2 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white text-left shadow-lg" data-pdf-exclude="true">
                <button
                  type="button"
                  onClick={() => void openCamera()}
                  className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-blue-50"
                >
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-blue-50"
                >
                  Upload Photo
                </button>
                {photoPreviewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreviewUrl(null);
                      setPhotoMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              capture="user"
              onChange={(e) => {
                void onPhotoSelected(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800">{child.name}</h1>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[child.status || 'Pending']}`}>
                {child.status}
              </span>
            </div>
            <p className="text-gray-500 text-sm">{child.class} · Age {calcAge(child.dateOfBirth)}</p>
            <p className="text-sm text-[#1e3a5f] font-semibold mt-1">Code: {childCode}</p>
            <p className="text-gray-400 text-xs mt-1">Joined {formatDate(child.createdAt || '')}</p>
            {cameraError && <p className="text-xs text-red-500 mt-2">{cameraError}</p>}
          </div>

          <div className="flex gap-2 flex-shrink-0 justify-center">
            <div className="text-center px-4 py-2 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-[#1e3a5f]">{verifiedCount}</p>
              <p className="text-xs text-gray-500">Docs Verified</p>
            </div>
            <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
              <p className="text-xl font-bold text-gray-700">{documents.length}</p>
              <p className="text-xs text-gray-500">Total Docs</p>
            </div>
            <div className={`text-center px-4 py-2 rounded-lg ${child.isDelistedFromCamps ? 'bg-rose-50' : 'bg-amber-50'}`}>
              <p className={`text-xl font-bold ${child.isDelistedFromCamps ? 'text-rose-700' : 'text-amber-700'}`}>{child.demeritCount ?? 0}</p>
              <p className="text-xs text-gray-500">Active Demerits</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-5 mb-6 ${child.isDelistedFromCamps ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className={`text-base font-semibold ${child.isDelistedFromCamps ? 'text-rose-900' : 'text-amber-900'}`}>Demerit Status</h2>
            <p className="text-sm text-gray-700 mt-1">
              {child.demeritCount ?? 0} active approved demerit{child.demeritCount === 1 ? '' : 's'}
              {child.pendingDemeritCount ? ` · ${child.pendingDemeritCount} pending approval` : ''}
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${child.isDelistedFromCamps ? 'bg-rose-100 text-rose-700' : 'bg-white text-amber-700 border border-amber-200'}`}>
            {child.isDelistedFromCamps ? 'Camp payments blocked' : 'Camp access active'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Personal Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Full Name</span>
              <span className="font-medium text-gray-800">{child.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date of Birth</span>
              <span className="font-medium text-gray-800">{formatDate(child.dateOfBirth)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Age</span>
              <span className="font-medium text-gray-800">{calcAge(child.dateOfBirth)} years old</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Gender</span>
              <span className="font-medium text-gray-800">
                {child.gender
                  ? `${child.gender === 'Male' ? '♂' : '♀'} ${child.gender}`
                  : <span className="italic text-gray-400">Not recorded</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{child.documentType ?? 'ID'} Number</span>
              <span className="font-medium text-gray-800 font-mono">
                {child.documentNumber?.trim() || <span className="italic text-gray-400">Not on file</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Class</span>
              <span className="font-medium text-gray-800">{child.class}</span>
            </div>
            {(() => {
              const med = parseMedicalInfo(child.medicalAidInfo);
              if (!med) return (
                <div className="flex justify-between">
                  <span className="text-gray-500">Medical Cover</span>
                  <span className="text-gray-400 italic">Not provided</span>
                </div>
              );
              return (
                <div className="pt-1 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Medical Cover</p>
                  <div className="space-y-1.5 pl-1">
                    {med.coverType && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type</span>
                        <span className="font-medium text-gray-800">{med.coverType}</span>
                      </div>
                    )}
                    {med.name && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Provider</span>
                        <span className="font-medium text-gray-800 capitalize">{med.name}</span>
                      </div>
                    )}
                    {med.plan && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Plan</span>
                        <span className="font-medium text-gray-800 capitalize">{med.plan}</span>
                      </div>
                    )}
                    {med.number && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Member No.</span>
                        <span className="font-medium text-gray-800 font-mono">{med.number}</span>
                      </div>
                    )}
                    {med.allergies && (
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 shrink-0">Allergies</span>
                        <span className="font-medium text-rose-600 text-right capitalize">{med.allergies}</span>
                      </div>
                    )}
                    {med.requirements && (
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 shrink-0">Requirements</span>
                        <span className="font-medium text-amber-700 text-right capitalize">{med.requirements}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Parent / Guardian</h2>
          <div className="space-y-3 text-sm">
            {/* Primary guardian */}
            <div className="pb-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Primary — {child.parentRelationship || 'Guardian'}
              </p>
              <div className="space-y-2">
                {child.parentName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="font-medium text-gray-800">{child.parentName}</span>
                  </div>
                )}
                {child.parentEmail && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium text-gray-800">{child.parentEmail}</span>
                  </div>
                )}
                {child.parentPhone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="font-medium text-gray-800">{child.parentPhone}</span>
                  </div>
                )}
                {child.parentAddress && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500 shrink-0">Address</span>
                    <span className="font-medium text-gray-800 text-right">{child.parentAddress}</span>
                  </div>
                )}
                {child.parentEmergencyContactName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Emergency</span>
                    <span className="font-medium text-gray-800">
                      {child.parentEmergencyContactName}
                      {child.parentEmergencyContactPhone ? ` · ${child.parentEmergencyContactPhone}` : ''}
                    </span>
                  </div>
                )}
                {!child.parentPhone && !child.parentEmail && !child.parentAddress && (
                  <p className="text-xs text-gray-400 italic">Contact details not yet captured.</p>
                )}
              </div>
            </div>

            {/* Secondary guardians */}
            {secondaryGuardians.length > 0 ? secondaryGuardians.map((sg, idx) => (
              <div key={idx} className="pb-3 border-b border-gray-100 last:border-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {idx === 0 ? 'Secondary' : `Additional ${idx + 1}`} — {sg.relationship || 'Guardian'}
                </p>
                <div className="space-y-2">
                  {sg.name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name</span>
                      <span className="font-medium text-gray-800">{sg.name}</span>
                    </div>
                  )}
                  {sg.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email</span>
                      <span className="font-medium text-gray-800">{sg.email}</span>
                    </div>
                  )}
                  {sg.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-medium text-gray-800">{sg.phone}{sg.altPhone ? ` / ${sg.altPhone}` : ''}</span>
                    </div>
                  )}
                  {sg.address && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500 shrink-0">Address</span>
                      <span className="font-medium text-gray-800 text-right">{sg.address}</span>
                    </div>
                  )}
                  {sg.emergencyContactName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Emergency</span>
                      <span className="font-medium text-gray-800">
                        {sg.emergencyContactName}
                        {sg.emergencyContactPhone ? ` · ${sg.emergencyContactPhone}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <div className="pb-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Secondary — Guardian</p>
                <p className="text-xs text-gray-400 italic">No secondary parent/guardian saved for this learner yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-700">Documents</h2>
          <span className="text-xs text-gray-400">{verifiedCount} of {documents.length} verified</span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-2 mb-5">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${documents.length > 0 ? (verifiedCount / documents.length) * 100 : 0}%` }}
          />
        </div>

        <div className="divide-y divide-gray-50">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{doc.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{doc.name}</p>
                  <p className="text-xs text-gray-400">
                    {doc.type} · {doc.detail}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-6 min-w-[68px] items-center justify-center rounded-full px-2 text-xs font-semibold ${docStatusColors[doc.status]}`}
                  style={{ lineHeight: 1, paddingTop: 0, paddingBottom: 0, verticalAlign: 'middle' }}
                >
                  {doc.status}
                </span>
                <button
                  type="button"
                  data-pdf-exclude="true"
                  onClick={() => viewDocument(doc)}
                  className="text-xs text-[#1e3a5f] hover:underline font-medium"
                >
                  {doc.id === 'indemnity' && doc.status === 'Missing' && canSignIndemnity ? 'Sign Now' : 'View'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-700">Indemnity Form</h2>
            <p className="text-xs text-gray-400 mt-0.5">Parental Indemnity &amp; Code of Conduct Agreement</p>
          </div>
          <button
            type="button"
            data-pdf-exclude="true"
            onClick={() => router.push(`/director/children/${child.id}/indemnity`)}
            className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {canSignIndemnity ? 'View / Sign Form' : 'View Form'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-700">Demerit Workflow</h2>
            <p className="text-xs text-gray-400 mt-0.5">Teacher submissions, director approvals, expiry, and audit history.</p>
          </div>
          {role === 'Teacher' && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">Teacher actions</span>
          )}
          {role === 'Director' && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f]">Director actions</span>
          )}
        </div>

        {demeritError && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {demeritError}
          </div>
        )}

        {role === 'Teacher' && (
          <div data-pdf-exclude="true" className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-blue-900">Submit New Demerit</h3>
            <textarea
              value={demeritForm.reason}
              onChange={(event) => setDemeritForm((current) => ({ ...current, reason: event.target.value }))}
              className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
              rows={3}
              placeholder="Reason for the demerit"
            />
            <textarea
              value={demeritForm.consequence}
              onChange={(event) => setDemeritForm((current) => ({ ...current, consequence: event.target.value }))}
              className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
              rows={2}
              placeholder="Proposed consequence"
            />
            <textarea
              value={demeritForm.remedy}
              onChange={(event) => setDemeritForm((current) => ({ ...current, remedy: event.target.value }))}
              className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
              rows={2}
              placeholder="Proposed remedy"
            />
            <button
              type="button"
              onClick={submitDemerit}
              disabled={demeritSaving}
              className="rounded-lg bg-[#1e3a5f] text-white px-4 py-2 text-sm font-semibold hover:bg-[#2a4f7c] disabled:opacity-60"
            >
              {demeritSaving ? 'Submitting...' : 'Submit For Director Approval'}
            </button>
          </div>
        )}

        {role === 'Director' && pendingDemerits.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Pending Approvals</h3>
            {pendingDemerits.map((record) => (
              <div key={record.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-800">{record.reason}</p>
                <p className="text-xs text-gray-600"><span className="font-semibold">Teacher proposal:</span> {record.consequence}</p>
                <p className="text-xs text-gray-600"><span className="font-semibold">Remedy:</span> {record.remedy}</p>
                <p className="text-xs text-gray-500">Submitted by {record.submittedByTeacherName ?? 'Teacher'} on {formatDate(record.submittedAt)}</p>
                <div className="flex flex-wrap gap-2 pt-1" data-pdf-exclude="true">
                  <button
                    type="button"
                    onClick={() => runDemeritAction(record, 'approve')}
                    disabled={demeritSaving}
                    className="rounded-lg bg-green-600 text-white px-3 py-2 text-xs font-semibold hover:bg-green-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => runDemeritAction(record, 'reject')}
                    disabled={demeritSaving}
                    className="rounded-lg bg-red-600 text-white px-3 py-2 text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {history.length === 0 ? (
          <p className="text-sm text-gray-400">No demerits have been recorded for this child yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div key={record.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{record.reason}</span>
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                        record.status === 'ApprovedActive' ? 'bg-green-100 text-green-700' :
                        record.status === 'PendingApproval' ? 'bg-yellow-100 text-yellow-700' :
                        record.status === 'StopRequested' || record.status === 'DeleteRequested' ? 'bg-blue-100 text-blue-700' :
                        record.status === 'Expired' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600"><span className="font-semibold">Consequence:</span> {record.consequence}</p>
                    <p className="text-xs text-gray-600"><span className="font-semibold">Remedy:</span> {record.remedy}</p>
                    <p className="text-xs text-gray-500">
                      Submitted by {record.submittedByTeacherName ?? 'Teacher'} on {formatDate(record.submittedAt)}
                      {record.approvedByDirectorName ? ` · Approved by ${record.approvedByDirectorName}` : ''}
                      {record.expiresAt ? ` · Expires ${formatDate(record.expiresAt)}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end" data-pdf-exclude="true">
                    {role === 'Teacher' && record.status === 'ApprovedActive' && (
                      <>
                        <button
                          type="button"
                          onClick={() => requestDemeritAction(record, 'request-stop')}
                          disabled={demeritSaving}
                          className="rounded-lg border border-blue-200 text-blue-700 px-3 py-2 text-xs font-semibold hover:bg-blue-50 disabled:opacity-60"
                        >
                          Request Stop
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDemeritAction(record, 'request-delete')}
                          disabled={demeritSaving}
                          className="rounded-lg border border-red-200 text-red-700 px-3 py-2 text-xs font-semibold hover:bg-red-50 disabled:opacity-60"
                        >
                          Request Delete
                        </button>
                      </>
                    )}

                    {role === 'Director' && record.status === 'ApprovedActive' && (
                      <>
                        <button
                          type="button"
                          onClick={() => runDemeritAction(record, 'stop')}
                          disabled={demeritSaving}
                          className="rounded-lg border border-blue-200 text-blue-700 px-3 py-2 text-xs font-semibold hover:bg-blue-50 disabled:opacity-60"
                        >
                          Stop
                        </button>
                        <button
                          type="button"
                          onClick={() => runDemeritAction(record, 'delete')}
                          disabled={demeritSaving}
                          className="rounded-lg border border-red-200 text-red-700 px-3 py-2 text-xs font-semibold hover:bg-red-50 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </>
                    )}

                    {role === 'Director' && record.status === 'StopRequested' && (
                      <button
                        type="button"
                        onClick={() => runDemeritAction(record, 'approve-stop')}
                        disabled={demeritSaving}
                        className="rounded-lg bg-blue-600 text-white px-3 py-2 text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
                      >
                        Approve Stop
                      </button>
                    )}

                    {role === 'Director' && record.status === 'DeleteRequested' && (
                      <button
                        type="button"
                        onClick={() => runDemeritAction(record, 'approve-delete')}
                        disabled={demeritSaving}
                        className="rounded-lg bg-red-600 text-white px-3 py-2 text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
                      >
                        Approve Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <canvas ref={captureCanvasRef} className="hidden" />
      </div>
    </div>
  );
}
