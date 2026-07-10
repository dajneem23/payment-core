import { useEffect, useState } from 'react';
import * as fxApi from '../api/fx';
import type { FxRate } from '../types';

export function FxRates() {
  const [rates, setRates] = useState<FxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRates = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fxApi.getAllRates();
      setRates(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load FX rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">FX Rates</h1>
        <button
          onClick={fetchRates}
          disabled={loading}
          className="text-sm text-blue-600 hover:underline cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {loading && rates.length === 0 ? (
        <p className="text-gray-500 text-sm">Loading rates…</p>
      ) : rates.length === 0 ? (
        <p className="text-gray-400 text-sm py-4">
          No rates available. The FX service may not have fetched data yet.
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Code</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Name</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Bid</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Ask</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Transfer</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rates.map((r) => (
                <tr key={r.code} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-semibold">{r.code}</td>
                  <td className="px-4 py-2 text-gray-600">{r.name}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700">
                    {r.bid.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700">
                    {r.ask.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-700">
                    {r.transfer.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-gray-400 font-mono">
                    {new Date(r.updatedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rates.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          Source: Vietcombank — refreshed periodically by the FX service
        </p>
      )}
    </div>
  );
}
