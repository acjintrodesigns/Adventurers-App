'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface Child {
  id: string | number;
  name: string;
  dateOfBirth: string;
  class: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  adventurerCode?: string | null;
  photoUrl?: string | null;
  medicalAidInfo?: {
    medicalAidName?: string;
    medicalAidNumber?: string;
  };
}

export default function MyChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [editingChild, setEditingChild] = useState<Child | null>(null);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        setLoading(true);
        const response = await apiFetch('/api/children');
        setChildren(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load children');
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, []);

  const getAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getClassColor = (childClass: string) => {
    const classColors: Record<string, string> = {
      'Little Lamb': 'bg-pink-100 text-pink-800',
      'Early Bird': 'bg-orange-100 text-orange-800',
      'Busy Bee': 'bg-yellow-100 text-yellow-800',
      Sunbeam: 'bg-amber-100 text-amber-800',
      Builder: 'bg-blue-100 text-blue-800',
      'Helping Hand': 'bg-purple-100 text-purple-800',
    };
    return classColors[childClass] || 'bg-gray-100 text-gray-800';
  };

  const getChildIdPreview = (id: string | number) => {
    const asString = String(id ?? '');
    return asString.length > 8 ? asString.substring(0, 8) : asString;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading children...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">My Children</h1>
          <p className="text-gray-600">View and manage your registered children</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="mb-6">
          <Link
            href="/parent/register-child"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1e3a5f] text-white font-semibold rounded-lg hover:bg-[#2a4f7c] transition-colors"
          >
            + Register New Child
          </Link>
        </div>

        {children.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">No children registered yet.</p>
            <Link
              href="/parent/register-child"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1e3a5f] text-white font-semibold rounded-lg hover:bg-[#2a4f7c] transition-colors"
            >
              + Register Your First Child
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <div
                key={child.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                onClick={() => setSelectedChild(child)}
              >
                <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a5f8f] px-6 py-4 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 overflow-hidden flex items-center justify-center text-sm font-bold">
                      {child.photoUrl ? (
                        <img src={child.photoUrl} alt={child.name} className="w-full h-full object-cover" />
                      ) : (
                        child.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold truncate">{child.name}</h3>
                      <p className="text-xs text-blue-200">ID: {getChildIdPreview(child.id)}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1e3a5f] bg-blue-100 px-2 py-1 rounded">AGE</span>
                      <div>
                        <p className="text-xs text-gray-500">Age</p>
                        <p className="text-lg font-semibold text-[#1e3a5f]">
                          {getAge(child.dateOfBirth)} years
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1e3a5f] bg-blue-100 px-2 py-1 rounded">CLASS</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Class</p>
                      <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${getClassColor(child.class)}`}>
                        {child.class}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1e3a5f] bg-blue-100 px-2 py-1 rounded">CODE</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Adventurer Code</p>
                      <p className="text-sm font-semibold text-[#1e3a5f]">{child.adventurerCode ?? 'Pending assignment'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1e3a5f] bg-blue-100 px-2 py-1 rounded">STATUS</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Status</p>
                      <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(child.status)}`}>
                        {child.status}
                      </span>
                    </div>
                  </div>

                  {child.medicalAidInfo?.medicalAidName && (
                    <div className="pt-3 border-t border-gray-200 text-xs text-gray-600">
                      <p className="font-semibold text-gray-700">Medical Aid</p>
                      <p>{child.medicalAidInfo.medicalAidName}</p>
                      {child.medicalAidInfo.medicalAidNumber && (
                        <p className="text-gray-500">Ref: {child.medicalAidInfo.medicalAidNumber}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingChild(child);
                    }}
                    className="flex-1 px-3 py-2 text-xs font-semibold text-[#1e3a5f] bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedChild(child);
                    }}
                    className="flex-1 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedChild && !editingChild && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a5f8f] px-6 py-4 text-white flex justify-between items-center sticky top-0">
                <h2 className="text-2xl font-bold">{selectedChild.name}</h2>
                <button
                  onClick={() => setSelectedChild(null)}
                  className="text-sm font-semibold px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="px-6 py-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-[#1e3a5f] mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
                      <p className="text-lg font-semibold text-[#1e3a5f]">
                        {new Date(selectedChild.dateOfBirth).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Age</p>
                      <p className="text-lg font-semibold text-[#1e3a5f]">
                        {getAge(selectedChild.dateOfBirth)} years
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Class</p>
                      <p className="text-lg font-semibold text-[#1e3a5f]">{selectedChild.class}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedChild.status)}`}>
                        {selectedChild.status}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Adventurer Code</p>
                      <p className="text-lg font-semibold text-[#1e3a5f]">{selectedChild.adventurerCode ?? 'Pending assignment'}</p>
                    </div>
                  </div>
                </div>

                {selectedChild.medicalAidInfo && (
                  <div>
                    <h3 className="text-lg font-bold text-[#1e3a5f] mb-4">Medical Information</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {selectedChild.medicalAidInfo.medicalAidName && (
                        <div>
                          <p className="text-xs text-gray-500">Medical Aid Name</p>
                          <p className="font-semibold text-[#1e3a5f]">{selectedChild.medicalAidInfo.medicalAidName}</p>
                        </div>
                      )}
                      {selectedChild.medicalAidInfo.medicalAidNumber && (
                        <div>
                          <p className="text-xs text-gray-500">Medical Aid Number</p>
                          <p className="font-semibold text-[#1e3a5f]">{selectedChild.medicalAidInfo.medicalAidNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setEditingChild(selectedChild);
                      setSelectedChild(null);
                    }}
                    className="flex-1 px-4 py-3 bg-[#1e3a5f] text-white font-semibold rounded-lg hover:bg-[#2a4f7c] transition-colors"
                  >
                    Edit Information
                  </button>
                  <button
                    onClick={() => setSelectedChild(null)}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingChild && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a5f8f] px-6 py-4 text-white flex justify-between items-center">
                <h2 className="text-2xl font-bold">Edit {editingChild.name}</h2>
                <button
                  onClick={() => setEditingChild(null)}
                  className="text-sm font-semibold px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Close
                </button>
              </div>
              <div className="px-6 py-6">
                <p className="text-gray-600 mb-6">Edit functionality coming soon. You can update child information through the registration form.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingChild(null)}
                    className="flex-1 px-4 py-3 bg-[#1e3a5f] text-white font-semibold rounded-lg hover:bg-[#2a4f7c] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

