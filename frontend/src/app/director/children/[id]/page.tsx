'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiChild, DemeritRecordSummary } from '@/lib/compliance';

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  uploadedDate: string;
  status: 'Verified' | 'Pending' | 'Missing';
  icon: string;
}

const baseDocuments: DocumentItem[] = [
  { id: '1', name: 'Birth Certificate', type: 'PDF', uploadedDate: '2025-01-15', status: 'Verified', icon: '📄' },
  { id: '2', name: 'SA ID / Passport Copy', type: 'PDF', uploadedDate: '2025-01-15', status: 'Verified', icon: '🪪' },
  { id: '3', name: 'Medical Aid Card', type: 'Image', uploadedDate: '2025-01-16', status: 'Verified', icon: '💳' },
  { id: '4', name: 'Allergy/Medical Form', type: 'PDF', uploadedDate: '2025-01-16', status: 'Pending', icon: '🏥' },
  { id: '5', name: 'Parent Consent Form', type: 'PDF', uploadedDate: '', status: 'Missing', icon: '✍️' },
  { id: '6', name: 'Photo (Passport Size)', type: 'Image', uploadedDate: '2025-01-15', status: 'Verified', icon: '🖼️' },
];

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

export default function ChildProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { role } = useAuth();
  const [child, setChild] = useState<ApiChild | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demeritError, setDemeritError] = useState<string | null>(null);
  const [demeritSaving, setDemeritSaving] = useState(false);
  const [demeritForm, setDemeritForm] = useState({ reason: '', consequence: '', remedy: '' });

  const loadChild = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/children/${id}`) as ApiChild;
      setChild(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load child profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadChild();
  }, [loadChild]);

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

  const indemnityDocument: DocumentItem = {
    id: 'indemnity',
    name: 'Parental Indemnity Form',
    type: 'Digital Form',
    uploadedDate: child.indemnitySignedAt ? child.indemnitySignedAt.slice(0, 10) : '',
    status: child.indemnitySigned ? 'Verified' : 'Missing',
    icon: '📝',
  };
  const documents = [...baseDocuments, indemnityDocument];
  const verifiedCount = documents.filter((d) => d.status === 'Verified').length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e3a5f] mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Children
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-4xl flex-shrink-0">
            {child.name.charAt(0)}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-800">{child.name}</h1>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full self-center ${statusColors[child.status || 'Pending']}`}>
                {child.status}
              </span>
            </div>
            <p className="text-gray-500 text-sm">{child.class} · Age {calcAge(child.dateOfBirth)}</p>
            <p className="text-gray-400 text-xs mt-1">Joined {formatDate(child.createdAt || '')}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
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
            {(() => {
              if (!child.parentSecondaryGuardianJson) return null;
              let secondaryGuardians: Array<{
                name?: string; relationship?: string; phone?: string; altPhone?: string;
                email?: string; address?: string; emergencyContactName?: string; emergencyContactPhone?: string;
              }> = [];
              try { secondaryGuardians = JSON.parse(child.parentSecondaryGuardianJson); } catch { return null; }
              if (!secondaryGuardians.length) return null;
              return secondaryGuardians.map((sg, idx) => (
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
              ));
            })()}
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
            style={{ width: `${(verifiedCount / documents.length) * 100}%` }}
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
                    {doc.type}
                    {doc.uploadedDate ? ` · Uploaded ${formatDate(doc.uploadedDate)}` : ' · Not uploaded'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${docStatusColors[doc.status]}`}>
                  {doc.status}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (doc.id === 'indemnity') {
                      router.push(`/director/children/${child.id}/indemnity`);
                    }
                  }}
                  className="text-xs text-[#1e3a5f] hover:underline font-medium"
                >
                  {doc.id === 'indemnity' && doc.status === 'Missing' ? 'Sign Now' : 'View'}
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
            onClick={() => router.push(`/director/children/${child.id}/indemnity`)}
            className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View / Sign Form
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
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
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
                <div className="flex flex-wrap gap-2 pt-1">
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

                  <div className="flex flex-wrap gap-2 justify-end">
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
    </div>
  );
}
