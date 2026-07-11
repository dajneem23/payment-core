import { useEffect, useState, type FormEvent } from 'react';
import * as walletsApi from '../api/wallets';
import * as paymentsApi from '../api/payments';
import type { Wallet } from '../types';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'VND'];

function detectCardBrand(number: string): 'visa' | 'mastercard' | 'unknown' {
  const cleaned = number.replace(/\s/g, '');
  if (/^4/.test(cleaned)) return 'visa';
  if (/^5[1-5]/.test(cleaned)) return 'mastercard';
  if (/^2[2-7]/.test(cleaned)) return 'mastercard'; // Mastercard 2-series BIN
  return 'unknown';
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + ' / ' + digits.slice(2);
  if (digits.length === 2) return digits + ' / ';
  return digits;
}

export function CardDeposit() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [walletId, setWalletId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<paymentsApi.TopupResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    walletsApi.listMyWallets()
      .then((data) => {
        console.log('CardDeposit: wallets loaded', data.length);
        setWallets(data);
        if (data.length > 0) setWalletId(data[0].id);
      })
      .catch((err: unknown) => {
        console.error('CardDeposit: failed to load wallets', err);
        setError('Failed to load wallets. Check your connection and try again.');
      })
      .finally(() => setLoadingWallets(false));
  }, []);

  const brand = detectCardBrand(cardNumber);
  const maskedNumber = formatCardNumber(cardNumber);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    const rawNumber = cardNumber.replace(/\s/g, '');
    const rawExpiry = expiry.replace(/\D/g, '');
    const numAmount = parseFloat(amount);

    if (rawNumber.length !== 16) { setError('Card number must be 16 digits'); return; }
    if (rawExpiry.length !== 4) { setError('Enter a valid expiry (MM/YY)'); return; }
    if (cvv.length < 3) { setError('CVV must be at least 3 digits'); return; }
    if (!cardHolder.trim()) { setError('Cardholder name is required'); return; }
    if (isNaN(numAmount) || numAmount <= 0) { setError('Enter a valid amount'); return; }
    if (!walletId) { setError('Select a wallet to deposit into'); return; }

    console.log('CardDeposit: submitting topup', { walletId, amount: numAmount, currency, scheme: brand, bin: rawNumber.slice(0, 6) });
    setSubmitting(true);
    try {
      const res = await paymentsApi.topup({
        walletId,
        amount: numAmount.toString(),
        currency,
        scheme: brand === 'visa' ? 'VISA' : 'MASTERCARD',
        cardToken: rawNumber, // dev: use raw PAN as token (prod: PCI token)
        bin: rawNumber.slice(0, 6),
      });
      setResult(res);
      setAmount('');
    } catch (err: unknown) {
      console.error('CardDeposit: topup failed', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingWallets) {
    return <p className="text-gray-500 text-sm">Loading wallets…</p>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Card Deposit</h1>
      <p className="text-sm text-gray-500 mb-6">
        Fund your wallet with a Visa or Mastercard debit/credit card.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>
      )}

      {result && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded">
          <p className="font-semibold">Payment submitted</p>
          <p className="mt-1">
            {parseFloat(result.amount).toLocaleString()} {result.currency} via {result.scheme}
          </p>
          <p className="text-xs text-green-600 font-mono mt-1">
            Payment ID: {result.paymentId} &middot; Status: {result.status}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card preview */}
        <div
          className={`rounded-xl p-6 text-white shadow-lg transition-colors ${
            brand === 'visa'
              ? 'bg-gradient-to-br from-blue-700 to-blue-900'
              : brand === 'mastercard'
                ? 'bg-gradient-to-br from-orange-600 to-red-700'
                : 'bg-gradient-to-br from-gray-700 to-gray-900'
          }`}
        >
          <div className="flex justify-between items-start mb-8">
            <div className="text-xs font-semibold uppercase tracking-widest opacity-80">VietPay</div>
            {brand !== 'unknown' && (
              <div className="text-lg font-bold italic">
                {brand === 'visa' ? 'VISA' : 'Mastercard'}
              </div>
            )}
          </div>
          <div className="text-xl font-mono tracking-wider mb-4">
            {maskedNumber || '•••• •••• •••• ••••'}
          </div>
          <div className="flex justify-between text-xs opacity-80">
            <div>
              <div className="uppercase text-[10px] opacity-60 mb-0.5">Cardholder</div>
              <div>{cardHolder || 'YOUR NAME'}</div>
            </div>
            <div>
              <div className="uppercase text-[10px] opacity-60 mb-0.5">Expires</div>
              <div>{expiry ? formatExpiry(expiry) : 'MM / YY'}</div>
            </div>
          </div>
        </div>

        {/* Card details */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Card Number</span>
            <input
              type="text"
              inputMode="numeric"
              value={maskedNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Cardholder Name</span>
            <input
              type="text"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
              placeholder="JOHN DOE"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Expiry</span>
              <input
                type="text"
                inputMode="numeric"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM / YY"
                maxLength={9}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">CVV</span>
              <input
                type="password"
                inputMode="numeric"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="•••"
                maxLength={4}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Deposit details */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Deposit to</h2>

          {wallets.length === 0 ? (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Wallet ID (manual)</span>
              <input
                type="text"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                placeholder="Enter wallet UUID"
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Wallet</span>
              <select
                value={walletId}
                onChange={(e) => {
                  setWalletId(e.target.value);
                  const w = wallets.find((w) => w.id === e.target.value);
                  if (w) setCurrency(w.currency);
                }}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.id.slice(0, 8)}… — {w.balance.toLocaleString()} {w.currency}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Amount</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Processing…' : `Deposit ${amount ? amount : '...'} ${currency}`}
        </button>
      </form>
    </div>
  );
}
