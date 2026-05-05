'use client';

import Link from 'next/link';

const GOAL = 50000;
const RAISED = 18750;

export default function DonationsPage() {
  const percent = Math.round((RAISED / GOAL) * 100);
  const remaining = GOAL - RAISED;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2a5f8f] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <img src="/logo.png" alt="Bassonia Adventurer Club Logo" className="w-24 h-auto mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Support Our Club</h1>
          <p className="text-gray-500 text-sm mt-1">Help us grow the Bassonia Adventurer Club ministry</p>
        </div>

        {/* Goal Progress */}
        <div className="bg-gray-50 rounded-xl p-5">
          <div className="flex justify-between text-sm font-medium text-gray-600 mb-2">
            <span>Raised: <span className="text-green-600 font-bold">R{RAISED.toLocaleString()}</span></span>
            <span>Goal: <span className="text-[#1e3a5f] font-bold">R{GOAL.toLocaleString()}</span></span>
          </div>
          <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
            <div className="bg-yellow-400 h-4 rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{percent}% reached</span>
            <span>R{remaining.toLocaleString()} remaining</span>
          </div>
        </div>

        {/* Online donation CTA */}
        <div className="bg-[#eef4fb] rounded-xl p-5 text-center border border-[#c9ddef]">
          <p className="text-sm font-semibold text-[#1e3a5f] mb-1">Donate Online via PayFast</p>
          <p className="text-xs text-gray-500 mb-4">
            Register or sign in as a Donor to donate to a specific event or give a general donation.
            You will receive an official receipt with an authenticity code.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[#274a74] text-center"
            >
              Sign In as Donor
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-[#1e3a5f] text-[#1e3a5f] text-sm font-semibold px-5 py-2.5 hover:bg-[#eef4fb] text-center"
            >
              Register as Donor
            </Link>
          </div>
        </div>

        {/* EFT bank details */}
        <div className="rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Donate via EFT / Bank Transfer</p>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span className="text-gray-500">Account Name</span>
              <span className="font-semibold text-gray-800">Bassonia Adventurer Club</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Bank</span>
              <span className="font-semibold text-gray-800">Please contact the director</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reference</span>
              <span className="font-semibold text-gray-800">DONATION – Your Name</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Please email proof of payment to the club administrator after transfer.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400">
          <Link href="/login" className="underline">Sign in</Link> to manage your donations and download receipts.
        </p>
      </div>
    </div>
  );
}
