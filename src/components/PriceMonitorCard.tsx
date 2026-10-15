import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Award,
  RefreshCw,
  Play,
  Pause,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Flame,
} from 'lucide-react';
import type { ForexAnalysisRecord } from '../firebase';
import type { MarketPriceResult } from '../../server/priceService';

interface PriceMonitorCardProps {
  analysis: ForexAnalysisRecord;
  onResolveTrade?: (outcome: 'WIN' | 'LOSS' | 'BREAKEVEN', details: string, pnlAmount?: string) => void;
}

export const PriceMonitorCard: React.FC<PriceMonitorCardProps> = ({
  analysis,
  onResolveTrade,
}) => {
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [high24h, setHigh24h] = useState<number | null>(null);
  const [low24h, setLow24h] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoMonitor, setAutoMonitor] = useState<boolean>(true);
  const [lastTickDir, setLastTickDir] = useState<'up' | 'down' | 'same'>('same');
  const [resolvedStatus, setResolvedStatus] = useState<'WIN' | 'LOSS' | 'BREAKEVEN' | 'PENDING'>(
    (analysis.trade_outcome as any) || 'PENDING'
  );
  const [resolvedMessage, setResolvedMessage] = useState<string | null>(null);

  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    setResolvedStatus(analysis.trade_outcome || 'PENDING');
    setResolvedMessage(null);
  }, [analysis.id, analysis.trade_outcome]);

  // Parse numeric values from the analysis
  const entryNum = parseFloat(analysis.entry_price?.replace(/[^0-9.]/g, '') || '0');
  const slNum = parseFloat(analysis.stop_loss?.replace(/[^0-9.]/g, '') || '0');
  const tpNum = parseFloat(
    (analysis.take_profit_1 || analysis.take_profit_2 || analysis.take_profit_3 || '').replace(
      /[^0-9.]/g,
      ''
    ) || '0'
  );

  const isBuy = analysis.signal === 'BUY';
  const isSell = analysis.signal === 'SELL';

  // Calculate Risk-Reward Ratio
  const riskDistance = Math.abs(entryNum - slNum);
  const rewardDistance = Math.abs(tpNum - entryNum);
  const calculatedRR =
    riskDistance > 0 && rewardDistance > 0
      ? (rewardDistance / riskDistance).toFixed(1)
      : '10.0';

  const fetchCurrentPrice = async () => {
    try {
      const res = await fetch(`/api/market-price?pair=${encodeURIComponent(analysis.pair)}`);
      if (!res.ok) throw new Error('Failed to fetch price');
      const data: MarketPriceResult = await res.json();

      const newP = data.currentPrice;
      if (prevPriceRef.current !== null) {
        if (newP > prevPriceRef.current) setLastTickDir('up');
        else if (newP < prevPriceRef.current) setLastTickDir('down');
      }
      prevPriceRef.current = newP;

      setMarketPrice(newP);
      setHigh24h(data.high24h);
      setLow24h(data.low24h);
      setLoading(false);

      // Trade outcomes are marked manually by user preference
    } catch (err) {
      console.warn('Price monitor fetch error:', err);
      setLoading(false);
    }
  };

  const evaluatePriceTriggers = (currentP: number) => {
    if (resolvedStatus !== 'PENDING' || entryNum <= 0 || slNum <= 0 || tpNum <= 0) return;

    if (isBuy) {
      if (currentP >= tpNum) {
        triggerTradeOutcome('WIN', currentP, tpNum);
      } else if (currentP <= slNum) {
        triggerTradeOutcome('LOSS', currentP, slNum);
      }
    } else if (isSell) {
      if (currentP <= tpNum) {
        triggerTradeOutcome('WIN', currentP, tpNum);
      } else if (currentP >= slNum) {
        triggerTradeOutcome('LOSS', currentP, slNum);
      }
    }
  };

  const triggerTradeOutcome = (outcome: 'WIN' | 'LOSS' | 'BREAKEVEN', hitPrice: number, targetLevel: number) => {
    setResolvedStatus(outcome);
    const pnlR = outcome === 'WIN' ? `+${calculatedRR}R` : outcome === 'BREAKEVEN' ? `0.0R` : `-1.0R`;
    const msg =
      outcome === 'WIN'
        ? `Target Achieved: Market reached Take Profit at ${targetLevel.toFixed(
            4
          )}! Signal automatically recorded as WIN (${pnlR}).`
        : outcome === 'BREAKEVEN'
        ? `Break-Even Triggered: Market closed at Entry/BE level ${targetLevel.toFixed(
            4
          )}. Signal recorded as BREAK-EVEN (${pnlR}).`
        : `Stop Hit: Market reached Stop Loss at ${targetLevel.toFixed(
            4
          )}. Signal automatically recorded as LOSS (${pnlR}).`;

    setResolvedMessage(msg);

    // Browser Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`Trade Auto-Resolved: ${analysis.pair} [${outcome}]`, {
        body: msg,
      });
    }

    if (onResolveTrade) {
      onResolveTrade(outcome, msg, pnlR);
    }
  };

  // Auto-polling interval
  useEffect(() => {
    fetchCurrentPrice();
    if (!autoMonitor || resolvedStatus !== 'PENDING') return;

    const interval = setInterval(() => {
      fetchCurrentPrice();
    }, 4000);

    return () => clearInterval(interval);
  }, [analysis.pair, autoMonitor, resolvedStatus]);

  // Simulation controls for user verification
  const handleSimulateTP = () => {
    if (tpNum <= 0) return;
    const simPrice = isBuy ? tpNum + 0.0005 : tpNum - 0.0005;
    setMarketPrice(simPrice);
    triggerTradeOutcome('WIN', simPrice, tpNum);
  };

  const handleSimulateSL = () => {
    if (slNum <= 0) return;
    const simPrice = isBuy ? slNum - 0.0005 : slNum + 0.0005;
    setMarketPrice(simPrice);
    triggerTradeOutcome('LOSS', simPrice, slNum);
  };

  const handleSimulateBE = () => {
    if (entryNum <= 0) return;
    setMarketPrice(entryNum);
    triggerTradeOutcome('BREAKEVEN', entryNum, entryNum);
  };

  const handleResetMonitoring = () => {
    setResolvedStatus('PENDING');
    setResolvedMessage(null);
    setAutoMonitor(true);
    fetchCurrentPrice();
  };

  // Calculate Progress towards TP (%)
  const calculateProgress = () => {
    if (!marketPrice || entryNum <= 0 || tpNum <= 0 || slNum <= 0) return 50;
    if (isBuy) {
      const totalRange = tpNum - slNum;
      if (totalRange <= 0) return 50;
      const progress = ((marketPrice - slNum) / totalRange) * 100;
      return Math.min(Math.max(progress, 0), 100);
    } else {
      const totalRange = slNum - tpNum;
      if (totalRange <= 0) return 50;
      const progress = ((slNum - marketPrice) / totalRange) * 100;
      return Math.min(Math.max(progress, 0), 100);
    }
  };

  const progressPct = calculateProgress();
  const decimals = entryNum > 100 ? 2 : 4;

  return (
    <div className="border border-gray-800 bg-zinc-950/90 backdrop-blur shadow-2xl rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-900 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Live Market Price & Signal Tracker
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                1:{calculatedRR} R:R Target
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Tracks live market prices and distance to TP/SL. Trade signal results are <span className="text-amber-400 font-semibold">marked manually by you</span> in the journal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoMonitor((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              autoMonitor
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-900 text-gray-400 border-gray-800'
            }`}
            title={autoMonitor ? 'Pause price tracking' : 'Resume live price tracking'}
          >
            {autoMonitor ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
            <span>{autoMonitor ? 'Live Polling Active' : 'Polling Paused'}</span>
          </button>

          <button
            type="button"
            onClick={fetchCurrentPrice}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-amber-400 bg-zinc-900 border border-gray-800 rounded-lg transition-colors cursor-pointer"
            title="Refresh current price quote"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Outcome Resolution Alert Banner */}
        {resolvedStatus === 'WIN' && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3 text-emerald-300 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block">
                  🎉 Take Profit Hit — Trade Closed as WIN!
                </span>
                <p className="text-xs text-emerald-200/90 leading-snug">
                  {resolvedMessage || `Price touched Take Profit (${analysis.take_profit_1}). Realized +${calculatedRR}R Profit recorded in your Trade Journal.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetMonitoring}
              className="text-[11px] underline text-emerald-400 hover:text-white flex-shrink-0 cursor-pointer"
            >
              Re-monitor
            </button>
          </div>
        )}

        {resolvedStatus === 'LOSS' && (
          <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center justify-between gap-3 text-rose-300 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block">
                  ⚠️ Stop Loss Hit — Trade Closed as LOSS!
                </span>
                <p className="text-xs text-rose-200/90 leading-snug">
                  {resolvedMessage || `Price touched Stop Loss (${analysis.stop_loss}). Recorded as -1.0R loss in your Trade Journal.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetMonitoring}
              className="text-[11px] underline text-rose-400 hover:text-white flex-shrink-0 cursor-pointer"
            >
              Re-monitor
            </button>
          </div>
        )}

        {resolvedStatus === 'BREAKEVEN' && (
          <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3 text-amber-300 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block">
                  ⚖️ Trade Closed at Break-Even (0.0R)!
                </span>
                <p className="text-xs text-amber-200/90 leading-snug">
                  {resolvedMessage || `Price reached Entry/Break-Even point (${analysis.entry_price}). Recorded as Break-Even (0.0R) with preserved capital.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetMonitoring}
              className="text-[11px] underline text-amber-400 hover:text-white flex-shrink-0 cursor-pointer"
            >
              Re-monitor
            </button>
          </div>
        )}

        {/* Live Price Quote & Targets Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Current Live Price */}
          <div className="p-3.5 bg-zinc-900/60 border border-gray-800 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Live Market Price
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  lastTickDir === 'up'
                    ? 'bg-emerald-500 animate-ping'
                    : lastTickDir === 'down'
                    ? 'bg-rose-500 animate-ping'
                    : 'bg-amber-500'
                }`}
              />
            </div>
            <div className="text-xl font-extrabold text-white font-mono tracking-tight flex items-center gap-1.5">
              {marketPrice !== null ? marketPrice.toFixed(decimals) : '--'}
              {lastTickDir === 'up' ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : lastTickDir === 'down' ? (
                <TrendingDown className="w-4 h-4 text-rose-400" />
              ) : null}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">
              {analysis.pair} Quote
            </span>
          </div>

          {/* Entry Price */}
          <div className="p-3.5 bg-zinc-900/60 border border-gray-800 rounded-xl">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              Order Entry
            </span>
            <div className="text-xl font-extrabold text-white font-mono tracking-tight">
              {analysis.entry_price || '--'}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">
              Signal: <span className={isBuy ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{analysis.signal}</span>
            </span>
          </div>

          {/* Stop Loss Level */}
          <div className="p-3.5 bg-rose-950/20 border border-rose-900/40 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                Stop Loss (1R)
              </span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-extrabold text-rose-400 font-mono tracking-tight">
              {analysis.stop_loss || '--'}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">
              Risk: {riskDistance > 0 ? (riskDistance * (entryNum > 100 ? 100 : 10000)).toFixed(0) : '--'} pips
            </span>
          </div>

          {/* Take Profit Target Level */}
          <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                TP1 Target (1:{calculatedRR}R)
              </span>
              <Award className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-emerald-400 font-mono tracking-tight">
              {analysis.take_profit_1 || '--'}
            </div>
            <div className="flex items-center justify-between text-[10px] text-emerald-400/80 font-mono font-bold">
              <span>+{rewardDistance > 0 ? (rewardDistance * (entryNum > 100 ? 100 : 10000)).toFixed(0) : '--'} pips</span>
              {analysis.take_profit_2 && <span className="text-gray-400 font-normal">TP2: {analysis.take_profit_2}</span>}
            </div>
          </div>
        </div>

        {/* Visual TP vs SL Live Progress Bar */}
        <div className="space-y-2 p-4 bg-zinc-900/40 border border-gray-900 rounded-xl">
          <div className="flex justify-between items-center text-xs font-mono">
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>SL: {analysis.stop_loss}</span>
            </div>
            <div className="text-gray-400 font-bold">
              Entry: {analysis.entry_price}
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>TP (1:{calculatedRR} R:R): {analysis.take_profit_1}</span>
            </div>
          </div>

          {/* Visual Track */}
          <div className="relative h-4 bg-zinc-900 rounded-full overflow-hidden border border-gray-800">
            {/* Background Zones */}
            <div className="absolute inset-0 flex">
              <div className="w-1/2 bg-gradient-to-r from-rose-950/50 to-zinc-900/40" />
              <div className="w-1/2 bg-gradient-to-r from-zinc-900/40 to-emerald-950/50" />
            </div>

            {/* Live Progress Bar */}
            <div
              className={`h-full transition-all duration-500 ${
                progressPct >= 50
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                  : 'bg-gradient-to-r from-rose-500 to-amber-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-gray-500 font-mono">
            <span>Loss Zone</span>
            <span className="text-gray-400 font-semibold">
              Live Market Tracking {progressPct.toFixed(1)}% to TP
            </span>
            <span>Target Profit Zone</span>
          </div>
        </div>

        {/* Manual Simulation Controls for Quick Verification */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-900 text-xs">
          <span className="text-[11px] text-gray-500 font-medium">
            Test Auto-Resolution Mechanism:
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateTP}
              className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
            >
              Simulate TP Hit (Win +10R)
            </button>

            <button
              type="button"
              onClick={handleSimulateBE}
              className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/40 text-amber-300 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
            >
              Simulate BE Hit (0R)
            </button>

            <button
              type="button"
              onClick={handleSimulateSL}
              className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-300 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
            >
              Simulate SL Hit (Loss -1R)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
