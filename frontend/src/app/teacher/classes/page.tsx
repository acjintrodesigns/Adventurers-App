'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const classMeta: Record<string, { ageRange: string; color: string }> = {
  'Little Lamb': { ageRange: '6 years', color: 'bg-pink-100 text-pink-700' },
  'Early Bird': { ageRange: '6-7 years', color: 'bg-orange-100 text-orange-700' },
  'Busy Bee': { ageRange: '7 years', color: 'bg-yellow-100 text-yellow-700' },
  Sunbeam: { ageRange: '7-8 years', color: 'bg-amber-100 text-amber-700' },
  Builder: { ageRange: '8-9 years', color: 'bg-blue-100 text-blue-700' },
  'Helping Hand': { ageRange: '9 years', color: 'bg-green-100 text-green-700' },
};

interface ChildSummary {
  id: number;
  class: string;
}

export default function TeacherClassesPage() {
  const [assignedClass, setAssignedClass] = useState('');
  const [childrenCount, setChildrenCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const classData = await apiFetch('/api/teachers/my-class') as { assignedClass?: string | null };
        const cls = classData.assignedClass ?? '';
        setAssignedClass(cls);

        if (cls) {
          const children = await apiFetch('/api/children') as ChildSummary[];
          setChildrenCount(children.filter((c) => c.class === cls).length);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const meta = classMeta[assignedClass] ?? { ageRange: 'Assigned class', color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Classes</h1>

      {loading && <p className="text-sm text-gray-500">Loading class assignment...</p>}

      {!loading && !assignedClass && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-900 text-sm">
          No class assigned yet. Ask the Director to assign your class before teaching actions can begin.
        </div>
      )}

      {!loading && assignedClass && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-4 ${meta.color}`}>
              {meta.ageRange}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">{assignedClass}</h3>
            <p className="text-sm text-gray-500 mb-4">You are the teacher for this class</p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-[#1e3a5f]">{childrenCount}</p>
                <p className="text-xs text-gray-500">Children</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">1</p>
                <p className="text-xs text-gray-500">Assigned Class</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
