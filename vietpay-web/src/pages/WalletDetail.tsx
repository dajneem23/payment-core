import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as walletsApi from '../api/wallets';
import * as transfersApi from '../api/transfers';
import * as paymentsApi from '../api/payments';
import type { Wallet, Transaction, Reconciliation, TransferDetail } from '../types';

function txnIcon(direction: string) {
  return direction === 'CREDIT' ? '↓' : '↑';
}

function txnLabel(direction: string) {
  return direction === 'CREDIT' ? 'Received' : 'Sent';
}

export function WalletDetail() {
  const { id } = useParams<{ id: string }>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [recon, setRecon] = useState<Reconciliation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [detail, setDetail] = useState<TransferDetail | paymentsApi.PaymentDetail | null>(null);
  const [detailType, setDetailType] = useState<'TRANSFER' | 'PAYMENT' | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const LIMIT = 20;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    Promise.allSettled([
      walletsApi.getWallet(id),
      walletsApi.getTransactions(id, LIMIT, 0),
      walletsApi.getReconciliation(id),
    ])
      .then(([wR, tR, rR]) => {
        if (wR.status === 'fulfilled') {
          setWallet(wR.value);
        } else {
          console.error('Failed to load wallet:', wR.reason);
          setError('Failed to load wallet');
        }
        if (tR.status === 'fulfilled') {
          setTxns(tR.value);
          setHasMore(tR.value.length === LIMIT);
        } else {
          console.error('Failed to load transactions:', tR.reason);
        }
        if (rR.status === 'fulfilled') {
          setRecon(rR.value);
        } else {
          console.error('Failed to load reconciliation:', rR.reason);
        }
      })
      .catch((err: unknown) => {
        console.error('WalletDetail error:', err);
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

  const openDetail = async (txn: Transaction) => {
    setDetailLoading(true);
    setDetail(null);
    setDetailType(null);
    try {
      if (txn.sourceType === 'PAYMENT') {
        const d = await paymentsApi.getPayment(txn.sourceRef);
        setDetail(d);
        setDetailType('PAYMENT');
      } else {
        const d = await transfersApi.getTransferDetail(txn.sourceRef);
        setDetail(d);
        setDetailType('TRANSFER');
      }
    } catch (err: unknown) {
      console.error(`Failed to load ${txn.sourceType} detail:`, err);
    } finally {
      setDetailLoading(false);
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

  const diff = recon ? recon.cachedBalance - recon.ledgerBalance : 0;

  return (
    <div>
      {/* Balance card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              {wallet.currency} Balance
            </div>
            <div className="text-3xl font-bold tracking-tight">
              {wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
              <span className="text-lg font-normal text-gray-400">{wallet.currency}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1 font-mono">{wallet.id}</div>
          </div>
          {recon && (
            <div className={`text-sm font-medium ${recon.balanced ? 'text-green-600' : 'text-red-600'}`}>
              {recon.balanced ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  In sync
                </span>
              ) : (
                <div>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    Out of sync
                  </span>
                  <span className="block text-xs text-red-500 mt-0.5">
                    Diff: {diff.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transfer detail panel */}
      {detailLoading && (
        <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm text-sm text-gray-400">
          Loading details…
        </div>
      )}
      {detail && detailType === 'TRANSFER' && (
        <div className="mb-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="text-sm font-semibold">Transfer Detail</h3>
            <button onClick={() => setDetail(null)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">✕ Close</button>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 text-sm">
            {(() => {
              const d = detail as TransferDetail;
              return (
                <>
                  <div><div className="text-xs text-gray-400">Transfer ID</div><div className="font-mono text-xs">{d.transferId}</div></div>
                  <div><div className="text-xs text-gray-400">Status</div><span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-700">{d.status}</span></div>
                  <div><div className="text-xs text-gray-400">Source Wallet</div><div className="font-mono text-xs">{d.sourceWalletId}</div></div>
                  <div><div className="text-xs text-gray-400">Destination Wallet</div><div className="font-mono text-xs">{d.destWalletId}</div></div>
                  <div><div className="text-xs text-gray-400">Amount</div><div className="font-mono font-semibold">{d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {d.currency}</div></div>
                  <div><div className="text-xs text-gray-400">Date</div><div className="text-xs">{new Date(d.createdAt).toLocaleString()}</div></div>
                  {d.remark && <div className="col-span-2"><div className="text-xs text-gray-400">Remark</div><div className="text-sm text-gray-700">{d.remark}</div></div>}
                </>
              );
            })()}
          </div>
        </div>
      )}
      {detail && detailType === 'PAYMENT' && (
        <div className="mb-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="text-sm font-semibold">Card Payment Detail</h3>
            <button onClick={() => setDetail(null)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">✕ Close</button>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 text-sm">
            {(() => {
              const d = detail as paymentsApi.PaymentDetail;
              return (
                <>
                  <div><div className="text-xs text-gray-400">Payment ID</div><div className="font-mono text-xs">{d.paymentId}</div></div>
                  <div><div className="text-xs text-gray-400">Status</div><span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-700">{d.status}</span></div>
                  <div><div className="text-xs text-gray-400">Scheme</div><span className="text-xs font-medium">{d.scheme}</span></div>
                  <div><div className="text-xs text-gray-400">BIN</div><div className="font-mono text-xs">{d.bin}</div></div>
                  <div><div className="text-xs text-gray-400">Amount</div><div className="font-mono font-semibold">{d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {d.currency}</div></div>
                  <div><div className="text-xs text-gray-400">Date</div><div className="text-xs">{new Date(d.createdAt).toLocaleString()}</div></div>
                  {d.providerRef && <div className="col-span-2"><div className="text-xs text-gray-400">Provider Ref</div><div className="font-mono text-xs">{d.providerRef}</div></div>}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Transactions */}
      <h2 className="text-lg font-semibold mb-3">Transactions</h2>
      {txns.length === 0 ? (
        <p className="text-gray-400 text-sm py-4">No transactions yet</p>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {txns.map((t) => {
              const isCredit = t.direction === 'CREDIT';
              const isActive = detail
                ? (detailType === 'TRANSFER' && (detail as TransferDetail).transferId === t.sourceRef) ||
                  (detailType === 'PAYMENT' && (detail as paymentsApi.PaymentDetail).paymentId === t.sourceRef)
                : false;
              return (
                <div
                  key={t.id}
                  onClick={() => openDetail(t)}
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                    isActive ? 'bg-blue-50 ring-1 ring-blue-200' : ''
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${
                      isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {txnIcon(t.direction)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {txnLabel(t.direction)}
                    </div>
                    <div className="text-xs text-gray-400 font-mono truncate">
                      {t.id.slice(0, 8)}… &middot; ref {t.sourceRef.slice(0, 8)}…
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-semibold font-mono ${
                        isCredit ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-400">{t.currency}</div>
                  </div>
                </div>
              );
            })}
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
