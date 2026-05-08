'use client';

import { useState } from 'react';
import ChildProgressView from './ChildProgressView';
import ProgressStatus from './ProgressStatus';
import type { ApiChild } from '@/lib/compliance';

interface ChildCardProps {
  child: ApiChild;
  paymentSettings: {
    workCommencementDate?: string | null;
    workCompletionDate?: string | null;
  } | null;
}

type TabType = 'info' | 'checklist' | 'honors';

export default function ChildCard({ child, paymentSettings }: ChildCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const getInitials = () => {
    return child.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const hasPhoto = child.photoUrl && child.photoUrl.trim().length > 0;

  return (
    <div id={`child-${child.id}`} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden scroll-mt-24">
      {/* Card Header (always visible) */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {hasPhoto ? (
              <img
                src={child.photoUrl}
                alt={child.name}
                className="h-12 w-12 rounded-full object-cover border border-gray-300"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {getInitials()}
              </div>
            )}
          </div>

          {/* Child Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 truncate">{child.name}</h3>
            <p className="text-xs text-gray-500">{child.class}</p>
            <div className="mt-1 flex gap-2 flex-wrap">
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                ID: {child.id}
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                Age: {new Date().getFullYear() - new Date(child.dateOfBirth).getFullYear()}
              </span>
            </div>
          </div>

          {/* Expand Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 p-1 text-gray-600 hover:text-gray-900 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <span className={`text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50">
          {/* Status Bar with Progress Analysis */}
          <div className="px-4 pt-3 pb-2">
            <ProgressStatus
              childId={child.id}
              itemsCompleted={0}
              itemsTotal={0}
              workCommencementDate={paymentSettings?.workCommencementDate}
              workCompletionDate={paymentSettings?.workCompletionDate}
            />
          </div>

          {/* Tabs */}
          <div className="px-4 py-2 flex gap-1 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'info'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'checklist'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              Checklist
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('honors')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'honors'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              Honors
            </button>
          </div>

          {/* Tab Content */}
          <div className="px-4 py-3 max-h-96 overflow-y-auto">
            {activeTab === 'info' && (
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-gray-600">Full Name</p>
                  <p className="text-sm text-gray-800">{child.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Class</p>
                  <p className="text-sm text-gray-800">{child.class}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Date of Birth</p>
                  <p className="text-sm text-gray-800">{formatDate(child.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Adventurer Code</p>
                  <p className="text-sm font-mono text-gray-800">{child.adventurerCode || 'Pending'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600">Status</p>
                  <span className={`inline-flex text-xs font-semibold px-2 py-1 rounded-full ${
                    child.status === 'Approved'
                      ? 'bg-green-100 text-green-800'
                      : child.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {child.status}
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'checklist' && (
              <ChildProgressView childId={child.id} childClass={child.class} activeTab="checklist" />
            )}

            {activeTab === 'honors' && (
              <ChildProgressView childId={child.id} childClass={child.class} activeTab="honors" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
