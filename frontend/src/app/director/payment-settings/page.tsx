'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface DirectorPaymentSettings {
  studentRegistrationFeePrice: number;
  teachersRegistrationFeePrice: number;
  workCommencmentDate: string;
  workCompletionDate: string;
  completionConfirmationDate: string;
  investigerDate: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
  payFastMerchantId: string;
  payFastMerchantKey: string;
  payFastPassphrase: string;
  payFastUseSandbox: boolean;
  payFastReturnUrl: string;
  payFastCancelUrl: string;
  payFastNotifyUrl: string;
}

export default function DirectorPaymentSettingsPage() {
  const isDemoSession = typeof window !== 'undefined' && localStorage.getItem('token') === 'mock-token';
  const [settings, setSettings] = useState<DirectorPaymentSettings>({
    studentRegistrationFeePrice: 450,
    teachersRegistrationFeePrice: 450,
    workCommencmentDate: '',
    workCompletionDate: '',
    completionConfirmationDate: '',
    investigerDate: '',
    bankName: 'First National Bank',
    accountName: 'Bassonia Adventurer Club',
    accountNumber: 'XXXX XXXX XXXX',
    branchCode: '250655',
    payFastMerchantId: '',
    payFastMerchantKey: '',
    payFastPassphrase: '',
    payFastUseSandbox: true,
    payFastReturnUrl: 'http://localhost:3000/parent/payments?payment=success',
    payFastCancelUrl: 'http://localhost:3000/parent/payments?payment=cancelled',
    payFastNotifyUrl: 'http://localhost:5009/api/payments/payfast/notify',
  });

  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoadingSettings(true);
        setSettingsError(null);
        const data = await apiFetch('/api/payment-settings/admin');
        setSettings({
          studentRegistrationFeePrice: Number(data.studentRegistrationFeePrice ?? 450),
          teachersRegistrationFeePrice: Number(data.teachersRegistrationFeePrice ?? 450),
          workCommencmentDate: data.workCommencmentDate ? String(data.workCommencmentDate).slice(0, 10) : '',
          workCompletionDate: data.workCompletionDate ? String(data.workCompletionDate).slice(0, 10) : '',
          completionConfirmationDate: data.completionConfirmationDate ? String(data.completionConfirmationDate).slice(0, 10) : '',
          investigerDate: data.investigerDate ? String(data.investigerDate).slice(0, 10) : '',
          bankName: data.bankName ?? '',
          accountName: data.accountName ?? '',
          accountNumber: data.accountNumber ?? '',
          branchCode: data.branchCode ?? '',
          payFastMerchantId: data.payFastMerchantId ?? '',
          payFastMerchantKey: data.payFastMerchantKey ?? '',
          payFastPassphrase: data.payFastPassphrase ?? '',
          payFastUseSandbox: data.payFastUseSandbox ?? true,
          payFastReturnUrl: data.payFastReturnUrl ?? '',
          payFastCancelUrl: data.payFastCancelUrl ?? '',
          payFastNotifyUrl: data.payFastNotifyUrl ?? '',
        });
      } catch (err) {
        setSettingsError(err instanceof Error ? err.message : 'Failed to load payment settings.');
      } finally {
        setLoadingSettings(false);
      }
    };

    void loadSettings();
  }, []);

  const updateSetting = (field: keyof DirectorPaymentSettings, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value } as DirectorPaymentSettings));
  };

  const savePaymentSettings = async () => {
    if (isDemoSession) {
      setSettingsMessage(null);
      setSettingsError('You are using Demo login. Saving payment settings requires a real Director account and backend authentication.');
      return;
    }

    try {
      setSavingSettings(true);
      setSettingsMessage(null);
      setSettingsError(null);

      await apiFetch('/api/payment-settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...settings,
          studentRegistrationFeePrice: Number(settings.studentRegistrationFeePrice),
          teachersRegistrationFeePrice: Number(settings.teachersRegistrationFeePrice),
          workCommencmentDate: settings.workCommencmentDate || null,
          workCompletionDate: settings.workCompletionDate || null,
          completionConfirmationDate: settings.completionConfirmationDate || null,
          investigerDate: settings.investigerDate || null,
        }),
      });

      setSettingsMessage('Payment and banking settings saved successfully.');
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to save payment settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Director Payment Settings</h1>
      <p className="text-sm text-gray-600 mb-6">
        Configure pricing.costs, learning timeline dates, and payment channel details used throughout the platform.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {isDemoSession && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            Demo mode is active. You can view and edit fields, but saving to the server is disabled.
          </p>
        )}
        {loadingSettings && <p className="text-sm text-gray-500 mb-3">Loading payment settings...</p>}
        {settingsError && <p className="text-sm text-red-600 mb-3">{settingsError}</p>}
        {settingsMessage && <p className="text-sm text-green-600 mb-3">{settingsMessage}</p>}

        <h2 className="text-base font-semibold text-gray-700 mb-4">Pricing.Costs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student registration fee price</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={settings.studentRegistrationFeePrice}
              onChange={(e) => updateSetting('studentRegistrationFeePrice', Number(e.target.value || 0))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teachers registration fee price</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={settings.teachersRegistrationFeePrice}
              onChange={(e) => updateSetting('teachersRegistrationFeePrice', Number(e.target.value || 0))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <h2 className="text-base font-semibold text-gray-700 mt-6 mb-4">Learning Timeline</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">work commencment date</label>
            <input
              type="date"
              value={settings.workCommencmentDate}
              onChange={(e) => updateSetting('workCommencmentDate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">work completion date</label>
            <input
              type="date"
              value={settings.workCompletionDate}
              onChange={(e) => updateSetting('workCompletionDate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Completion confirmation date</label>
            <input
              type="date"
              value={settings.completionConfirmationDate}
              onChange={(e) => updateSetting('completionConfirmationDate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">investiger date</label>
            <input
              type="date"
              value={settings.investigerDate}
              onChange={(e) => updateSetting('investigerDate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <h2 className="text-base font-semibold text-gray-700 mt-6 mb-4">Bank Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
            <input
              type="text"
              value={settings.bankName}
              onChange={(e) => updateSetting('bankName', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
            <input
              type="text"
              value={settings.accountName}
              onChange={(e) => updateSetting('accountName', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="text"
              value={settings.accountNumber}
              onChange={(e) => updateSetting('accountNumber', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch Code</label>
            <input
              type="text"
              value={settings.branchCode}
              onChange={(e) => updateSetting('branchCode', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <h2 className="text-base font-semibold text-gray-700 mt-6 mb-4">PayFast Gateway</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Merchant ID</label>
            <input
              type="text"
              value={settings.payFastMerchantId}
              onChange={(e) => updateSetting('payFastMerchantId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Key</label>
            <input
              type="text"
              value={settings.payFastMerchantKey}
              onChange={(e) => updateSetting('payFastMerchantKey', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passphrase</label>
            <input
              type="text"
              value={settings.payFastPassphrase}
              onChange={(e) => updateSetting('payFastPassphrase', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-3 mt-7">
            <input
              id="payfastSandbox"
              type="checkbox"
              checked={settings.payFastUseSandbox}
              onChange={(e) => updateSetting('payFastUseSandbox', e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="payfastSandbox" className="text-sm text-gray-700">Use Sandbox Mode</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Return URL</label>
            <input
              type="text"
              value={settings.payFastReturnUrl}
              onChange={(e) => updateSetting('payFastReturnUrl', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cancel URL</label>
            <input
              type="text"
              value={settings.payFastCancelUrl}
              onChange={(e) => updateSetting('payFastCancelUrl', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notify URL</label>
            <input
              type="text"
              value={settings.payFastNotifyUrl}
              onChange={(e) => updateSetting('payFastNotifyUrl', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        <button
          onClick={savePaymentSettings}
          disabled={savingSettings}
          className="mt-5 bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c] disabled:opacity-60"
        >
          {savingSettings ? 'Saving...' : 'Save Payment Settings'}
        </button>
      </div>
    </div>
  );
}
