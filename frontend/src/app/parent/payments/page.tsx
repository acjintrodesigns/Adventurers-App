'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { DemeritRecordSummary } from '@/lib/compliance';

interface Payment {
  id: number;
  childId?: number | null;
  childName?: string | null;
  childAdventurerCode?: string | null;
  amount: number;
  type: 'Registration' | 'Event' | 'Donation' | string;
  status: 'Pending' | 'Completed' | 'Failed' | string;
  reference?: string | null;
  receiptCode?: string | null;
  createdAt: string;
}

interface Child {
  id: number;
  name: string;
  status: string;
  demeritCount?: number;
  isDelistedFromCamps?: boolean;
  activeDemerits?: DemeritRecordSummary[];
}

interface CheckoutResponse {
  checkoutUrl: string;
  reference: string;
  paymentId: number;
}

interface PublicPaymentSettings {
  onlinePaymentsEnabled: boolean;
}

const typeColors: Record<string, string> = {
  Registration: 'bg-blue-100 text-blue-700',
  Event: 'bg-indigo-100 text-indigo-700',
  Donation: 'bg-green-100 text-green-700',
};

function ReceiptModal({ payment, parentName, onClose }: { payment: Payment; parentName: string; onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const logoUrl = `${window.location.origin}/logo.png`;
    const win = window.open('', '_blank', 'width=700,height=900');
    if (!win) return;
    const receiptNo = payment.receiptCode ?? `BAC-${String(payment.id).padStart(5, '0')}`;
    const fmtAmt = (n: number) => `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
    const d = new Date(payment.createdAt);
    const dateStr = d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const rows = [
      { label: 'Receipt No.', value: receiptNo },
      { label: 'Date', value: dateStr },
      { label: 'Parent / Guardian', value: parentName },
      { label: 'Child', value: payment.childName ?? 'N/A' },
      { label: 'Adventurer Code', value: payment.childAdventurerCode ?? 'Pending assignment' },
      { label: 'Payment Type', value: payment.type },
      { label: 'Reference', value: payment.reference ?? receiptNo },
      { label: 'Authenticity Code', value: payment.receiptCode ?? 'N/A' },
      { label: 'Status', value: payment.status },
    ];
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${receiptNo}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a1a; }
            .receipt { max-width: 560px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 16px; margin-bottom: 24px; }
            .logo { width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px; }
            .club-name { font-size: 22px; font-weight: 700; color: #1e3a5f; }
            .club-sub { font-size: 13px; color: #666; margin-top: 2px; }
            .receipt-title { font-size: 18px; font-weight: 700; margin-top: 12px; text-transform: uppercase; letter-spacing: 1px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
            .row .label { color: #666; }
            .row .value { font-weight: 600; text-align: right; }
            .amount-row { display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: 700; color: #1e3a5f; border-top: 2px solid #1e3a5f; margin-top: 8px; }
            .status-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
            .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #888; }
            .auth-code { margin-top: 10px; font-size: 11px; color: #bbb; word-break: break-all; }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <img src="${logoUrl}" alt="Adventurer Club Logo" class="logo" />
              <div class="club-name">Bassonia Adventurer Club</div>
              <div class="club-sub">Official Payment Receipt</div>
              <div class="receipt-title">Receipt</div>
            </div>
            <div style="font-size:14px">
              ${rows.map(r => `<div class="row"><span class="label">${r.label}</span><span class="value">${r.label === 'Status' ? `<span class="status-badge">${r.value}</span>` : r.value}</span></div>`).join('')}
            </div>
            <div class="amount-row"><span>Total Paid</span><span>${fmtAmt(Number(payment.amount))}</span></div>
            <div class="footer">
              <p>Thank you for your payment.</p>
              <p style="margin-top:4px">Bassonia Adventurer Club &mdash; Keeping the Adventure Alive!</p>
              ${payment.receiptCode ? `<p class="auth-code">Authenticity Code: ${payment.receiptCode}</p>` : ''}
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.onload = () => win.print();
  };

  const fmt = (n: number) => `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  const d2 = new Date(payment.createdAt);
  const date = d2.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) + ' at ' + d2.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const receiptNo = payment.receiptCode ?? `BAC-${String(payment.id).padStart(5, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Screen header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Payment Receipt</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold px-4 py-2 hover:bg-[#274a74]">
              Download / Print PDF
            </button>
            <button onClick={onClose} className="rounded-lg border border-gray-300 text-sm px-3 py-2 text-gray-600 hover:bg-gray-50">Close</button>
          </div>
        </div>

        {/* Receipt body (also used for print) */}
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          <div ref={receiptRef}>
            <div className="receipt">
              <div className="header" style={{ textAlign: 'center', borderBottom: '2px solid #1e3a5f', paddingBottom: '16px', marginBottom: '24px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Adventurer Club Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', margin: '0 auto 10px' }} />
                <div className="club-name" style={{ fontSize: '22px', fontWeight: 700, color: '#1e3a5f' }}>Bassonia Adventurer Club</div>
                <div className="club-sub" style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>Official Payment Receipt</div>
                <div className="receipt-title" style={{ fontSize: '18px', fontWeight: 700, marginTop: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Receipt</div>
              </div>

              <div style={{ fontSize: '14px' }}>
                {[
                  { label: 'Receipt No.', value: receiptNo },
                  { label: 'Date', value: date },
                  { label: 'Parent / Guardian', value: parentName },
                  { label: 'Child', value: payment.childName ?? 'N/A' },
                  { label: 'Adventurer Code', value: payment.childAdventurerCode ?? 'Pending assignment' },
                  { label: 'Payment Type', value: payment.type },
                  { label: 'Reference', value: payment.reference ?? receiptNo },
                  { label: 'Authenticity Code', value: payment.receiptCode ?? 'N/A' },
                  { label: 'Status', value: payment.status },
                ].map(({ label, value }) => (
                  <div key={label} className="row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                    <span className="label" style={{ color: '#666' }}>{label}</span>
                    <span className="value" style={{ fontWeight: 600, textAlign: 'right' }}>
                      {label === 'Status' ? (
                        <span className="status-badge" style={{ background: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>{value}</span>
                      ) : value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="amount-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '18px', fontWeight: 700, color: '#1e3a5f', borderTop: '2px solid #1e3a5f', marginTop: '8px' }}>
                <span>Total Paid</span>
                <span>{fmt(Number(payment.amount))}</span>
              </div>

              <div className="footer" style={{ textAlign: 'center', marginTop: '32px', fontSize: '12px', color: '#888' }}>
                <p>Thank you for your payment.</p>
                <p style={{ marginTop: '4px' }}>Bassonia Adventurer Club &mdash; Keeping the Adventure Alive!</p>
                {payment.receiptCode && (
                  <p className="auth-code" style={{ marginTop: '10px', fontSize: '11px', color: '#bbb', wordBreak: 'break-all' }}>
                    Authenticity Code: {payment.receiptCode}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ParentPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [onlinePaymentsEnabled, setOnlinePaymentsEnabled] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  const [amount, setAmount] = useState('450');
  const [type, setType] = useState<'Registration' | 'Event' | 'Donation'>('Registration');
  const [childId, setChildId] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [paymentData, childData] = await Promise.all([
        apiFetch('/api/payments'),
        apiFetch('/api/children'),
      ]);

      try {
        const paymentSettings = await apiFetch('/api/payment-settings') as PublicPaymentSettings;
        setOnlinePaymentsEnabled(paymentSettings.onlinePaymentsEnabled ?? false);
      } catch {
        setOnlinePaymentsEnabled(false);
      }

      setPayments(paymentData);
      setChildren(childData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const totalPaid = useMemo(
    () => payments.filter((p) => p.status === 'Completed').reduce((sum, p) => sum + Number(p.amount), 0),
    [payments]
  );
  const totalPending = useMemo(
    () => payments.filter((p) => p.status === 'Pending').reduce((sum, p) => sum + Number(p.amount), 0),
    [payments]
  );
  const selectedChild = useMemo(
    () => children.find((child) => String(child.id) === childId) ?? null,
    [children, childId]
  );
  const campPaymentBlocked = type === 'Event' && !!selectedChild?.isDelistedFromCamps;
  const registrationUnpaid = type !== 'Registration' && !!selectedChild && selectedChild.status !== 'Paid';
  const blockingDemerit = selectedChild?.activeDemerits?.[0] ?? null;

  const statusPill = (status: string) => {
    if (status === 'Completed') return 'bg-green-100 text-green-700';
    if (status === 'Failed') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const startCheckoutForExistingPayment = async (paymentId: number) => {
    try {
      setProcessingId(paymentId);
      const response = await apiFetch(`/api/payments/${paymentId}/checkout/payfast`, {
        method: 'POST',
      }) as CheckoutResponse;
      window.location.href = response.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout');
    } finally {
      setProcessingId(null);
    }
  };

  const createAndPayOnline = async () => {
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!onlinePaymentsEnabled) {
      setError('Online payments are not configured yet. Ask the director to complete payment settings.');
      return;
    }

    if (campPaymentBlocked) {
      setError('Camp payments are disabled for this child because the approved demerit threshold has been reached.');
      return;
    }

    if (registrationUnpaid) {
      setError('Registration fee must be paid before making event or other payments for this child.');
      return;
    }

    try {
      setError('');
      setProcessingId(-1);
      const response = await apiFetch('/api/payments/checkout/payfast', {
        method: 'POST',
        body: JSON.stringify({
          childId: childId ? Number(childId) : null,
          eventId: null,
          amount: parsedAmount,
          type,
          itemName: `${type} Payment`,
        }),
      }) as CheckoutResponse;

      window.location.href = response.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create payment checkout');
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Payments</h1>
        <div className="bg-white rounded-xl p-6 border border-gray-100">Loading payments...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          parentName={user?.name ?? 'Parent'}
          onClose={() => setReceiptPayment(null)}
        />
      )}
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Payments</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-5 text-green-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Total Paid</p>
          <p className="text-2xl font-bold mt-1">R{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-5 text-yellow-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Pending Amount</p>
          <p className="text-2xl font-bold mt-1">R{totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Pay Online</h2>
        {!onlinePaymentsEnabled && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            Online payments are currently unavailable. The director needs to configure payment settings.
          </p>
        )}
        {campPaymentBlocked && selectedChild && (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-3 mb-3 space-y-1">
            <p className="font-semibold">Camp-style event payments are disabled for {selectedChild.name}.</p>
            {blockingDemerit && (
              <>
                <p><span className="font-semibold">Reason:</span> {blockingDemerit.reason}</p>
                <p><span className="font-semibold">Consequence:</span> {blockingDemerit.consequence}</p>
                <p><span className="font-semibold">Remedy:</span> {blockingDemerit.remedy}</p>
              </>
            )}
          </div>
        )}
        {registrationUnpaid && selectedChild && (
          <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-3 mb-3">
            <p className="font-semibold">Registration fee not paid for {selectedChild.name}.</p>
            <p className="mt-0.5">You must complete the registration payment before paying for events or other activities.</p>
            <a href="/parent/register-child" className="mt-1 inline-block font-semibold underline">Pay registration now →</a>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Amount"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'Registration' | 'Event' | 'Donation')}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="Registration">Registration</option>
            <option value="Event">Event</option>
            <option value="Donation">Donation</option>
          </select>
          <select
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">No Child Selected</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
          <button
            onClick={createAndPayOnline}
            disabled={processingId !== null || !onlinePaymentsEnabled || campPaymentBlocked || registrationUnpaid}
            className="rounded-lg bg-[#1e3a5f] text-white font-semibold px-4 py-2 hover:bg-[#274a74] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {registrationUnpaid ? 'Registration Required' : campPaymentBlocked ? 'Camp Payment Locked' : processingId === -1 ? 'Starting...' : 'Pay Now'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Description</th>
                <th className="px-6 py-3 text-left">Child</th>
                <th className="px-6 py-3 text-left">Adv Code</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{p.type} Payment</td>
                  <td className="px-6 py-4 text-gray-500">{p.childName ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-500 font-semibold">{p.childAdventurerCode ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${typeColors[p.type]}`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right font-bold text-[#1e3a5f]">R{Number(p.amount).toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusPill(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {p.status === 'Completed' ? (
                      <button
                        onClick={() => setReceiptPayment(p)}
                        className="text-xs font-semibold rounded-md px-3 py-1.5 bg-green-600 text-white hover:bg-green-700"
                      >
                        View Receipt
                      </button>
                    ) : p.status === 'Pending' ? (
                      <button
                        onClick={() => startCheckoutForExistingPayment(p.id)}
                        disabled={processingId !== null || !onlinePaymentsEnabled}
                        className="text-xs font-semibold rounded-md px-3 py-1.5 bg-[#1e3a5f] text-white hover:bg-[#274a74] disabled:opacity-60"
                      >
                        {processingId === p.id ? 'Opening...' : 'Pay Online'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No payments yet. Use &quot;Pay Online&quot; above to create your first payment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

