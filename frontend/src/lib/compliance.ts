export interface ComplianceIssue {
  type: 'form' | 'information' | 'discipline';
  message: string;
}

export interface DemeritRecordSummary {
  id: number;
  childId: number;
  status: string;
  reason: string;
  consequence: string;
  remedy: string;
  submittedAt: string;
  approvedAt?: string;
  effectiveFrom?: string;
  expiresAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  stopRequestedAt?: string;
  stopReason?: string;
  stoppedAt?: string;
  deleteRequestedAt?: string;
  deleteReason?: string;
  deletedAt?: string;
  expiredAt?: string;
  submittedByTeacherName?: string;
  approvedByDirectorName?: string;
}

export interface ApiChild {
  id: number;
  name: string;
  dateOfBirth: string;
  createdAt?: string;
  class: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  adventurerCode?: string;
  photoUrl?: string;
  medicalAidInfo?: string;
  parentName?: string;
  parentId: number;
  parentPhone?: string;
  parentAddress?: string;
  parentRelationship?: string;
  parentEmail?: string;
  parentEmergencyContactName?: string;
  parentEmergencyContactPhone?: string;
  parentSecondaryGuardianJson?: string;
  indemnitySigned?: boolean;
  indemnitySignedAt?: string;
  indemnitySignedByName?: string;
  indemnitySignerRelationship?: string;
  indemnitySignatureDataUrl?: string;
  demeritCount?: number;
  isDelistedFromCamps?: boolean;
  pendingDemeritCount?: number;
  activeDemerits?: DemeritRecordSummary[];
  demeritHistory?: DemeritRecordSummary[];
  complianceIssues?: string[];
}

export function deriveComplianceIssues(child: ApiChild): ComplianceIssue[] {
  if (Array.isArray(child.complianceIssues) && child.complianceIssues.length > 0) {
    return child.complianceIssues.map((message) => ({
      type: classifyIssueType(message),
      message,
    }));
  }

  const issues: ComplianceIssue[] = [];
  if (!child.indemnitySigned) {
    issues.push({ type: 'form', message: 'Indemnity form has not been signed.' });
  }

  if (!child.medicalAidInfo || child.medicalAidInfo.trim().toLowerCase() === 'none') {
    issues.push({ type: 'information', message: 'Medical aid information is missing or incomplete.' });
  }

  if ((child.demeritCount ?? 0) >= 5 || child.isDelistedFromCamps) {
    issues.push({ type: 'discipline', message: 'Child is delisted from camps due to demerit threshold.' });
  }

  return issues;
}

function classifyIssueType(message: string): ComplianceIssue['type'] {
  const normalized = message.toLowerCase();
  if (normalized.includes('demerit') || normalized.includes('delisted') || normalized.includes('discipline')) {
    return 'discipline';
  }
  if (normalized.includes('form') || normalized.includes('document') || normalized.includes('indemnity')) {
    return 'form';
  }
  return 'information';
}
