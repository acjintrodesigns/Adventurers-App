'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface TeacherProfile {
  id: number;
  userId: number;
  email?: string | null;
  fullName: string;
  dateOfBirth?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  phone?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  photoUrl?: string | null;
  medicalAidInfo?: string | null;
  uploadsJson?: string | null;
  indemnitySigned?: boolean;
  indemnitySignedAt?: string | null;
  indemnitySignedByName?: string | null;
  indemnitySignerRelationship?: string | null;
  status: string;
  assignedClass?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Pending: 'bg-yellow-100 text-yellow-700',
};

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || <span className="text-gray-400 italic">Not provided</span>}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-700 mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/teachers')
      .then((data: TeacherProfile[]) => {
        const found = Array.isArray(data) ? data.find((t) => String(t.id) === id) : null;
        if (!found) {
          setError('Teacher not found.');
        } else {
          setTeacher(found);
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load teacher.'))
      .finally(() => setLoading(false));
  }, [id]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  let uploads: { label: string; url: string }[] = [];
  if (teacher?.uploadsJson) {
    try { uploads = JSON.parse(teacher.uploadsJson); } catch { /* ignore */ }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-5 flex items-center gap-2 text-sm text-[#1e3a5f] font-medium hover:underline"
      >
        ← Back to Teachers
      </button>

      {loading && <p className="text-sm text-gray-500">Loading teacher profile...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {teacher && (
        <div className="space-y-5">
          {/* Hero card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
            {teacher.photoUrl ? (
              <img
                src={teacher.photoUrl}
                alt={teacher.fullName}
                className="w-20 h-20 rounded-full object-cover border-2 border-[#1e3a5f] shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-3xl font-bold shrink-0">
                {teacher.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{teacher.fullName}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">{teacher.email ?? '—'}</p>
                  {teacher.assignedClass && (
                    <p className="text-sm text-[#1e3a5f] font-medium mt-1">📚 {teacher.assignedClass}</p>
                  )}
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[teacher.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {teacher.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                <span>Registered: {formatDate(teacher.createdAt)}</span>
                {teacher.updatedAt && <span>Updated: {formatDate(teacher.updatedAt)}</span>}
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <Section title="Personal Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField label="Full Name" value={teacher.fullName} />
              <InfoField label="Date of Birth" value={formatDate(teacher.dateOfBirth)} />
              <InfoField label="Phone" value={teacher.phone} />
              <InfoField label="Address" value={teacher.address} />
              <InfoField label={`${teacher.documentType ?? 'Document'} Number`} value={teacher.documentNumber} />
              <InfoField label="Document Type" value={teacher.documentType} />
            </div>
          </Section>

          {/* Emergency Contact */}
          <Section title="Emergency Contact">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField label="Contact Name" value={teacher.emergencyContactName} />
              <InfoField label="Contact Phone" value={teacher.emergencyContactPhone} />
            </div>
          </Section>

          {/* Medical Information */}
          <Section title="Medical Information">
            <InfoField label="Medical Aid / Health Info" value={teacher.medicalAidInfo} />
          </Section>

          {/* Indemnity */}
          <Section title="Indemnity Form">
            {teacher.indemnitySigned ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">✓ Signed</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label="Signed By" value={teacher.indemnitySignedByName} />
                  <InfoField label="Relationship" value={teacher.indemnitySignerRelationship} />
                  <InfoField label="Signed On" value={formatDate(teacher.indemnitySignedAt)} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Indemnity form not yet signed.</p>
            )}
          </Section>

          {/* Uploaded Documents */}
          <Section title="Uploaded Documents">
            {uploads.length > 0 ? (
              <ul className="space-y-2">
                {uploads.map((doc, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="text-[#1e3a5f]">📄</span>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#1e3a5f] underline hover:text-[#2a4f7c]"
                    >
                      {doc.label || `Document ${i + 1}`}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No documents uploaded.</p>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
