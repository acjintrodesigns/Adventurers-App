'use client';

import { useState } from 'react';
import Link from 'next/link';

const GOAL = 50000;
const RAISED = 18750;

export default function DonationsPage() {
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const percent = Math.round((RAISED / GOAL) * 100);
  const remaining = GOAL - RAISED;

  const handleDonate = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2a5f8f] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-[#1e3a5f] font-bold text-2xl mx-auto mb-3">
            A
          </div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Support Our Club</h1>
          <p className="text-gray-500 text-sm mt-1">Help us grow the Adventurers ministry</p>
        </div>

        {/* Goal Progress */}
        <div className="bg-gray-50 rounded-xl p-5 mb-6">
          <div className="flex justify-between text-sm font-medium text-gray-600 mb-2">
            <span>Raised: <span className="text-green-600 font-bold">R{RAISED.toLocaleString()}</span></span>
            <span>Goal: <span className="text-[#1e3a5f] font-bold">R{GOAL.toLocaleString()}</span></span>
          </div>
          <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-yellow-400 h-4 rounded-full transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{percent}% reached</span>
            <span>R{remaining.toLocaleString()} remaining</span>
          </div>
        </div>

        {submitted ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">🙏</div>
            <h2 className="text-xl font-bold text-[#1e3a5f]">Thank You!</h2>
            <p className="text-gray-500 text-sm mt-1">Your donation makes a difference.</p>
            <button
              onClick={() => { setSubmitted(false); setAmount(''); setName(''); }}
              className="mt-4 text-sm text-[#1e3a5f] underline"
            >
              Donate again
            </button>
          </div>
        ) : (
          <form onSubmit={handleDonate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Anonymous"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Amount (R)</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[50, 100, 200, 500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(String(val))}
                    className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      amount === String(val)
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'border-gray-300 text-gray-600 hover:border-[#1e3a5f]'
                    }`}
                  >
                    R{val}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Custom amount"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>

            <button
              type="submit"
              disabled={!amount}
              className="w-full bg-yellow-400 text-[#1e3a5f] py-3 rounded-xl font-bold text-base hover:bg-yellow-300 transition-colors disabled:opacity-50"
            >
              Donate R{amount || '0'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          <Link href="/login" className="underline">Sign in</Link> to manage donations
        </p>
      </div>
    </div>
  );
}
