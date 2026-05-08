'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRef, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiChild } from '@/lib/compliance';

export default function IndemnityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { role, user } = useAuth();
  const [child, setChild] = useState<ApiChild | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [signedAt, setSignedAt] = useState('');
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [agreed, setAgreed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [savingSignature, setSavingSignature] = useState(false);
  const [signatureSaved, setSignatureSaved] = useState(false);

  const canSignIndemnity = role === 'Parent' && !!child && Number(user?.id ?? '0') === child.parentId;

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);
    apiFetch(`/api/children/${id}`)
      .then((data: ApiChild) => {
        setChild(data);
        setFullName(data.indemnitySignedByName || data.parentName || '');
        setRelationship(data.indemnitySignerRelationship || 'Parent');
        setIsSigned(!!data.indemnitySigned);
        setSignatureDataUrl(data.indemnitySignatureDataUrl || '');
        setSignedAt(
          data.indemnitySignedAt
            ? new Date(data.indemnitySignedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
            : '',
        );
      })
      .catch((err) => setError(err?.message ?? 'Failed to load indemnity details'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsSigning(true);
    setHasSigned(true);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isSigning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    e.preventDefault();
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isSigning]);

  const stopDraw = useCallback(() => setIsSigning(false), []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    setSignatureDataUrl('');
    setSignatureSaved(false);
  };

  const handleSaveSignature = async () => {
    if (!id || !hasSigned) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const captured = canvas.toDataURL();
    setSavingSignature(true);
    try {
      await apiFetch(`/api/children/${id}/indemnity/save`, {
        method: 'PUT',
        body: JSON.stringify({
          signatureDataUrl: captured,
          fullName: fullName.trim() || undefined,
          relationship: relationship || undefined,
        }),
      });
      setSignatureDataUrl(captured);
      setSignatureSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signature');
    } finally {
      setSavingSignature(false);
    }
  };

  const handleSign = async () => {
    if (!id || !hasSigned || !agreed || !fullName.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const now = new Date();
    const signedAtLabel = now.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
    const capturedSignature = canvas.toDataURL();

    try {
      await apiFetch(`/api/children/${id}/indemnity`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: fullName.trim(),
          relationship,
          signatureDataUrl: capturedSignature,
        }),
      });

      setSignatureDataUrl(capturedSignature);
      setSignedAt(signedAtLabel);
      setIsSigned(true);
      setChild((prev) => (prev ? { ...prev, indemnitySigned: true } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save indemnity form');
    }
  };

  const handleDownloadPdf = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');

      let exportChild = child;
      if (id) {
        try {
          const latestChild = await apiFetch(`/api/children/${id}`) as ApiChild;
          exportChild = latestChild;
          setChild(latestChild);
          setFullName(latestChild.indemnitySignedByName || latestChild.parentName || '');
          setRelationship(latestChild.indemnitySignerRelationship || 'Parent');
          setIsSigned(!!latestChild.indemnitySigned);
          setSignatureDataUrl(latestChild.indemnitySignatureDataUrl || '');
          setSignedAt(
            latestChild.indemnitySignedAt
              ? new Date(latestChild.indemnitySignedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
              : '',
          );
        } catch {
          // Use currently loaded child details if refresh fails.
        }
      }

      if (!exportChild) {
        return;
      }

      const exportFullName = exportChild.indemnitySignedByName || exportChild.parentName || fullName || '';
      const exportRelationship = exportChild.indemnitySignerRelationship || relationship || 'Parent';
      const exportSignedAt = exportChild.indemnitySignedAt
        ? new Date(exportChild.indemnitySignedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
        : signedAt;
      const exportSignatureDataUrl = exportChild.indemnitySignatureDataUrl || signatureDataUrl;

      // Load any image via canvas so jsPDF always receives a clean JPEG (avoids
      // fast-png / alpha-channel issues with transparent PNGs).
      const loadImageAsJpeg = (path: string): Promise<string | null> =>
        new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) { resolve(null); return; }
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/jpeg', 0.95));
            } catch { resolve(null); }
          };
          img.onerror = () => resolve(null);
          img.src = path;
        });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - (margin * 2);
      const primaryColor: [number, number, number] = [30, 58, 95];
      const mutedColor: [number, number, number] = [107, 114, 128];
      const darkColor: [number, number, number] = [31, 41, 55];
      let cursorY = margin;

      const ensureSpace = (height: number) => {
        if (cursorY + height <= pageHeight - margin) {
          return;
        }
        pdf.addPage();
        cursorY = margin;
      };

      const writeWrapped = (
        text: string,
        options?: {
          fontSize?: number;
          color?: [number, number, number];
          indent?: number;
          bold?: boolean;
          extraGap?: number;
        },
      ) => {
        const fontSize = options?.fontSize ?? 11;
        const indent = options?.indent ?? 0;
        const x = margin + indent;
        const maxWidth = contentWidth - indent;
        pdf.setFont('helvetica', options?.bold ? 'bold' : 'normal');
        pdf.setFontSize(fontSize);
        pdf.setTextColor(...(options?.color ?? darkColor));
        const lines = pdf.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.46;
        ensureSpace((lines.length * lineHeight) + (options?.extraGap ?? 2));
        pdf.text(lines, x, cursorY);
        cursorY += (lines.length * lineHeight) + (options?.extraGap ?? 2);
      };

      const drawSectionHeading = (title: string) => {
        ensureSpace(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(...primaryColor);
        pdf.text(title, margin, cursorY);
        cursorY += 7;
      };

      const drawStepBox = (
        title: string,
        body: string,
        fill: [number, number, number],
        stroke: [number, number, number],
        textColor: [number, number, number],
      ) => {
        const titleWidth = 34;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        const titleLines = pdf.splitTextToSize(title, titleWidth);
        pdf.setFont('helvetica', 'normal');
        const bodyLines = pdf.splitTextToSize(body, contentWidth - titleWidth - 10);
        const lineHeight = 4.5;
        const boxHeight = Math.max(titleLines.length, bodyLines.length) * lineHeight + 8;
        ensureSpace(boxHeight + 2);
        pdf.setFillColor(...fill);
        pdf.setDrawColor(...stroke);
        pdf.roundedRect(margin, cursorY, contentWidth, boxHeight, 3, 3, 'FD');
        pdf.setTextColor(...textColor);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(titleLines, margin + 5, cursorY + 6);
        pdf.setFont('helvetica', 'normal');
        pdf.text(bodyLines, margin + titleWidth + 8, cursorY + 6);
        cursorY += boxHeight + 5;
      };

      const logoDataUrl = await loadImageAsJpeg('/adventurer-logo.png');
      if (logoDataUrl) {
        const logoSize = 18;
        pdf.addImage(logoDataUrl, 'JPEG', (pageWidth - logoSize) / 2, cursorY, logoSize, logoSize);
        cursorY += logoSize + 4;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(...primaryColor);
      pdf.text('Bassonia Adventurer Club', pageWidth / 2, cursorY, { align: 'center' });
      cursorY += 7;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(...mutedColor);
      pdf.text('Affiliated with the Seventh-day Adventist Church', pageWidth / 2, cursorY, { align: 'center' });
      cursorY += 8;

      pdf.setFillColor(...darkColor);
      pdf.roundedRect(margin + 28, cursorY - 1, contentWidth - 56, 9, 2, 2, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text('PARENTAL INDEMNITY & CODE OF CONDUCT AGREEMENT', pageWidth / 2, cursorY + 4.8, { align: 'center' });
      cursorY += 14;

      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 7;

      writeWrapped('This Parental Indemnity and Code of Conduct Agreement ("Agreement") is entered into between the Bassonia Adventurer Club ("the Club"), operating under the auspices of the Seventh-day Adventist Church, and the parent or legal guardian ("Parent/Guardian") of the child enrolled in the Club. By signing this Agreement, the Parent/Guardian acknowledges that they have read, understood, and agreed to all terms set out herein.', { fontSize: 11, color: darkColor, extraGap: 6 });
      drawSectionHeading('1. LIMITATION OF LIABILITY - INCIDENTS & INJURIES');
      writeWrapped('The Bassonia Adventurer Club, its directors, staff, volunteers, and the Seventh-day Adventist Church shall not be held liable for any injury, illness, accident, loss, damage, or incident that may occur to any child during Adventurer Club activities, meetings, outings, camps, or events.', { extraGap: 4 });
      writeWrapped('The Parent/Guardian acknowledges that children are energetic and playful by nature, and that minor accidents and incidents are an inherent part of group activities. The Club takes reasonable precautions to ensure a safe environment; however, the ultimate responsibility for the wellbeing, safety, and whereabouts of the child remains solely with the Parent/Guardian at all times.', { extraGap: 6 });
      drawSectionHeading('2. ROLE & RESPONSIBILITIES OF TEACHERS');
      writeWrapped('Adventurer Club teachers and leaders are educators and spiritual mentors. They are not babysitters, childminders, or surrogate parents and are not responsible for parental-level supervision beyond the scope of the structured activity in progress.', { extraGap: 4 });
      writeWrapped('Teachers and leaders are not authorised to administer parental discipline in any form, including physical punishment, emotional coercion, or any form of correction outside the club\'s standard verbal redirection policy.', { extraGap: 6 });
      drawSectionHeading('3. CODE OF CONDUCT & DEMERIT POLICY');
      writeWrapped('All children enrolled in the Bassonia Adventurer Club are expected to conduct themselves with respect, kindness, and cooperation toward fellow Adventurers, teachers, leaders, and all club property.', { extraGap: 4 });
      writeWrapped('Where a child engages in persistent misbehaviour, disruptive conduct, or actions contrary to the values of the Club, the following escalation procedure will apply:', { extraGap: 4 });
      drawStepBox('1st & 2nd Offence', 'The child will be verbally corrected by the teacher or leader. The incident will be logged and the parent/guardian will be notified.', [254, 252, 232], [250, 204, 21], [146, 64, 14]);
      drawStepBox('3rd Offence', 'A formal Demerit will be recorded on the child\'s Club profile. The parent/guardian will be contacted and required to acknowledge receipt.', [255, 247, 237], [251, 146, 60], [154, 52, 18]);
      drawStepBox('5 Demerits Accumulated', 'The child will be delisted from all Club camps and overnight events until the matter is reviewed by the Club Director and the parent/guardian in a formal meeting. Reinstatement is at the sole discretion of the Director.', [254, 242, 242], [248, 113, 113], [153, 27, 27]);
      writeWrapped('Demerits remain on the child\'s profile for the duration of the current Club year and are reviewed annually. Serious misconduct may result in immediate delisting without the three-offence escalation process.', { fontSize: 10, color: mutedColor, extraGap: 7 });
      drawSectionHeading('4. MEDICAL & EMERGENCY AUTHORISATION');
      writeWrapped('In the event of a medical emergency, the Club will make every reasonable effort to contact the Parent/Guardian immediately. Where contact cannot be made and emergency medical treatment is required, the Club is authorised by signing this Agreement to consent to emergency first aid and to request emergency medical services on behalf of the child.', { extraGap: 4 });
      writeWrapped('All costs associated with emergency medical treatment, transport, or hospitalisation remain the sole responsibility of the Parent/Guardian.', { extraGap: 6 });
      drawSectionHeading('5. ACKNOWLEDGEMENT & AGREEMENT');
      writeWrapped('By signing below, the Parent/Guardian confirms that they:', { extraGap: 3 });
      [
        'Have read and understood this Agreement in full.',
        'Agree to the limitation of liability set out in Clause 1.',
        'Understand and accept the role of teachers as described in Clause 2.',
        'Acknowledge and accept the Demerit and Code of Conduct policy in Clause 3.',
        'Authorise emergency medical action as described in Clause 4.',
        'Accept that this Agreement is binding for the duration of the child\'s enrolment in the Club.',
      ].forEach((item) => writeWrapped(`• ${item}`, { indent: 4, extraGap: 2 }));

      ensureSpace(28);
      pdf.setFillColor(249, 250, 251);
      pdf.setDrawColor(209, 213, 219);
      pdf.roundedRect(margin, cursorY, contentWidth, 20, 3, 3, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...mutedColor);
      pdf.text('CHILD DETAILS', margin + 4, cursorY + 5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(...darkColor);
      pdf.text(`Child's Full Name: ${exportChild.name}`, margin + 4, cursorY + 11);
      pdf.text(`Class: ${exportChild.class}`, margin + 4, cursorY + 16);
      cursorY += 28;

      ensureSpace(exportSignatureDataUrl ? 50 : 30);
      pdf.setDrawColor(209, 213, 219);
      pdf.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 6;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...mutedColor);
      pdf.text('SIGNATURE', margin, cursorY);
      cursorY += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(...darkColor);
      pdf.text(`Parent / Guardian Name: ${exportFullName || '-'}`, margin, cursorY);
      pdf.text(`Relationship: ${exportRelationship || '-'}`, margin + 95, cursorY);
      cursorY += 8;
      pdf.text(`Date Signed: ${exportSignedAt || '-'}`, margin, cursorY);
      pdf.text(`Status: ${exportChild.indemnitySigned ? 'Signed' : 'Not signed'}`, margin + 95, cursorY);
      cursorY += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...mutedColor);
      pdf.text('Digital Signature', margin, cursorY);
      cursorY += 3;
      pdf.setDrawColor(209, 213, 219);
      pdf.roundedRect(margin, cursorY, contentWidth, 26, 2, 2);

      if (exportSignatureDataUrl) {
        // Convert signature to JPEG via canvas to avoid jsPDF fast-png decode errors
        const sigJpeg = await loadImageAsJpeg(exportSignatureDataUrl);
        if (sigJpeg) {
          pdf.addImage(sigJpeg, 'JPEG', margin + 4, cursorY + 3, contentWidth - 8, 20, undefined, 'FAST');
        }
      } else {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(10);
        pdf.setTextColor(...mutedColor);
        pdf.text('No signed signature currently stored.', pageWidth / 2, cursorY + 15, { align: 'center' });
      }

      const childNameForFile = exportChild.name?.replace(/\s+/g, '_') || 'Child';
      pdf.save(`Indemnity_Form_${childNameForFile}.pdf`);
    } catch (err) {
      console.error('PDF generation failed', err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-400">Loading indemnity form...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500 mt-20">
        <p className="text-lg font-semibold">{error}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-[#1e3a5f] underline">Go back</button>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="p-6 text-center text-gray-400 mt-20">
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-lg font-semibold text-gray-600">Child not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-[#1e3a5f] underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e3a5f] mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Profile
      </button>

      {/* Title bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Indemnity Form</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bassonia Adventurer Club · {child.name}</p>
        </div>
        {isSigned && (
          <button
            onClick={handleDownloadPdf}
            disabled={generating}
            className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c] disabled:opacity-60 transition-colors"
          >
            {generating ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            )}
            {generating ? 'Generating…' : 'Download PDF'}
          </button>
        )}
      </div>

      {/* Signed banner */}
      {isSigned && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3 mb-6">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-700 font-medium">
            Signed by <strong>{fullName}</strong> ({relationship}) on {signedAt}
          </p>
        </div>
      )}

      {!isSigned && !canSignIndemnity && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M10.29 3.86l-7.12 12.3A2 2 0 004.88 19h14.24a2 2 0 001.71-2.84l-7.12-12.3a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-amber-800 font-medium">
            Only the child&apos;s parent or legal guardian can sign this indemnity form.
          </p>
        </div>
      )}

      {/* Document */}
      <div id="indemnity-document" className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-6">
        {/* Letterhead */}
        <div className="text-center mb-8 pb-6 border-b border-gray-200">
          <img src="/adventurer-logo.png" alt="Adventurer logo" className="w-16 h-16 object-contain mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[#1e3a5f] uppercase tracking-wide">Bassonia Adventurer Club</h2>
          <p className="text-sm text-gray-500 mt-1">Affiliated with the Seventh-day Adventist Church</p>
          <div className="mt-4 inline-flex min-h-10 items-center justify-center rounded bg-gray-800 px-6 py-0 text-center text-sm font-bold uppercase tracking-widest text-white leading-none">
            Parental Indemnity &amp; Code of Conduct Agreement
          </div>
        </div>

        {/* Preamble */}
        <div className="mb-6">
          <p className="text-sm text-gray-700 leading-relaxed">
            This Parental Indemnity and Code of Conduct Agreement (<strong>&quot;Agreement&quot;</strong>) is entered into between the
            <strong> Bassonia Adventurer Club</strong> (&quot;the Club&quot;), operating under the auspices of the Seventh-day Adventist Church,
            and the parent or legal guardian (<strong>&quot;Parent/Guardian&quot;</strong>) of the child enrolled in the Club. By signing
            this Agreement, the Parent/Guardian acknowledges that they have read, understood, and agreed to all terms set out herein.
          </p>
        </div>

        {/* Clause 1 */}
        <Section number="1" title="Limitation of Liability — Incidents &amp; Injuries">
          <p>
            The Bassonia Adventurer Club, its directors, staff, volunteers, and the Seventh-day Adventist Church shall not be held liable for any
            injury, illness, accident, loss, damage, or incident that may occur to any child during Adventurer Club activities, meetings,
            outings, camps, or events.
          </p>
          <p className="mt-2">
            The Parent/Guardian acknowledges that children are energetic and playful by nature, and that minor accidents and incidents
            are an inherent part of group activities. The Club takes reasonable precautions to ensure a safe environment; however,
            the <strong>ultimate responsibility for the wellbeing, safety, and whereabouts of the child remains solely with the
            Parent/Guardian</strong> at all times.
          </p>
          <p className="mt-2">
            Parents and guardians are expected to remain aware of their child&apos;s location during all Club activities and to ensure
            that their child is adequately supervised. The Club cannot and does not accept liability for incidents arising from a
            lack of parental supervision.
          </p>
        </Section>

        {/* Clause 2 */}
        <Section number="2" title="Role &amp; Responsibilities of Teachers">
          <p>
            Adventurer Club teachers and leaders are <strong>educators and spiritual mentors</strong> — they are present to teach
            the Adventurer curriculum, facilitate activities, and guide children in their spiritual and personal development.
          </p>
          <p className="mt-2">
            Teachers and leaders are <strong>not</strong> babysitters, childminders, or surrogate parents. They are not responsible
            for providing parental-level supervision or monitoring the physical whereabouts of individual children beyond the scope
            of the structured activity in progress.
          </p>
          <p className="mt-2">
            Teachers and leaders are expressly <strong>not authorised to administer parental discipline</strong> in any form,
            including but not limited to physical punishment, emotional coercion, or any form of correction that falls outside
            the club&apos;s standard verbal redirection policy.
          </p>
        </Section>

        {/* Clause 3 */}
        <Section number="3" title="Code of Conduct &amp; Demerit Policy">
          <p>
            All children enrolled in the Bassonia Adventurer Club are expected to conduct themselves with respect, kindness, and
            cooperation toward fellow Adventurers, teachers, leaders, and all club property.
          </p>
          <p className="mt-2">
            Where a child engages in persistent misbehaviour, disruptive conduct, or actions contrary to the values of the Club,
            the following escalation procedure will apply:
          </p>
          <ol className="mt-3 space-y-2 list-none">
            <Step number="1st &amp; 2nd Offence" color="yellow">
              The child will be verbally corrected by the teacher or leader. The incident will be logged and the parent/guardian
              will be notified.
            </Step>
            <Step number="3rd Offence" color="orange">
              A formal <strong>Demerit</strong> will be recorded on the child&apos;s Club profile. The parent/guardian will be
              contacted and required to acknowledge receipt.
            </Step>
            <Step number="5 Demerits Accumulated" color="red">
              The child will be <strong>delisted from all Club camps and overnight events</strong> until the matter is reviewed
              by the Club Director and the parent/guardian in a formal meeting. Reinstatement is at the sole discretion of the Director.
            </Step>
          </ol>
          <p className="mt-3 text-xs text-gray-500 italic">
            Demerits remain on the child&apos;s profile for the duration of the current Club year and are reviewed annually. Serious
            misconduct (physical harm, bullying, or destruction of property) may result in immediate delisting without the three-offence
            escalation process.
          </p>
        </Section>

        {/* Clause 4 */}
        <Section number="4" title="Medical &amp; Emergency Authorisation">
          <p>
            In the event of a medical emergency, the Club will make every reasonable effort to contact the Parent/Guardian immediately.
            Where contact cannot be made and emergency medical treatment is required, the Club is authorised by signing this Agreement
            to consent to emergency first aid and to request emergency medical services on behalf of the child.
          </p>
          <p className="mt-2">
            All costs associated with emergency medical treatment, transport, or hospitalisation remain the sole responsibility
            of the Parent/Guardian.
          </p>
        </Section>

        {/* Clause 5 */}
        <Section number="5" title="Acknowledgement &amp; Agreement">
          <p>
            By signing below, the Parent/Guardian confirms that they:
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-gray-700">
            <li>Have read and understood this Agreement in full.</li>
            <li>Agree to the limitation of liability set out in Clause 1.</li>
            <li>Understand and accept the role of teachers as described in Clause 2.</li>
            <li>Acknowledge and accept the Demerit and Code of Conduct policy in Clause 3.</li>
            <li>Authorise emergency medical action as described in Clause 4.</li>
            <li>Accept that this Agreement is binding for the duration of the child&apos;s enrolment in the Club.</li>
          </ul>
        </Section>

        {/* Child Details block */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Child Details</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Child&apos;s Full Name</span>
              <span className="font-medium">{child.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Class</span>
              <span className="font-medium">{child.class}</span>
            </div>
          </div>
        </div>

        {/* Signature block (only rendered inside doc when signed) */}
        {isSigned && (
          <div className="mt-8 pt-6 border-t border-gray-300">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-4">Signature</p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-400 mb-1">Parent / Guardian Name</p>
                <p className="text-sm font-semibold text-gray-800 border-b border-gray-300 pb-1">{fullName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Relationship</p>
                <p className="text-sm font-semibold text-gray-800 border-b border-gray-300 pb-1">{relationship}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-1">Digital Signature</p>
                <div className="border border-gray-300 rounded bg-white h-24 flex items-center justify-center overflow-hidden">
                  <SignaturePreview signatureDataUrl={signatureDataUrl} />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Date Signed</p>
                <p className="text-sm font-semibold text-gray-800 border-b border-gray-300 pb-1">{signedAt}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Signature Form — only show if not yet signed */}
      {!isSigned && canSignIndemnity && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-700 mb-4">Sign this Agreement</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Relationship to Child <span className="text-red-500">*</span></label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-white"
              >
                <option value="Parent">Parent</option>
                <option value="Legal Guardian">Legal Guardian</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Signature pad */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500 font-medium">
                Draw your signature below <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={clearSignature}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-lg overflow-hidden bg-gray-50 relative">
              <canvas
                ref={canvasRef}
                width={700}
                height={150}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              {!hasSigned && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-gray-300 text-sm select-none">Sign here with mouse or touch</p>
                </div>
              )}
            </div>

            {/* Save Signature button — appears once the parent has drawn */}
            {hasSigned && (
              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={handleSaveSignature}
                  disabled={savingSignature || signatureSaved}
                  className="flex items-center gap-2 bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {savingSignature ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Saving…
                    </>
                  ) : signatureSaved ? (
                    <>
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-700">Signature Saved</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save Signature
                    </>
                  )}
                </button>
                {!signatureSaved && (
                  <p className="text-xs text-amber-600">Save your signature before submitting so it is stored securely.</p>
                )}
              </div>
            )}
          </div>

          {/* Agreement checkbox */}
          <label className="flex items-start gap-3 mb-5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-[#1e3a5f]"
            />
            <span className="text-sm text-gray-600">
              I, <strong>{fullName || '[your name]'}</strong>, confirm that I have read and fully agree to the terms of this
              Parental Indemnity &amp; Code of Conduct Agreement on behalf of my child <strong>{child.name}</strong>.
            </span>
          </label>

          <button
            type="button"
            onClick={handleSign}
            disabled={!hasSigned || !agreed || !fullName.trim()}
            className="w-full bg-[#1e3a5f] text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Sign &amp; Submit Agreement
          </button>
          {(!hasSigned || !agreed || !fullName.trim()) && (
            <p className="text-xs text-gray-400 text-center mt-2">
              Please fill in your name, draw your signature, and check the agreement box to proceed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Helper: renders the signed canvas as a static image preview inside the document
function SignaturePreview({ signatureDataUrl }: { signatureDataUrl: string }) {
  if (!signatureDataUrl) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={signatureDataUrl} alt="Signature" className="max-h-20 object-contain" />;
}

// Helper components
function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide mb-2">
        {number}. {title}
      </h3>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  );
}

function Step({ number, color, children }: { number: string; color: 'yellow' | 'orange' | 'red'; children: React.ReactNode }) {
  const colors = {
    yellow: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    orange: 'bg-orange-50 border-orange-300 text-orange-800',
    red: 'bg-red-50 border-red-300 text-red-800',
  };
  return (
    <li className={`flex gap-3 p-3 rounded-lg border ${colors[color]}`}>
      <span className="font-bold text-xs flex-shrink-0 mt-0.5 min-w-[100px]" dangerouslySetInnerHTML={{ __html: number }} />
      <span className="text-xs leading-relaxed">{children}</span>
    </li>
  );
}
