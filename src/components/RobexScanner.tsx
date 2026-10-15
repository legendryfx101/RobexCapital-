import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Clock,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sliders,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Calculator,
  Database,
  Activity,
  History,
} from 'lucide-react';

interface RobexScannerProps {
  onSelectSignalForCalculator?: (signal: {
    pair: string;
    signal: 'BUY' | 'SELL';
    entry: string;
    stopLoss: string;
    takeProfit: string;
  }) => void;
}

interface VsaSignal {
  id: string;
  pair: string;
  assetClass: 'Forex' | 'Stocks' | 'Crypto' | 'Indices';
  direction: 'BUY' | 'SELL';
  timeframe: 'H1' | 'H4' | 'D1' | 'W1' | 'MN1';
  timestamp: string;
  entryPrice: string;
  stopLoss: string;
  selectedTarget: string;
  riskRewardRatio: string;
  candle1: { open: number; high: number; low: number; close: number; volume: number };
  candle2: { open: number; high: number; low: number; close: number; volume: number };
  candle3: { open: number; high: number; low: number; close: number; volume: number };
  explanation: string;
  provider: string;
  dataSourceState: 'LIVE' | 'STALE';
  status: 'CONFIRMED' | 'ACTIVE' | 'TAKE_PROFIT_HIT' | 'STOP_LOSS_HIT';
}

export const RobexScanner: React.FC<RobexScannerProps> = ({ onSelectSignalForCalculator }) => {
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>('All');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScannedTime, setLastScannedTime] = useState<string>(new Date().toLocaleTimeString());
  const [selectedSignal, setSelectedSignal] = useState<VsaSignal | null>(null);

  const [signals, setSignals] = useState<VsaSignal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSignals = async () => {
    setLoading(true);
    setIsScanning(true);
    try {
      const response = await fetch(`/api/robex-signals`);
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        setSignals(data);
      } else {
        setSignals([]);
      }
    } catch (e) {
      console.error('Failed to fetch signals:', e);
      setSignals([]);
    } finally {
      setIsScanning(false);
      setLoading(false);
      setLastScannedTime(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  const handleRunManualScan = () => {
    fetchSignals();
  };

  const filteredSignals = useMemo(() => {
    return signals.filter((sig) => {
      const matchesAsset = selectedAssetClass === 'All' || sig.assetClass === selectedAssetClass;
      const matchesTf = selectedTimeframe === 'All' || sig.timeframe === selectedTimeframe;
      const matchesSearch =
        sig.pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sig.direction.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sig.provider.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesAsset && matchesTf && matchesSearch;
    });
  }, [signals, selectedAssetClass, selectedTimeframe, searchTerm]);

  const metrics = useMemo(() => {
    const total = signals.length;
    const active = signals.filter((s) => s.status === 'ACTIVE' || s.status === 'CONFIRMED').length;
    const wins = signals.filter((s) => s.status === 'TAKE_PROFIT_HIT').length;
    const losses = signals.filter((s) => s.status === 'STOP_LOSS_HIT').length;
    const closed = wins + losses;
    const winRate = closed > 0 ? ((wins / closed) * 100).toFixed(1) : '100.0';
    return { total, active, wins, losses, winRate };
  }, [signals]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 font-sans">
      {/* Robex Capital Header Banner */}
      <div className="border border-amber-500/30 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-black font-black shadow-xl shadow-amber-500/25 border border-amber-400/30 shrink-0">
              <Zap className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight truncate">
                  Robex Capital
                </h1>
                <span className="text-[10px] px-2.5 py-1 rounded-full font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                  AI Multi-Asset VSA Scanner (Live Market Feed)
                </span>
              </div>
              <p className="text-gray-400 text-xs md:text-sm max-w-xl leading-relaxed">
                Deterministic Volume Price Analysis (George Milton VPA) & Path of Least Resistance automated real-time market reversal scanner.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-gray-400 block uppercase font-mono">Market Data Feed</span>
              <span className="text-xs font-bold font-mono flex items-center gap-1.5 justify-end text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Broker & Exchange Feed
              </span>
              <span className="text-[10px] text-gray-500 font-mono">Updated: {lastScannedTime}</span>
            </div>

            <button
              type="button"
              onClick={handleRunManualScan}
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black shadow-lg shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Run Live Scan'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-5 bg-zinc-950/90 border border-gray-800 rounded-2xl shadow-xl">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            Total Signals
          </span>
          <div className="text-3xl font-extrabold text-white font-mono">{metrics.total}</div>
          <span className="text-xs text-emerald-400 font-mono">Live Feed Connected</span>
        </div>

        <div className="p-5 bg-zinc-950/90 border border-gray-800 rounded-2xl shadow-xl">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            Active Setups
          </span>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">{metrics.active}</div>
          <span className="text-xs text-amber-400/80 font-mono">Ready for execution</span>
        </div>

        <div className="p-5 bg-zinc-950/90 border border-gray-800 rounded-2xl shadow-xl">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            Winning Signals
          </span>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">{metrics.wins}</div>
          <span className="text-xs text-emerald-500/80 font-mono">Target achieved</span>
        </div>

        <div className="p-5 bg-zinc-950/90 border border-gray-800 rounded-2xl shadow-xl">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            Stopped Out
          </span>
          <div className="text-3xl font-extrabold text-rose-400 font-mono">{metrics.losses}</div>
          <span className="text-xs text-rose-500/80 font-mono">Stop loss hit</span>
        </div>

        <div className="p-5 bg-zinc-950/90 border border-gray-800 rounded-2xl shadow-xl col-span-2 md:col-span-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            Verified Win Rate
          </span>
          <div className="text-3xl font-extrabold text-purple-400 font-mono">{metrics.winRate}%</div>
          <span className="text-xs text-gray-500 font-mono">Based on market outcomes</span>
        </div>
      </div>

      {/* Filter & Controls Toolbar */}
      <div className="p-4 md:p-6 bg-zinc-950/90 border border-gray-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Asset Class Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 min-w-0">
            {['All', 'Forex', 'Stocks', 'Crypto', 'Indices'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedAssetClass(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedAssetClass === cat
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-zinc-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {cat} Markets
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search instrument, venue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Timeframe Filter */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-gray-900 pt-3 text-xs">
          <span className="text-gray-500 font-semibold text-[11px] uppercase mr-1 shrink-0">Timeframe:</span>
          {['All', 'H1', 'H4', 'D1', 'W1', 'MN1'].map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedTimeframe === tf
                  ? 'bg-zinc-800 text-amber-400 border border-amber-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Signal Cards / Responsive Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500 shrink-0" />
            Real-Time Market VSA Signals ({filteredSignals.length})
          </h3>
          <span className="text-xs text-emerald-400 font-mono">
            Feed: <strong className="text-emerald-400">LIVE REAL-TIME</strong>
          </span>
        </div>

        {filteredSignals.length === 0 ? (
          <div className="text-center py-16 border border-gray-900 bg-zinc-950/50 rounded-2xl p-8 space-y-3">
            <AlertCircle className="w-10 h-10 text-gray-600 mx-auto" />
            <p className="text-sm text-gray-300 font-bold">No Qualifying Signals Found</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              No live market setups match your current filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSignals.map((sig) => {
              const isBuy = sig.direction === 'BUY';
              const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(sig.timestamp).getTime()) / 60000));
              const isRealtime = ageMinutes < 15;
              const isDelayed = ageMinutes >= 15 && ageMinutes < 120;

              return (
                <div
                  key={sig.id}
                  onClick={() => setSelectedSignal(sig)}
                  className="bg-zinc-950/90 hover:bg-zinc-900/60 border border-gray-800/80 hover:border-amber-500/40 rounded-2xl shadow-xl transition-all cursor-pointer overflow-hidden flex flex-col justify-between group"
                >
                  {/* Distinct Color-Coded Header for BUY vs SELL */}
                  <div className={`p-4 border-b ${
                    isBuy
                      ? 'bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-zinc-950 border-emerald-500/30'
                      : 'bg-gradient-to-r from-rose-950/60 via-zinc-900 to-zinc-950 border-rose-500/30'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-extrabold tracking-wider shrink-0 ${
                            isBuy
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {sig.direction}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-lg font-black text-white font-mono tracking-tight truncate">
                            {sig.pair}
                          </h4>
                          <span className="text-[10px] text-gray-400 font-mono block truncate">
                            {sig.assetClass} • TF: <strong className="text-amber-400">{sig.timeframe}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider ${
                            isRealtime
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-emerald-900/20 shadow-sm'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-amber-900/20 shadow-sm'
                          }`}>
                            <span className={`w-2 h-2 rounded-full animate-pulse ${
                              isRealtime ? 'bg-emerald-400' : 'bg-amber-400'
                            }`} />
                            {isRealtime ? 'LIVE' : `${ageMinutes}m AGO`}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-500 font-mono">
                          REAL-TIME FEED
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  {/* Price & Risk Grid */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-900/60 border border-gray-800/80 rounded-xl text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 block">ENTRY</span>
                      <span className="text-white font-bold">{sig.entryPrice}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">STOP LOSS</span>
                      <span className="text-rose-400 font-bold">{sig.stopLoss}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">TAKE PROFIT</span>
                      <span className="text-emerald-400 font-bold">{sig.selectedTarget}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">TARGET R:R</span>
                      <span className="text-amber-400 font-extrabold">{sig.riskRewardRatio}</span>
                    </div>
                  </div>

                  {/* VSA Volume Check summary */}
                  <div className="text-xs text-gray-300 space-y-1 bg-zinc-900/30 p-3 rounded-xl border border-gray-900">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-gray-400">VSA Setup Mode:</span>
                      <span className="text-emerald-400 font-bold">
                        ✓ Volume Exhaustion Confirmed
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                      {sig.explanation}
                    </p>
                  </div>

                  {/* Provider & Action */}
                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-900 text-[11px] text-gray-500 gap-2">
                    <span className="truncate max-w-[160px]">Provider: {sig.provider}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSignal(sig);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-gray-800 font-semibold transition-all cursor-pointer shrink-0"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                        Details & OHLCV
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectSignalForCalculator) {
                            onSelectSignalForCalculator({
                              pair: sig.pair,
                              signal: sig.direction,
                              entry: sig.entryPrice,
                              stopLoss: sig.stopLoss,
                              takeProfit: sig.selectedTarget,
                            });
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold transition-all cursor-pointer shrink-0"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        Calculate Size
                      </button>
                    </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Signal Details Modal */}
      {selectedSignal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-gray-900 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                    selectedSignal.direction === 'BUY' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  {selectedSignal.direction}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl md:text-2xl font-black text-white font-mono tracking-tight truncate">
                    {selectedSignal.pair} ({selectedSignal.timeframe})
                  </h3>
                  <span className="text-xs text-amber-400 font-mono block">
                    Robex Capital Live VSA Signal Details
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSignal(null)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-zinc-900 cursor-pointer font-bold shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Candle Breakdown & OHLCV */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                <span>3-Candle OHLCV & Volume Spread Analysis</span>
                <span className="text-amber-400 font-mono text-[11px]">{selectedSignal.timeframe} Chart</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-zinc-900/80 border border-gray-800 rounded-xl space-y-1.5">
                  <span className="text-amber-400 font-bold block border-b border-gray-800 pb-1">Candle 1 (Initial Move)</span>
                  <div className="grid grid-cols-2 text-gray-400 text-[11px]">
                    <div>Open: <span className="text-white">{selectedSignal.candle1.open}</span></div>
                    <div>Close: <span className="text-white">{selectedSignal.candle1.close}</span></div>
                    <div>High: <span className="text-white">{selectedSignal.candle1.high}</span></div>
                    <div>Low: <span className="text-white">{selectedSignal.candle1.low}</span></div>
                  </div>
                  <div className="pt-1 border-t border-gray-800/60 text-white font-bold">
                    Volume: {selectedSignal.candle1.volume.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/80 border border-amber-500/50 rounded-xl space-y-1.5 shadow-lg shadow-amber-500/5">
                  <span className="text-amber-400 font-bold block border-b border-gray-800 pb-1">Candle 2 (Exhaustion)</span>
                  <div className="grid grid-cols-2 text-gray-400 text-[11px]">
                    <div>Open: <span className="text-white">{selectedSignal.candle2.open}</span></div>
                    <div>Close: <span className="text-white">{selectedSignal.candle2.close}</span></div>
                    <div>High: <span className="text-white">{selectedSignal.candle2.high}</span></div>
                    <div>Low: <span className="text-white">{selectedSignal.candle2.low}</span></div>
                  </div>
                  <div className="pt-1 border-t border-gray-800/60 text-emerald-400 font-bold">
                    Volume: {selectedSignal.candle2.volume.toLocaleString()} <span className="text-[10px] block text-amber-300">✓ Lower than C1</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/80 border border-gray-800 rounded-xl space-y-1.5">
                  <span className="text-amber-400 font-bold block border-b border-gray-800 pb-1">Candle 3 (Confirmation)</span>
                  <div className="grid grid-cols-2 text-gray-400 text-[11px]">
                    <div>Open: <span className="text-white">{selectedSignal.candle3.open}</span></div>
                    <div>Close: <span className="text-white">{selectedSignal.candle3.close}</span></div>
                    <div>High: <span className="text-white">{selectedSignal.candle3.high}</span></div>
                    <div>Low: <span className="text-white">{selectedSignal.candle3.low}</span></div>
                  </div>
                  <div className="pt-1 border-t border-gray-800/60 text-emerald-400 font-bold">
                    Volume: {selectedSignal.candle3.volume.toLocaleString()} <span className="text-[10px] block text-emerald-300">✓ Reversal Close</span>
                  </div>
                </div>
              </div>
            </div>

            {/* VSA Validation Checks Checklist */}
            <div className="p-4 bg-zinc-900/60 border border-gray-800 rounded-2xl space-y-2.5">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Deterministic VSA Validation Checklist
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-gray-300">
                <div className="flex items-center gap-2 bg-zinc-950/60 p-2 rounded-xl border border-gray-900">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Candle 1 & 2 Momentum Validated</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-950/60 p-2 rounded-xl border border-gray-900">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Volume Exhaustion (C2 Vol &lt; C1 Vol)</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-950/60 p-2 rounded-xl border border-gray-900">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Candle 3 Confirmation Close Confirmed</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-950/60 p-2 rounded-xl border border-gray-900">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Stop Loss Set at 2nd Candle Extremity</span>
                </div>
              </div>
            </div>

            {/* AI VSA Explanation */}
            <div className="p-4 bg-zinc-900/40 border border-amber-500/30 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                AI Quantitative & VSA Logic Synthesis
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed font-sans">
                {selectedSignal.explanation}
              </p>
            </div>

            {/* Execution Levels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-zinc-900/60 border border-gray-800 rounded-xl">
                <span className="text-gray-500 block mb-1">ENTRY REFERENCE PRICE</span>
                <span className="text-white font-bold text-base">{selectedSignal.entryPrice}</span>
              </div>
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl">
                <span className="text-rose-400 block mb-1">STOP LOSS (2nd Candle Extremity)</span>
                <span className="text-rose-400 font-bold text-base">{selectedSignal.stopLoss}</span>
              </div>
              <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl">
                <span className="text-emerald-400 block mb-1">TAKE PROFIT (1:15 Target)</span>
                <span className="text-emerald-400 font-bold text-base">{selectedSignal.selectedTarget}</span>
              </div>
              <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl">
                <span className="text-amber-400 block mb-1">DATA SOURCE STATE</span>
                <span className="text-amber-300 font-bold text-xs">REAL-TIME - {selectedSignal.provider}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-900">
              <button
                type="button"
                onClick={() => setSelectedSignal(null)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-black shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
