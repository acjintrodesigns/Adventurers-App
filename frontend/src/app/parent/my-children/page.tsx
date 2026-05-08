'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import ChildCard from '@/components/ChildCard';
import type { ApiChild } from '@/lib/compliance';

interface PaymentSettings {
  workCommencementDate?: string | null;
  workCompletionDate?: string | null;
  completionConfirmationDate?: string | null;
}

export default function MyChildrenPage() {
  const [children, setChildren] = useState<ApiChild[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [childrenResponse, settingsResponse] = await Promise.all([
          apiFetch('/api/children') as Promise<ApiChild[]>,
          apiFetch('/api/payment-settings') as Promise<PaymentSettings>,
        ]);
        setChildren(Array.isArray(childrenResponse) ? childrenResponse : []);
        setPaymentSettings(settingsResponse || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">My Children</h1>
          <p className="text-gray-600">View and manage your registered children and their progress</p>
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
          <div className="space-y-4">
            {children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                paymentSettings={paymentSettings}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
