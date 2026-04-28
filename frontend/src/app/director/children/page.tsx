'use client';

import { useState } from 'react';

interface Child {
  id: string;
  name: string;
  dob: string;
  class: string;
  medicalAid: string;
  parentName: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

const initialChildren: Child[] = [
  { id: '1', name: 'Amara Dlamini', dob: '2019-03-12', class: 'Busy Bee', medicalAid: 'Discovery', parentName: 'Sipho Dlamini', status: 'Pending' },
  { id: '2', name: 'Ethan Botha', dob: '2018-11-05', class: 'Sunbeam', medicalAid: 'Momentum', parentName: 'Johann Botha', status: 'Approved' },
  { id: '3', name: 'Lila Nkosi', dob: '2020-01-20', class: 'Little Lamb', medicalAid: 'None', parentName: 'Thandi Nkosi', status: 'Approved' },
  { id: '4', name: 'James Patel', dob: '2018-07-08', class: 'Builder', medicalAid: 'Medshield', parentName: 'Ravi Patel', status: 'Rejected' },
  { id: '5', name: 'Sofia van der Berg', dob: '2019-09-14', class: 'Early Bird', medicalAid: 'Bonitas', parentName: 'Mia van der Berg', status: 'Pending' },
];

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
};

export default function DirectorChildrenPage() {
  const [children, setChildren] = useState<Child[]>(initialChildren);
  const [selected, setSelected] = useState<Child | null>(null);

  const updateStatus = (id: string, status: Child['status']) => {
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Children Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-700">All Children ({children.length})</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {children.map((child) => (
                <div
                  key={child.id}
                  className={`flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === child.id ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelected(child)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-sm">
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{child.name}</p>
                      <p className="text-xs text-gray-400">{child.class} · {child.parentName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[child.status]}`}>
                      {child.status}
                    </span>
                    {child.status === 'Pending' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(child.id, 'Approved'); }}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(child.id, 'Rejected'); }}
                          className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail View */}
        <div>
          {selected ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col items-center mb-5">
                <div className="w-20 h-20 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-3xl mb-3">
                  {selected.name.charAt(0)}
                </div>
                <h3 className="text-lg font-bold text-gray-800">{selected.name}</h3>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full mt-1 ${statusColors[selected.status]}`}>
                  {selected.status}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Date of Birth</span>
                  <span className="font-medium">{selected.dob}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Class</span>
                  <span className="font-medium">{selected.class}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Medical Aid</span>
                  <span className="font-medium">{selected.medicalAid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Parent</span>
                  <span className="font-medium">{selected.parentName}</span>
                </div>
              </div>

              {selected.status === 'Pending' && (
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => updateStatus(selected.id, 'Approved')}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(selected.id, 'Rejected')}
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-400">
              <p className="text-4xl mb-2">👆</p>
              <p className="text-sm">Select a child to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
