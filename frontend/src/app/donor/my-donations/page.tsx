'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Donation {
  id: number;
  amount: number;
  type: string;
  status: string;
  reference: string;
  eventName?: string | null;
  isAnonymous: boolean;
  receiptCode?: string | null;
  createdAt: string;
}

function ReceiptModal({ donation, userName, onClose }: { donation: Donation; userName: string; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=700,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>Donation Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
        .header { text-align:center; border-bottom: 2px solid #1e3a5f; padding-bottom:16px; margin-bottom:24px; }
        .header h1 { color: #1e3a5f; font-size:20px; margin:4px 0; }
        .header p { color: #555; font-size:12px; margin:2px 0; }
        table { width:100%; border-collapse:collapse; font-size:14px; }
        td { padding:8px 0; border-bottom:1px solid #f0f0f0; }
        td:first-child { color:#555; width:45%; }
        td:last-child { font-weight:600; }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const receiptNo = donation.receiptCode ?? `BAC-${String(donation.id).padStart(6, '0')}`;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-[#1e3a5f]">Donation Receipt</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          <div ref={printRef}>
            <div className="header text-center border-b-2 border-[#1e3a5f] pb-4 mb-5">
              <h1 className="text-xl font-bold text-[#1e3a5f]">Bassonia Adventurer Club</h1>
              <p className="text-xs text-gray-500">Official Donation Receipt</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="text-gray-500 py-2 border-b">Receipt No.</td>
                  <td className="font-semibold py-2 border-b">{receiptNo}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 py-2 border-b">Date</td>
                  <td className="font-semibold py-2 border-b">{new Date(donation.createdAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 py-2 border-b">Donor</td>
                  <td className="font-semibold py-2 border-b">{donation.isAnonymous ? 'Anonymous' : userName}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 py-2 border-b">Purpose</td>
                  <td className="font-semibold py-2 border-b">{donation.eventName ?? 'General Donation'}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 py-2 border-b">Amount</td>
                  <td className="font-semibold py-2 border-b text-green-700">R{donation.amount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 py-2 border-b">Reference</td>
                  <td className="font-semibold py-2 border-b">{donation.reference}</td>
                </tr>
                <tr>
                  <td className="text-gray-500 py-2 border-b">Status</td>
                  <td className="font-semibold py-2 border-b text-green-600">{donation.status}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 bg-[#1e3a5f] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#274a74] transition-colors"
            >
              Download / Print PDF
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DonorMyDonationsPage() {
  const { user, token } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Donation | null>(null);

  useEffect(() => {
    const fetchDonations = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009';
        const res = await fetch(`${base}/api/payments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setDonations(data.filter((d: Donation) => d.type === 'Donation'));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, [token]);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[#1e3a5f]">My Donation History</h1>
          <Link
            href="/donor/donations"
            className="bg-yellow-400 text-[#1e3a5f] font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors text-sm"
          >
            + Make Donation
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : donations.length === 0 ? (
            <p className="text-sm text-gray-400">No donations yet. <Link href="/donor/donations" className="underline text-[#1e3a5f]">Make your first donation</Link>.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Purpose</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Anon</th>
                    <th className="pb-2">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {donations.map((d) => (
                    <tr key={d.id} className="text-gray-700">
                      <td className="py-2.5 pr-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 pr-4">{d.eventName ?? 'General'}</td>
                      <td className="py-2.5 pr-4 font-semibold">R{d.amount.toLocaleString()}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          d.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          d.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs">
                        {d.isAnonymous ? <span className="text-gray-400">Yes</span> : <span className="text-gray-300">No</span>}
                      </td>
                      <td className="py-2.5">
                        {d.status === 'Completed' ? (
                          <button
                            onClick={() => setSelectedReceipt(d)}
                            className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Receipt
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedReceipt && (
        <ReceiptModal donation={selectedReceipt} userName={user?.name ?? ''} onClose={() => setSelectedReceipt(null)} />
      )}
    </>
  );
}
