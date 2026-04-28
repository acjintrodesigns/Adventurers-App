'use client';

import { useState } from 'react';

interface Requirement {
  id: string;
  label: string;
  completed: boolean;
  proof?: string;
}

interface Child {
  id: string;
  name: string;
  class: string;
  requirements: Requirement[];
}

const categories = ['My God', 'My Self', 'My Family', 'My World'];

const initialChildren: Child[] = [
  {
    id: '1',
    name: 'Amara Dlamini',
    class: 'Busy Bee',
    requirements: [
      { id: 'b1', label: 'Basic Requirement 1 – Memory verse', completed: true },
      { id: 'b2', label: 'Basic Requirement 2 – Attendance', completed: true },
      { id: 'mg1', label: 'My God – Unit 1', completed: false },
      { id: 'mg2', label: 'My God – Unit 2', completed: false },
      { id: 'ms1', label: 'My Self – Healthy Habits', completed: true },
      { id: 'ms2', label: 'My Self – Exercise', completed: false },
      { id: 'mf1', label: 'My Family – Family Tree', completed: true },
      { id: 'mf2', label: 'My Family – Chores', completed: false },
      { id: 'mw1', label: 'My World – Nature Walk', completed: true },
      { id: 'mw2', label: 'My World – Community Service', completed: false },
    ],
  },
  {
    id: '2',
    name: 'Ethan Botha',
    class: 'Busy Bee',
    requirements: [
      { id: 'b1', label: 'Basic Requirement 1 – Memory verse', completed: true },
      { id: 'b2', label: 'Basic Requirement 2 – Attendance', completed: false },
      { id: 'mg1', label: 'My God – Unit 1', completed: true },
      { id: 'mg2', label: 'My God – Unit 2', completed: true },
      { id: 'ms1', label: 'My Self – Healthy Habits', completed: false },
      { id: 'ms2', label: 'My Self – Exercise', completed: true },
      { id: 'mf1', label: 'My Family – Family Tree', completed: true },
      { id: 'mf2', label: 'My Family – Chores', completed: true },
      { id: 'mw1', label: 'My World – Nature Walk', completed: true },
      { id: 'mw2', label: 'My World – Community Service', completed: true },
    ],
  },
];

export default function TeacherProgressPage() {
  const [children, setChildren] = useState<Child[]>(initialChildren);
  const [selected, setSelected] = useState<Child>(initialChildren[0]);

  const toggleRequirement = (childId: string, reqId: string) => {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id !== childId) return c;
        return {
          ...c,
          requirements: c.requirements.map((r) =>
            r.id === reqId ? { ...r, completed: !r.completed } : r
          ),
        };
      })
    );
    setSelected((prev) => ({
      ...prev,
      requirements: prev.requirements.map((r) =>
        r.id === reqId ? { ...r, completed: !r.completed } : r
      ),
    }));
  };

  const completedCount = (child: Child) => child.requirements.filter((r) => r.completed).length;
  const progressPct = (child: Child) => Math.round((completedCount(child) / child.requirements.length) * 100);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Curriculum Progress</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Children list */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">My Students</h2>
            </div>
            {children.map((child) => (
              <div
                key={child.id}
                className={`px-5 py-4 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected.id === child.id ? 'bg-blue-50' : ''}`}
                onClick={() => setSelected(child)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{child.name}</p>
                    <p className="text-xs text-gray-400">{child.class}</p>
                  </div>
                  <span className="text-sm font-bold text-[#1e3a5f]">{progressPct(child)}%</span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-[#1e3a5f] h-1.5 rounded-full transition-all"
                    style={{ width: `${progressPct(child)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-800">{selected.name}</h2>
                <p className="text-xs text-gray-400">{selected.class} · {completedCount(selected)}/{selected.requirements.length} completed</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-[#1e3a5f]">{progressPct(selected)}%</span>
              </div>
            </div>

            <div className="bg-gray-200 rounded-full h-2 mb-6">
              <div
                className="bg-[#1e3a5f] h-2 rounded-full transition-all"
                style={{ width: `${progressPct(selected)}%` }}
              />
            </div>

            <div className="space-y-2">
              {selected.requirements.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleRequirement(selected.id, req.id)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        req.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {req.completed && <span className="text-xs">✓</span>}
                    </button>
                    <span className={`text-sm ${req.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {req.label}
                    </span>
                  </div>
                  {!req.completed && (
                    <label className="text-xs text-[#1e3a5f] cursor-pointer hover:underline">
                      <input type="file" className="hidden" accept="image/*" />
                      Upload proof
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
