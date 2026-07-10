import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as walletsApi from '../api/wallets';
import type { Wallet, Transaction, Reconciliation } from '../types';

export function WalletDetail() {
  const { id } = useParams<{ id: string }>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [recon, setRecon] = useState<Reconciliation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    Promise.all([
      walletsApi.getWallet(id),
      walletsApi.getTransactions(id, LIMIT, 0),
      walletsApi.getReconciliation(id).catch(() => null), // reconciliation may fail if no ledger entries
    ])
      .then(([w, t, r]) => {
        setWallet(w);
        setTxns(t);
        setRecon(r);
        setHasMore(t.length === LIMIT);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load wallet');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const loadMore = async () => {
    if (!id) return;
    const nextOffset = offset + LIMIT;
    try {
      const more = await walletsApi.getTransactions(id, LIMIT, nextOffset);
      setTxns((prev) => [...prev, ...more]);
      setOffset(nextOffset);
      setHasMore(more.length === LIMIT);
    } catch {
      // ignore pagination errors
    }
  };

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading wallet…</p>;
  }

  if (error || !wallet) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
        {error || 'Wallet not found'}
      </div>
    );
  }

  const statusColor =
    recon?.inSync === true
      ? 'text-green-600'
      : recon?.inSync === false
        ? 'text-red-600'
        : 'text-gray-400';

  return (
    <div>
      {/* Balance card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              {wallet.currency} Balance
            </div>
            <div className="text-3xl font-bold">
              {wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-400 mt-1 font-mono">{wallet.id}</div>
          </div>
          {recon && (
            <div className={`text-sm font-medium ${statusColor}`}>
              {recon.inSync ? '✓ In sync' : '⚠ Out of sync'}
              {!recon.inSync && (
                <span className="block text-xs text-red-500">
                  Diff: {recon.difference.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transactions */}
      <h2 className="text-lg font-semibold mb-3">Transactions</h2>
      {txns.length === 0 ? (
        <p className="text-gray-400 text-sm py-4">No transactions yet</p>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Type</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">Amount</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Counterparty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {txns.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500 font-mono text-xs whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          t.type === 'DEPOSIT' || t.type === 'TRANSFER_IN'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {t.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-mono ${
                        t.type === 'DEPOSIT' || t.type === 'TRANSFER_IN'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {t.type === 'DEPOSIT' || t.type === 'TRANSFER_IN' ? '+' : '-'}
                      {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                      {t.currency}
                    </td>
                    <td className="px-4 py-2 text-gray-500 font-mono text-xs truncate max-w-48">
                      {t.counterpartyWalletId || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <button
              onClick={loadMore}
              className="mt-3 text-sm text-blue-600 hover:underline cursor-pointer"
            >
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}
