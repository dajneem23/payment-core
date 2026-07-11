import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  createSeriesMarkers,
  LineSeries,
  type IChartApi,
  type LineData,
  type Time,
  ColorType,
} from 'lightweight-charts';
import * as fxApi from '../api/fx';
import type { FxRate, FxRateSnapshot } from '../types';

function parseRate(v: string | null): number {
  if (!v) return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function FxRates() {
  const compareRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const [rates, setRates] = useState<FxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [history, setHistory] = useState<FxRateSnapshot[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchRates = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fxApi.getAllRates();
      setRates(data);
      // Auto-select USD (or first) if nothing selected yet
      if (!selectedCode && data.length > 0) {
        const pref = data.find((r) => r.currencyCode === 'USD') ?? data[0];
        setSelectedCode(pref.currencyCode);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load FX rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // Fetch history when selected currency changes
  useEffect(() => {
    if (!selectedCode) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    fxApi
      .getRateHistory(selectedCode)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [selectedCode]);

  const selected = rates.find((r) => r.currencyCode === selectedCode) ?? null;

  // ── Comparison chart (all currencies, latest snapshot) ──
  useEffect(() => {
    if (!compareRef.current || rates.length === 0) return;

    const container = compareRef.current;
    const chart: IChartApi = createChart(container, {
      width: container.clientWidth,
      height: 280,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
      timeScale: { borderColor: '#e5e7eb', tickMarkFormatter: () => '' },
      crosshair: {
        vertLine: { color: '#9ca3af', style: 1, width: 1, labelVisible: false },
        horzLine: { color: '#9ca3af', style: 1, width: 1, labelVisible: true, labelBackgroundColor: '#1f2937' },
      },
    });

    const baseTime = new Date('2026-01-01').getTime();
    const dayMs = 86_400_000;

    const buyData: LineData[] = [];
    const sellData: LineData[] = [];
    const transferData: LineData[] = [];
    const markers: { time: Time; position: 'aboveBar'; color: string; shape: 'circle'; size: number; text: string }[] = [];

    rates.forEach((r, i) => {
      const time = Math.floor((baseTime + i * dayMs) / 1000) as Time;
      buyData.push({ time, value: parseRate(r.buy) });
      sellData.push({ time, value: parseRate(r.sell) });
      transferData.push({ time, value: parseRate(r.transfer) });
      const isSel = r.currencyCode === selectedCode;
      markers.push({
        time,
        position: 'aboveBar',
        color: isSel ? '#3b82f6' : '#9ca3af',
        shape: 'circle',
        size: isSel ? 3 : 2,
        text: r.currencyCode,
      });
    });

    const buyS = chart.addSeries(LineSeries, { color: '#22c55e', lineWidth: 2, priceFormat: { type: 'price', precision: 0, minMove: 1 }, lastValueVisible: false });
    buyS.setData(buyData);
    createSeriesMarkers(buyS, markers);

    chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 2, priceFormat: { type: 'price', precision: 0, minMove: 1 }, lastValueVisible: false }).setData(sellData);
    chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2, priceFormat: { type: 'price', precision: 0, minMove: 1 }, lastValueVisible: false }).setData(transferData);

    chart.timeScale().fitContent();

    chart.subscribeClick((param) => {
      if (!param.time) return;
      const idx = buyData.findIndex((d) => d.time === param.time);
      if (idx >= 0 && idx < rates.length) setSelectedCode(rates[idx].currencyCode);
    });

    const onResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.remove(); };
  }, [rates, selectedCode]);

  // ── History chart (time-series for selected currency) ──
  useEffect(() => {
    if (!historyRef.current || history.length < 2) return;

    const container = historyRef.current;
    const chart: IChartApi = createChart(container, {
      width: container.clientWidth,
      height: 280,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { color: '#f3f4f6' },
        horzLines: { color: '#f3f4f6' },
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
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
          <button
            onClick={fetchRates}
            disabled={loading}
            className="text-sm text-blue-600 hover:underline cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>
      )}

      {/* Currency selector */}
      {rates.length > 0 && (
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            Currency
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {rates.map((r) => (
                <option key={r.currencyCode} value={r.currencyCode}>
                  {r.currencyCode} — {r.currencyName || 'Unknown'}
                </option>
              ))}
            </select>
          </label>

          {/* Selected rate snapshot */}
          {selected && (
            <div className="flex items-center gap-5 text-sm ml-4">
              <span>
                <span className="text-gray-400">Bid</span>{' '}
                <span className="font-mono font-medium text-green-600">{parseRate(selected.buy).toLocaleString()}</span>
              </span>
              <span>
                <span className="text-gray-400">Transfer</span>{' '}
                <span className="font-mono font-medium text-blue-600">{parseRate(selected.transfer).toLocaleString()}</span>
              </span>
              <span>
                <span className="text-gray-400">Ask</span>{' '}
                <span className="font-mono font-medium text-red-600">{parseRate(selected.sell).toLocaleString()}</span>
              </span>
              <span className="text-xs text-gray-400">
                Spread: {parseRate(selected.sell) - parseRate(selected.buy) > 0 ? (parseRate(selected.sell) - parseRate(selected.buy)).toLocaleString() : '—'}
              </span>
            </div>
          )}
        </div>
      )}

      {rates.length > 0 && (
        <>
          {/* History chart for selected currency */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100">
              <h2 className="text-sm font-semibold">
                {selectedCode} History
                {selected?.currencyName && <span className="text-gray-400 font-normal ml-1">— {selected.currencyName}</span>}
              </h2>
            </div>
            {historyLoading ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-gray-400">
                Loading history…
              </div>
            ) : history.length < 2 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-gray-400">
                {history.length === 0
                  ? 'No historical data yet. Wait for the next refresh cycle.'
                  : 'Need at least 2 data points for a chart.'}
              </div>
            ) : (
              <div ref={historyRef} />
            )}
          </div>

          {/* Legend + Comparison chart */}
          <div className="flex items-center gap-5 mb-2 text-xs font-medium text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-500 rounded-full inline-block" /> Bid</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 rounded-full inline-block" /> Transfer</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-500 rounded-full inline-block" /> Ask</span>
            <span className="ml-auto">All currencies — click to select</span>
          </div>

          <div ref={compareRef} className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4 overflow-hidden" />

          {/* Table */}
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
                      onClick={() => setSelectedCode(r.currencyCode)}
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
        </>
      )}

      {!loading && rates.length === 0 && !error && (
        <p className="text-gray-400 text-sm py-4">No rates available. The FX service may not have fetched data yet.</p>
      )}

      {rates.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          Source: Vietcombank — refreshed periodically.
        </p>
      )}
    </div>
  );
}
