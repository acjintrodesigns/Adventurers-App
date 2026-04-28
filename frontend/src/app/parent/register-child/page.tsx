'use client';

import { useState } from 'react';

const adventurerClasses = [
  { id: 'little-lamb', name: 'Little Lamb', ageRange: '6 years', color: 'bg-pink-100 border-pink-300 text-pink-700' },
  { id: 'early-bird', name: 'Early Bird', ageRange: '6–7 years', color: 'bg-orange-100 border-orange-300 text-orange-700' },
  { id: 'busy-bee', name: 'Busy Bee', ageRange: '7 years', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { id: 'sunbeam', name: 'Sunbeam', ageRange: '7–8 years', color: 'bg-amber-100 border-amber-300 text-amber-700' },
  { id: 'builder', name: 'Builder', ageRange: '8–9 years', color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { id: 'helping-hand', name: 'Helping Hand', ageRange: '9 years', color: 'bg-green-100 border-green-300 text-green-700' },
];

export default function RegisterChildPage() {
  const [form, setForm] = useState({
    childName: '',
    dob: '',
    medicalAidName: '',
    medicalAidNumber: '',
    selectedClass: '',
    photoFile: null as File | null,
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, photoFile: file }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center mt-20">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-[#1e3a5f] mb-2">Registration Submitted!</h2>
        <p className="text-gray-500">Your child's registration is pending approval by the Director.</p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-6 bg-[#1e3a5f] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]"
        >
          Register Another Child
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Register My Child</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Child Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Child Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Child&apos;s Full Name</label>
              <input
                type="text"
                name="childName"
                required
                value={form.childName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                name="dob"
                required
                value={form.dob}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
              <div className="flex items-center gap-4">
                {form.photoFile && (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl">
                    📷
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhoto}
                  className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#1e3a5f] file:text-white file:text-sm file:cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Medical Aid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Medical Aid Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medical Aid Name</label>
              <input
                type="text"
                name="medicalAidName"
                value={form.medicalAidName}
                onChange={handleChange}
                placeholder="e.g. Discovery, Momentum"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member Number</label>
              <input
                type="text"
                name="medicalAidNumber"
                value={form.medicalAidNumber}
                onChange={handleChange}
                placeholder="Optional"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
          </div>
        </div>

        {/* Class Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Select Class</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {adventurerClasses.map((cls) => (
              <button
                type="button"
                key={cls.id}
                onClick={() => setForm((prev) => ({ ...prev, selectedClass: cls.id }))}
                className={`border-2 rounded-xl p-4 text-center transition-all ${cls.color} ${
                  form.selectedClass === cls.id ? 'ring-2 ring-[#1e3a5f] ring-offset-1' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-lg font-bold mx-auto mb-2 shadow-sm">
                  {cls.name.charAt(0)}
                </div>
                <p className="text-sm font-semibold">{cls.name}</p>
                <p className="text-xs opacity-70">{cls.ageRange}</p>
              </button>
            ))}
          </div>
          {!form.selectedClass && (
            <p className="text-xs text-red-500 mt-2">Please select a class</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!form.selectedClass}
          className="w-full bg-[#1e3a5f] text-white py-3 rounded-xl font-semibold hover:bg-[#2a4f7c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Registration
        </button>
      </form>
    </div>
  );
}
