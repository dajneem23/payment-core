import { useEffect, useState, type FormEvent } from 'react';
import * as walletsApi from '../api/wallets';
import * as transfersApi from '../api/transfers';
import type { Wallet, TransferResult } from '../types';

export function Transfer() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [sourceId, setSourceId] = useState('');
  const [destId, setDestId] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('vietpay_wallet_ids');
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      Promise.allSettled(ids.map((id) => walletsApi.getWallet(id)))
        .then((results) => {
          const loaded: Wallet[] = [];
          const validIds: string[] = [];
          results.forEach((r, i) => {
            if (r.status === 'fulfilled') {
              loaded.push(r.value);
              validIds.push(ids[i]);
            }
          });
          localStorage.setItem('vietpay_wallet_ids', JSON.stringify(validIds));
          setWallets(loaded);
          if (loaded.length > 0) setSourceId(loaded[0].id);
        })
        .finally(() => setLoadingWallets(false));
    } else {
      setLoadingWallets(false);
    }
  }, []);

  const sourceWallet = wallets.find((w) => w.id === sourceId);
  const currency = sourceWallet?.currency ?? 'VND';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Enter a valid positive amount');
      return;
    }
    if (!sourceId || !destId) {
      setError('Select a source wallet and enter a destination');
      return;
    }
    if (sourceId === destId) {
      setError('Source and destination must be different');
      return;
    }
    setSending(true);
    try {
      const res = await transfersApi.transfer({
        sourceWalletId: sourceId,
        destWalletId: destId,
        amount: numAmount,
        currency,
      });
      setResult(res);
      setAmount('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setSending(false);
    }
  };

  if (loadingWallets) {
    return <p className="text-gray-500 text-sm">Loading wallets…</p>;
  }

  if (wallets.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg mb-1">No wallets to transfer from</p>
        <p className="text-sm">Create a wallet first</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Transfer Money</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded">
          <p className="font-semibold">Transfer completed</p>
          <p className="mt-1">
            {result.amount.toLocaleString()} {result.currency} sent — ID:{' '}
            <span className="font-mono text-xs">{result.id}</span>
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 max-w-lg"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 mb-4">
          From wallet
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.id.slice(0, 8)}… — {w.balance.toFixed(2)} {w.currency}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 mb-4">
          To wallet ID
          <input
            type="text"
            value={destId}
            onChange={(e) => setDestId(e.target.value)}
            required
            placeholder="Enter destination wallet ID"
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
            <input
              type="text"
              value={currency}
              readOnly
              className="border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-500"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={sending}
          className="bg-blue-600 text-white font-medium py-2 px-6 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
