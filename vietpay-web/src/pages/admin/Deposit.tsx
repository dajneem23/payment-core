import { useState, type FormEvent } from 'react';
import * as fxApi from '../../api/fx';
import type { DepositResult } from '../../types';

const CURRENCIES = ['VND', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

export function Deposit() {
  const [walletId, setWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<DepositResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Enter a valid positive amount');
      return;
    }
    if (!walletId.trim()) {
      setError('Enter a wallet ID');
      return;
    }
    setSending(true);
    try {
      const res = await fxApi.deposit(walletId.trim(), {
        amount: numAmount,
        currency,
      });
      setResult(res);
      setAmount('');
      setWalletId('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Admin Deposit</h1>
      <p className="text-sm text-gray-500 mb-6">
        Fund any wallet from an external source. Requires ADMIN role.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded">
          <p className="font-semibold">Deposit submitted</p>
          <p className="mt-1">
            +{result.amount.toLocaleString()} {result.currency} — status:{' '}
            {result.status}
          </p>
          <p className="text-xs text-green-600 font-mono mt-1">
            Deposit ID: {result.depositId} &middot; Wallet: {result.walletId}
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 max-w-lg"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 mb-4">
          Wallet ID
          <input
            type="text"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            required
            placeholder="Enter wallet UUID"
            className="border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Amount
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Currency
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={sending}
          className="bg-amber-600 text-white font-medium py-2 px-6 rounded hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {sending ? 'Depositing…' : 'Deposit'}
        </button>
      </form>
    </div>
  );
}
