'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface ProgressStatusProps {
  childId: number;
  itemsCompleted: number;
  itemsTotal: number;
  workCommencementDate?: string | null;
  workCompletionDate?: string | null;
}

interface AnalysisResult {
  status: 'ahead' | 'on-track' | 'behind';
  percentage_expected: number;
  percentage_actual: number;
  days_remaining: number;
  message: string;
}

export default function ProgressStatus({
  childId,
  itemsCompleted,
  itemsTotal,
  workCommencementDate,
  workCompletionDate,
}: ProgressStatusProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const analyzeProgress = async () => {
      if (!workCommencementDate || !workCompletionDate) {
        return;
      }

      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        const result = await apiFetch('/api/analyze-progress', {
          method: 'POST',
          body: JSON.stringify({
            items_completed: itemsCompleted,
            items_total: itemsTotal,
            commencement_date: workCommencementDate,
            completion_date: workCompletionDate,
            current_date: today,
          }),
        });

        if (result && typeof result === 'object') {
          setAnalysis(result as AnalysisResult);
        }
      } catch (err) {
        // Silent fail - progress status is not critical
        console.error('Failed to analyze progress:', err);
      } finally {
        setLoading(false);
      }
    };

    void analyzeProgress();
  }, [childId, itemsCompleted, itemsTotal, workCommencementDate, workCompletionDate]);

  if (!analysis) {
    return null;
  }

  const statusConfig = {
    ahead: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      badge: 'bg-green-500',
      label: '🚀 Ahead',
    },
    'on-track': {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      badge: 'bg-blue-500',
      label: '✓ On Track',
    },
    behind: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      badge: 'bg-orange-500',
      label: '⚠ Behind',
    },
  };

  const config = statusConfig[analysis.status];

  return (
    <div className={`rounded-lg p-3 ${config.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${config.text}`}>{config.label}</span>
        <span className={`text-xs font-semibold text-white px-2 py-1 rounded-full ${config.badge}`}>
          {analysis.percentage_actual.toFixed(0)}%
        </span>
      </div>
      <p className={`text-xs ${config.text}`}>{analysis.message}</p>
      {analysis.days_remaining > 0 && (
        <p className={`text-xs ${config.text} mt-1`}>
          {analysis.days_remaining} days remaining
        </p>
      )}
    </div>
  );
}
