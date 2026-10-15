import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  ShieldAlert,
  Target,
  Clock,
  BarChart3,
  Download,
  Copy,
  Check,
  Zap,
  Percent,
  Layers,
  ShieldCheck,
  Compass,
  SlidersHorizontal,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import type { ForexAnalysisRecord } from '../firebase';
import { exportSignalToPDF } from '../utils/pdfExport';
import { VsaObservationReport } from './VsaObservationReport';

interface AnalysisCardProps {
  analysis: ForexAnalysisRecord | null;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis }) => {
  if (!analysis) return null;

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Position Sizing Simulator interactive state
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);

  // Parse numeric values from the analysis
  const entryNum = parseFloat(analysis.entry_price?.replace(/[^0-9.]/g, '') || '0');
  const slNum = parseFloat(analysis.stop_loss?.replace(/[^0-9.]/g, '') || '0');
  const tp1Num = parseFloat(analysis.take_profit_1?.replace(/[^0-9.]/g, '') || '0');
  const tp2Num = parseFloat(analysis.take_profit_2?.replace(/[^0-9.]/g, '') || '0');
  const tp3Num = parseFloat(analysis.take_profit_3?.replace(/[^0-9.]/g, '') || '0');

  const isBuy = analysis.signal === 'BUY';
  const isSell = analysis.signal === 'SELL';
  const decimals = (analysis.entry_price?.split('.')[1] || '0000').length;

  const isJpy = analysis.pair.toUpperCase().includes('JPY');
  const isGold = analysis.pair.toUpperCase().includes('XAU') || analysis.pair.toUpperCase().includes('GOLD');
  const pipMultiplier = isJpy ? 100 : isGold ? 10 : decimals >= 4 ? 10000 : 100;

  // Calculate dynamic risk and reward pips & R:R ratios
  const riskDistance = Math.abs(entryNum - slNum);
  const riskPips = riskDistance > 0 ? (riskDistance * pipMultiplier).toFixed(1) : null;

  const tp1Distance = tp1Num > 0 ? Math.abs(tp1Num - entryNum) : 0;
  const tp1Pips = tp1Distance > 0 ? (tp1Distance * pipMultiplier).toFixed(1) : null;
  const tp1RR = riskDistance > 0 && tp1Distance > 0 ? (tp1Distance / riskDistance).toFixed(1) : null;

  const tp2Distance = tp2Num > 0 ? Math.abs(tp2Num - entryNum) : 0;
  const tp2Pips = tp2Distance > 0 ? (tp2Distance * pipMultiplier).toFixed(1) : null;
  const tp2RR = riskDistance > 0 && tp2Distance > 0 ? (tp2Distance / riskDistance).toFixed(1) : null;

  const tp3Distance = tp3Num > 0 ? Math.abs(tp3Num - entryNum) : 0;
  const tp3Pips = tp3Distance > 0 ? (tp3Distance * pipMultiplier).toFixed(1) : null;
  const tp3RR = riskDistance > 0 && tp3Distance > 0 ? (tp3Distance / riskDistance).toFixed(1) : null;

  // Computed Position Sizing
  const sizing = useMemo(() => {
    const riskDollar = (accountBalance * riskPercent) / 100;
    const pips = riskPips ? parseFloat(riskPips) : 25;
    const pipValuePerLot = isJpy ? 7.0 : isGold ? 10.0 : 10.0;
    const standardLots = pips > 0 ? Math.max(0.01, parseFloat((riskDollar / (pips * pipValuePerLot)).toFixed(2))) : 0.1;

    const profitTP1 = tp1Pips ? (parseFloat(tp1Pips) * pipValuePerLot * standardLots * 0.5).toFixed(0) : null;
    const profitTP2 = tp2Pips ? (parseFloat(tp2Pips) * pipValuePerLot * standardLots * 0.3).toFixed(0) : null;
    const profitTP3 = tp3Pips ? (parseFloat(tp3Pips) * pipValuePerLot * standardLots * 0.2).toFixed(0) : null;

    return {
      riskDollar: riskDollar.toFixed(0),
      standardLots,
      profitTP1,
      profitTP2,
      profitTP3,
    };
  }, [accountBalance, riskPercent, riskPips, isJpy, isGold, tp1Pips, tp2Pips, tp3Pips]);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAllSignal = () => {
    if (!navigator.clipboard) return;
    const text = [
      `📊 ROBEXCAPITAL AI SIGNAL: ${analysis.signal} ${analysis.pair}`,
      `📌 Order Type: ${analysis.order_type || 'Market Execution'}`,
      `⏱ Timeframe: ${analysis.timeframe || 'H1'}`,
      `⏳ Timeframe Hierarchy (Bias ➔ Entry): Monthly➔Daily, Weekly➔4H, Daily➔1H, 4H➔15M, 1H➔5M, 30M➔1M`,
      `🎯 Entry: ${analysis.entry_price || '--'}`,
      `🛑 Stop Loss: ${analysis.stop_loss || '--'} (${riskPips ? `-${riskPips} pips` : ''}) [At recent low/high on entry timeframe]`,
      analysis.take_profit_1 ? `🎯 TP1: ${analysis.take_profit_1} (${tp1Pips ? `+${tp1Pips} pips` : ''} | 1:${tp1RR || '1.8'}R) [Bank 50%]` : '',
      analysis.take_profit_2 ? `🎯 TP2: ${analysis.take_profit_2} (${tp2Pips ? `+${tp2Pips} pips` : ''} | 1:${tp2RR || '3.2'}R) [Scale 30%]` : '',
      analysis.take_profit_3 ? `🎯 TP3: ${analysis.take_profit_3} (${tp3Pips ? `+${tp3Pips} pips` : ''} | 1:${tp3RR || '5.5'}R) [Runner 20%]` : '',
      analysis.breakeven_trigger ? `⚖️ Break-Even: ${analysis.breakeven_trigger}` : '',
      analysis.invalidation_level ? `🛡 Invalidation: ${analysis.invalidation_level}` : '',
      analysis.lot_size_recommendation ? `📐 Sizing: ${analysis.lot_size_recommendation}` : '',
      `💡 Analysis: ${analysis.explanation}`,
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const getGradient = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return 'from-emerald-600 to-green-600';
      case 'SELL':
        return 'from-rose-600 to-red-600';
      default:
        return 'from-amber-600 to-yellow-600';
    }
  };

  const getIcon = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return <TrendingUp className="w-6 h-6 stroke-[2.5]" />;
      case 'SELL':
        return <TrendingDown className="w-6 h-6 stroke-[2.5]" />;
      default:
        return <Minus className="w-6 h-6 stroke-[2.5]" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 w-full font-sans"
    >
      {/* 1. Primary Signal Overview Header Banner */}
      <div className="border border-gray-800 bg-zinc-950/90 backdrop-blur-xl overflow-hidden relative shadow-2xl rounded-2xl">
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${getGradient(analysis.signal)}`} />

        <div className="p-4 sm:p-6 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Left: Direction + Pair + Badges */}
            <div className="flex items-start sm:items-center gap-4">
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${getGradient(
                  analysis.signal
                )} flex items-center justify-center text-white shadow-xl flex-shrink-0`}
              >
                {getIcon(analysis.signal)}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {analysis.signal}
                  </h2>

                  {/* Order Type Badge */}
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {analysis.order_type || 'MARKET EXECUTION'}
                  </span>

                  {/* Strategy Badge */}
                  {analysis.analysis_type?.toLowerCase().includes('robexcapital') ||
                  analysis.analysis_type?.toLowerCase().includes('three-candle') ||
                  analysis.analysis_type?.toLowerCase().includes('three candle') ||
                  analysis.analysis_type?.includes('65%') ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-500/25 to-yellow-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 shadow-md shadow-amber-500/10">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      RobexCapital Strategy (65% Win-Rate Priority)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm">
                      <BookOpen className="w-3 h-3 text-amber-400" />
                      George Milton Volume Price Analysis (VPA)
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                  <span className="text-amber-400 text-lg sm:text-xl font-bold font-mono tracking-wide">
                    {analysis.pair}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-300 font-medium flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {analysis.timeframe || 'H1'}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">
                    Confidence: <span className="text-white font-semibold">{analysis.confidence || 'High'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Buttons (Responsive flex) */}
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
              <button
                type="button"
                onClick={handleCopyAllSignal}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
                  copiedAll
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-emerald-500/20'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 border-gray-800 text-gray-200 hover:text-white'
                }`}
                title="Copy all trade parameters for MT4/MT5/cTrader"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                <span>{copiedAll ? 'Trade Copied!' : 'Copy Trade'}</span>
              </button>

              <button
                type="button"
                onClick={() => exportSignalToPDF({ analysis })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900/80 hover:bg-zinc-800 border border-gray-800 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer shadow-sm"
                title="Export comprehensive signal report as PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Technical Explanation / Chart Commentary */}
        <div className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-gray-800/80">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              <span>{analysis.analysis_type || 'RobexCapital Strategy'}</span>
            </div>
            <p className="text-gray-300 leading-relaxed text-xs sm:text-sm whitespace-pre-wrap">
              {analysis.explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Vsa Observation Report with Anna Coulling VSA Principles & Interactive Tooltips */}
      <VsaObservationReport analysis={analysis} />

      {/* 2. Responsive Key Price Levels Grid (All Trade Details) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Entry Price Card */}
        <div className="p-4 rounded-xl bg-zinc-950/80 border border-gray-800/90 hover:border-gray-700 transition-colors relative group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Entry Price
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(analysis.entry_price || '', 'entry')}
              className="text-gray-500 hover:text-amber-400 transition-colors p-1"
              title="Copy entry price"
            >
              {copiedField === 'entry' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {analysis.entry_price || '--'}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
            <span>Type:</span>
            <span className="text-amber-400 font-semibold">{analysis.order_type || 'Market Execution'}</span>
          </div>
        </div>

        {/* Stop Loss Card */}
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 hover:border-rose-800/60 transition-colors relative group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              Stop Loss (1R)
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(analysis.stop_loss || '', 'sl')}
              className="text-gray-500 hover:text-rose-400 transition-colors p-1"
              title="Copy Stop Loss"
            >
              {copiedField === 'sl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono tracking-tight">
            {analysis.stop_loss || '--'}
          </div>
          <div className="text-[11px] text-rose-300/80 mt-1 flex items-center justify-between font-mono">
            <span>Risk Distance:</span>
            <span className="font-bold">{riskPips ? `-${riskPips} pips` : '--'}</span>
          </div>
        </div>

        {/* Take Profit 1 Card (Conservative Target) */}
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 hover:border-emerald-800/60 transition-colors relative group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3 h-3 text-emerald-400" />
              TP1 (Conservative)
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(analysis.take_profit_1 || '', 'tp1')}
              className="text-gray-500 hover:text-emerald-400 transition-colors p-1"
              title="Copy TP1"
            >
              {copiedField === 'tp1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
            {analysis.take_profit_1 || '--'}
          </div>
          <div className="text-[11px] text-emerald-300/90 mt-1 flex items-center justify-between font-mono">
            <span>{tp1Pips ? `+${tp1Pips} pips` : 'Target'}</span>
            <span className="font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
              1:{tp1RR || '1.8'}R (Bank 50%)
            </span>
          </div>
        </div>

        {/* Take Profit 2 Card (Core Swing Target) */}
        <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-800/40 hover:border-emerald-700/60 transition-colors relative group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Target className="w-3 h-3 text-emerald-400" />
              TP2 (Core Swing)
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(analysis.take_profit_2 || '', 'tp2')}
              className="text-gray-500 hover:text-emerald-400 transition-colors p-1"
              title="Copy TP2"
            >
              {copiedField === 'tp2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-2xl font-black text-emerald-300 font-mono tracking-tight">
            {analysis.take_profit_2 || '--'}
          </div>
          <div className="text-[11px] text-emerald-300/90 mt-1 flex items-center justify-between font-mono">
            <span>{tp2Pips ? `+${tp2Pips} pips` : 'Extended'}</span>
            <span className="font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
              1:{tp2RR || '3.2'}R (Scale 30%)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Take Profit 3 Runner & Management Specifications Banner */}
      {analysis.take_profit_3 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 via-zinc-950 to-emerald-950/30 border border-emerald-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
              TP3
            </div>
            <div>
              <span className="font-bold text-white uppercase tracking-wider">
                Runner / Macro Target (Trail Remaining 20%):{' '}
                <span className="font-mono text-emerald-400 text-sm">{analysis.take_profit_3}</span>
              </span>
              <p className="text-gray-400 text-[11px]">
                {tp3Pips ? `+${tp3Pips} pips potential gain` : 'Maximize asymmetric payoff'} • Payoff Ratio:{' '}
                <span className="text-emerald-400 font-semibold font-mono">1:{tp3RR || '5.5'}R</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(analysis.take_profit_3 || '', 'tp3')}
            className="self-start sm:self-center px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white rounded-lg border border-gray-800 flex items-center gap-1.5 cursor-pointer text-[11px]"
          >
            {copiedField === 'tp3' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            Copy TP3
          </button>
        </div>
      )}

      {/* 4. Trade Execution Management & Strategic Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Break-Even Trigger Rule */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-gray-800/80 space-y-1">
          <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Break-Even Trigger
          </span>
          <p className="text-xs text-gray-200 font-medium leading-snug">
            {analysis.breakeven_trigger || `Move SL to Entry (${analysis.entry_price || 'BE'}) once TP1 is hit`}
          </p>
        </div>

        {/* Trailing Stop Strategy */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-gray-800/80 space-y-1">
          <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Trailing Stop Strategy
          </span>
          <p className="text-xs text-gray-200 font-medium leading-snug">
            {analysis.trailing_stop_rule || 'Trail stop behind previous H1 structure swing points'}
          </p>
        </div>

        {/* Invalidation Level */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-gray-800/80 space-y-1">
          <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            Invalidation Level
          </span>
          <p className="text-xs text-gray-200 font-medium font-mono leading-snug">
            {analysis.invalidation_level || analysis.stop_loss || 'Strict structural violation'}
          </p>
        </div>

        {/* Key Pivot / Support & Resistance */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-gray-800/80 space-y-1">
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            Support / Resistance
          </span>
          <p className="text-xs text-gray-200 font-medium font-mono leading-snug">
            {analysis.support_level ? `Supp: ${analysis.support_level}` : ''}
            {analysis.support_level && analysis.resistance_level ? ' • ' : ''}
            {analysis.resistance_level ? `Res: ${analysis.resistance_level}` : (analysis.stop_loss ? `Pivot: ${analysis.stop_loss}` : 'Tape Pivots')}
          </p>
        </div>
      </div>

      {/* 5. Responsive Interactive Position Sizing & Risk Allocation Calculator */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-gray-800/90 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-900">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                Responsive Position Sizing & Risk Simulator (George Milton 1% Rule)
              </h3>
              <p className="text-[11px] text-gray-400">
                Fixed Ratio position sizing based on George Milton Chapter 1 & 2 — 1% risk limit & asymmetric CRV payoff
              </p>
            </div>
          </div>

          {/* Risk Percentage Quick Switcher */}
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            {[0.5, 1.0, 2.0, 3.0].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setRiskPercent(pct)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer border ${
                  riskPercent === pct
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-zinc-900 text-gray-400 hover:text-white border-gray-800'
                }`}
              >
                {pct}% Risk
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Account Balance Input */}
          <div className="p-3 bg-zinc-900/50 rounded-xl border border-gray-800/80">
            <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">
              Account Equity ($)
            </label>
            <input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Math.max(100, Number(e.target.value) || 0))}
              className="w-full bg-black/60 border border-gray-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Recommended Lot Size */}
          <div className="p-3 bg-zinc-900/50 rounded-xl border border-gray-800/80 flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 font-semibold uppercase block">
              Recommended Lots
            </span>
            <div className="text-lg font-black text-amber-400 font-mono">
              {sizing.standardLots} <span className="text-xs font-normal text-gray-400">Lots</span>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">
              Max Loss: -${sizing.riskDollar}
            </span>
          </div>

          {/* Potential TP1 Profit */}
          <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-900/40 flex flex-col justify-between">
            <span className="text-[10px] text-emerald-400 font-semibold uppercase block">
              TP1 Profit (50%)
            </span>
            <div className="text-lg font-black text-emerald-400 font-mono">
              +${sizing.profitTP1 || '--'}
            </div>
            <span className="text-[10px] text-emerald-400/70 font-mono">
              1:{tp1RR || '1.8'} R:R
            </span>
          </div>

          {/* Potential TP2 Profit */}
          <div className="p-3 bg-emerald-950/25 rounded-xl border border-emerald-900/40 flex flex-col justify-between">
            <span className="text-[10px] text-emerald-400 font-semibold uppercase block">
              TP2 Profit (30%)
            </span>
            <div className="text-lg font-black text-emerald-300 font-mono">
              +${sizing.profitTP2 || '--'}
            </div>
            <span className="text-[10px] text-emerald-400/70 font-mono">
              1:{tp2RR || '3.2'} R:R
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
