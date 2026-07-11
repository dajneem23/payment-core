import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as walletsApi from '../api/wallets';
import type { Wallet } from '../types';

const CURRENCIES = ['VND', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

export function Dashboard() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [currency, setCurrency] = useState('VND');
  const [creating, setCreating] = useState(false);

  const fetchWallets = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch all wallets for the authenticated user from the API
      const data = await walletsApi.listMyWallets();
      setWallets(data);
      // Sync localStorage cache
      localStorage.setItem('vietpay_wallet_ids', JSON.stringify(data.map((w) => w.id)));
    } catch (err: unknown) {
      console.error('Dashboard fetchWallets error:', err);
      // Fallback: try localStorage if API fails
      const stored = localStorage.getItem('vietpay_wallet_ids');
      if (stored) {
        try {
          const ids: string[] = JSON.parse(stored);
          const results = await Promise.allSettled(ids.map((id) => walletsApi.getWallet(id)));
          const loaded: Wallet[] = [];
          results.forEach((r, i) => {
            if (r.status === 'fulfilled') loaded.push(r.value);
            else console.error(`Failed to fetch wallet ${ids[i].slice(0, 8)}…:`, r.reason);
          });
          setWallets(loaded);
          if (loaded.length === 0) setError('Failed to load wallets from the server.');
        } catch {
          setError('Failed to load wallets. Try again.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load wallets');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      await walletsApi.createWallet({ currency });
      // Refresh the full list from the API
      const data = await walletsApi.listMyWallets();
      setWallets(data);
      localStorage.setItem('vietpay_wallet_ids', JSON.stringify(data.map((w) => w.id)));
      setShowCreate(false);
    } catch (err: unknown) {
      console.error('Dashboard createWallet error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create wallet';
      setError(`Create wallet failed: ${msg}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Wallets</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-blue-700 transition-colors cursor-pointer"
        >
          + New Wallet
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-sm font-semibold mb-3">Create a new wallet</h2>
          <div className="flex items-end gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              Currency
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-gray-500 text-sm py-2 cursor-pointer hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading wallets…</p>
      ) : wallets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">No wallets yet</p>
          <p className="text-sm">Create one to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((w) => (
            <Link
              key={w.id}
              to={`/wallets/${w.id}`}
              className="block p-5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {w.currency}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {w.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-400 mt-2 font-mono truncate">{w.id}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
