'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface BookWorkProgressItem {
  id: number;
  childId: number;
  category: string;
  requirementName: string;
  isCompleted: boolean;
  proofImageUrl?: string | null;
}

interface HonorProgressItem {
  id: number;
  childId: number;
  category: string;
  honorName: string;
  isCompleted: boolean;
  proofImageUrl?: string | null;
}

interface ChildProgressViewProps {
  childId: number;
  childClass: string;
  activeTab: 'checklist' | 'honors';
}

function getProofImages(proof?: string | null) {
  if (!proof) {
    return [];
  }

  try {
    const parsed = JSON.parse(proof);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
  } catch {
    return [proof];
  }

  return [proof];
}

export default function ChildProgressView({ childId, childClass, activeTab }: ChildProgressViewProps) {
  const [bookWork, setBookWork] = useState<BookWorkProgressItem[]>([]);
  const [honors, setHonors] = useState<HonorProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProgress = async () => {
      try {
        setLoading(true);
        setError('');
        const [bookData, honorsData] = await Promise.all([
          apiFetch(`/api/progress/book-work/${childId}`) as Promise<BookWorkProgressItem[]>,
          apiFetch(`/api/progress/honors/${childId}`) as Promise<HonorProgressItem[]>,
        ]);
        setBookWork(Array.isArray(bookData) ? bookData : []);
        setHonors(Array.isArray(honorsData) ? honorsData : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load progress.');
      } finally {
        setLoading(false);
      }
    };

    void loadProgress();
  }, [childId]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading progress...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (activeTab === 'checklist') {
    const completedCount = bookWork.filter((item) => item.isCompleted).length;
    const totalCount = bookWork.length;

    return (
      <div className="space-y-3">
        <div className="mb-3">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            Progress: {completedCount}/{totalCount}
          </p>
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {bookWork.map((item) => {
          const proofImages = getProofImages(item.proofImageUrl);
          return (
            <div key={item.id} className="p-2 rounded border border-gray-200 bg-gray-50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className={`text-sm font-medium ${item.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.requirementName}
                  </p>
                  <p className="text-xs text-gray-400">{item.category}</p>
                </div>
                {item.isCompleted && (
                  <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">
                    ✓ Done
                  </span>
                )}
              </div>

              {proofImages.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {proofImages.map((image, index) => (
                    <button
                      key={`${item.id}:${index}`}
                      type="button"
                      title="View proof"
                      className="relative h-12 w-12 overflow-hidden rounded border border-gray-300 hover:border-blue-500"
                      onClick={() => window.open(image, '_blank')}
                    >
                      <img src={image} alt="Proof" className="h-full w-full object-cover" />
                      <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1 text-[10px] text-white">👁</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {totalCount === 0 && (
          <p className="text-sm text-gray-500 italic">No checklist items for this class yet.</p>
        )}
      </div>
    );
  }

  if (activeTab === 'honors') {
    const completedCount = honors.filter((item) => item.isCompleted).length;
    const totalCount = honors.length;

    return (
      <div className="space-y-3">
        <div className="mb-3">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            Honors: {completedCount}/{totalCount}
          </p>
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {honors.map((item) => {
          const proofImages = getProofImages(item.proofImageUrl);
          return (
            <div key={item.id} className="p-2 rounded border border-gray-200 bg-gray-50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className={`text-sm font-medium ${item.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.honorName}
                  </p>
                  <p className="text-xs text-gray-400">{item.category}</p>
                </div>
                {item.isCompleted && (
                  <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">
                    ✓ Done
                  </span>
                )}
              </div>

              {proofImages.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {proofImages.map((image, index) => (
                    <button
                      key={`${item.id}:${index}`}
                      type="button"
                      title="View proof"
                      className="relative h-12 w-12 overflow-hidden rounded border border-gray-300 hover:border-blue-500"
                      onClick={() => window.open(image, '_blank')}
                    >
                      <img src={image} alt="Proof" className="h-full w-full object-cover" />
                      <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1 text-[10px] text-white">👁</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {totalCount === 0 && (
          <p className="text-sm text-gray-500 italic">No honors for this class yet.</p>
        )}
      </div>
    );
  }

  return null;
}
