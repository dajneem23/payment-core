import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  LineSeries,
  type IChartApi,
  type LineData,
  type Time,
  ColorType,
} from 'lightweight-charts';
import * as fxApi from '../api/fx';
import type { FxRate, FxRateSnapshot } from '../types';

const POPULAR_CODES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'CHF'];

function parseRate(v: string | null): number {
  if (!v) return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function FxRates() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [rates, setRates] = useState<FxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCode, setSelectedCode] = useState('USD');
  const [history, setHistory] = useState<FxRateSnapshot[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentRate, setCurrentRate] = useState<FxRate | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Initial load: fetch just the default currency's latest rate
  useEffect(() => {
    setLoading(true);
    setError('');
    fxApi.getRate(selectedCode)
      .then((r) => {
        setCurrentRate(r);
        setRates([r]); // start with just this one
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load FX rate');
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch history whenever selected currency changes
  useEffect(() => {
    setHistoryLoading(true);
    fxApi.getRateHistory(selectedCode)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [selectedCode]);

  // Fetch the current rate for the selected currency
  useEffect(() => {
    if (selectedCode === 'USD' && currentRate) return; // already loaded
    fxApi.getRate(selectedCode)
      .then(setCurrentRate)
      .catch(() => {});
  }, [selectedCode]);

  // Load all rates when "Show all" is clicked
  const loadAllRates = async () => {
    setError('');
    try {
      const data = await fxApi.getAllRates();
      setRates(data);
      setShowAll(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load all rates');
    }
  };

  const handleCodeChange = (code: string) => {
    setSelectedCode(code);
    if (showAll) {
      // Already have all rates, just pick from them
      const found = rates.find((r) => r.currencyCode === code);
      if (found) setCurrentRate(found);
    }
  };

  // ── History chart ──
  useEffect(() => {
    if (!chartRef.current || history.length < 2) return;

    const container = chartRef.current;
    const chart: IChartApi = createChart(container, {
      width: container.clientWidth,
      height: 360,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#6b7280',
      },
      grid: { vertLines: { color: '#f3f4f6' }, horzLines: { color: '#f3f4f6' } },
      rightPriceScale: { borderColor: '#e5e7eb', scaleMargins: { top: 0.05, bottom: 0.05 } },
      timeScale: { borderColor: '#e5e7eb', timeVisible: true, secondsVisible: false },
      crosshair: {
        vertLine: { color: '#9ca3af', style: 1, width: 1, labelVisible: true, labelBackgroundColor: '#1f2937' },
        horzLine: { color: '#9ca3af', style: 1, width: 1, labelVisible: true, labelBackgroundColor: '#1f2937' },
      },
    });

    const toTime = (iso: string): Time => (Math.floor(new Date(iso).getTime() / 1000) as Time);

    const buyH: LineData[] = history.map((s) => ({ time: toTime(s.fetchedAt), value: parseRate(s.buy) }));
    const sellH: LineData[] = history.map((s) => ({ time: toTime(s.fetchedAt), value: parseRate(s.sell) }));
    const txH: LineData[] = history.map((s) => ({ time: toTime(s.fetchedAt), value: parseRate(s.transfer) }));

    chart.addSeries(LineSeries, { color: '#22c55e', lineWidth: 2, priceFormat: { type: 'price', precision: 0, minMove: 1 }, lastValueVisible: true }).setData(buyH);
    chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 2, priceFormat: { type: 'price', precision: 0, minMove: 1 }, lastValueVisible: true }).setData(sellH);
    chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2, priceFormat: { type: 'price', precision: 0, minMove: 1 }, lastValueVisible: true }).setData(txH);

    chart.timeScale().fitContent();

    const onResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.remove(); };
  }, [history]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">FX Rates vs VND</h1>
        <div className="flex items-center gap-3">
          {!showAll && (
            <button
              onClick={loadAllRates}
              className="text-sm text-blue-600 hover:underline cursor-pointer"
            >
              Show all currencies
            </button>
          )}
          {showAll && (
            <button
              onClick={() => setShowAll(false)}
              className="text-sm text-gray-500 hover:underline cursor-pointer"
            >
              Hide all
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>
      )}

      {/* Currency selector + current rate snapshot */}
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          Currency
          <select
            value={selectedCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(showAll ? rates.map((r) => r.currencyCode) : POPULAR_CODES).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        {loading ? (
          <span className="text-sm text-gray-400">Loading…</span>
        ) : currentRate ? (
          <div className="flex items-center gap-5 text-sm">
            <span>
              <span className="text-gray-400">Bid</span>{' '}
              <span className="font-mono font-medium text-green-600">{parseRate(currentRate.buy).toLocaleString()}</span>
            </span>
            <span>
              <span className="text-gray-400">Transfer</span>{' '}
              <span className="font-mono font-medium text-blue-600">{parseRate(currentRate.transfer).toLocaleString()}</span>
            </span>
            <span>
              <span className="text-gray-400">Ask</span>{' '}
              <span className="font-mono font-medium text-red-600">{parseRate(currentRate.sell).toLocaleString()}</span>
            </span>
            <span className="text-xs text-gray-400">
              Spread: {parseRate(currentRate.sell) - parseRate(currentRate.buy) > 0 ? (parseRate(currentRate.sell) - parseRate(currentRate.buy)).toLocaleString() : '—'}
            </span>
          </div>
        ) : null}
      </div>

      {/* Legend + History chart */}
      <div className="flex items-center gap-5 mb-2 text-xs font-medium text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-500 rounded-full inline-block" /> Bid</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 rounded-full inline-block" /> Transfer</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-500 rounded-full inline-block" /> Ask</span>
        <span className="ml-auto">{selectedCode} — {currentRate?.currencyName || 'History'}</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4 overflow-hidden">
        {historyLoading ? (
          <div className="h-[360px] flex items-center justify-center text-sm text-gray-400">Loading history…</div>
        ) : history.length < 2 ? (
          <div className="h-[360px] flex items-center justify-center text-sm text-gray-400">
            {history.length === 0
              ? 'No historical data yet. Wait for the next refresh cycle.'
              : 'Need at least 2 data points for a chart.'}
          </div>
        ) : (
          <div ref={chartRef} />
        )}
      </div>

      {/* All-currencies table (only when expanded) */}
      {showAll && rates.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-500 w-16">Code</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Name</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Bid</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Transfer</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Ask</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500">Spread</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rates.map((r) => {
                const buy = parseRate(r.buy);
                const sell = parseRate(r.sell);
                const spread = sell - buy;
                const isSel = r.currencyCode === selectedCode;
                return (
                  <tr
                    key={r.currencyCode}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSel ? 'bg-blue-50' : ''}`}
                    onClick={() => handleCodeChange(r.currencyCode)}
                  >
                    <td className="px-4 py-2 font-semibold">{r.currencyCode}</td>
                    <td className="px-4 py-2 text-gray-600">{r.currencyName || '—'}</td>
                    <td className="px-4 py-2 text-right font-mono text-green-600">{buy.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-mono text-blue-600">{parseRate(r.transfer).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-mono text-red-600">{sell.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-mono text-gray-400 text-xs">{spread > 0 ? spread.toLocaleString() : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Source: Vietcombank — refreshed periodically.
        {!showAll && ' Click "Show all currencies" to compare.'}
      </p>
    </div>
  );
}
