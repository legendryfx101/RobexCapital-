import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Shield,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Percent,
  RefreshCw,
  Gauge,
  Download,
  Info,
  HelpCircle,
  Zap,
} from 'lucide-react';
import type { ForexAnalysisRecord } from '../firebase';
import { exportSignalToPDF } from '../utils/pdfExport';

interface RiskCalculatorProps {
  currentAnalysis?: ForexAnalysisRecord | null;
}

export const RiskCalculator: React.FC<RiskCalculatorProps> = ({ currentAnalysis }) => {
  // User Inputs
  const [balance, setBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [leverage, setLeverage] = useState<number>(100);
  const [calculationMode, setCalculationMode] = useState<'risk' | 'leverage'>('risk');
  const [targetLeverageGearing, setTargetLeverageGearing] = useState<number>(10);
  const [pair, setPair] = useState<string>('EUR/USD');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [entryPrice, setEntryPrice] = useState<string>('1.0850');
  const [stopLoss, setStopLoss] = useState<string>('1.0820');
  const [takeProfit, setTakeProfit] = useState<string>('1.0920');
  const [showLeverageInfo, setShowLeverageInfo] = useState<boolean>(false);

  // Auto-sync when an analysis is loaded
  useEffect(() => {
    if (currentAnalysis) {
      if (currentAnalysis.pair) setPair(currentAnalysis.pair);
      if (currentAnalysis.signal === 'BUY' || currentAnalysis.signal === 'SELL') {
        setTradeType(currentAnalysis.signal);
      }
      if (currentAnalysis.entry_price) {
        const cleanPrice = currentAnalysis.entry_price.replace(/[^0-9.]/g, '');
        if (cleanPrice) setEntryPrice(cleanPrice);
      }
      if (currentAnalysis.stop_loss) {
        const cleanSl = currentAnalysis.stop_loss.replace(/[^0-9.]/g, '');
        if (cleanSl) setStopLoss(cleanSl);
      }
      if (currentAnalysis.take_profit_1) {
        const cleanTp = currentAnalysis.take_profit_1.replace(/[^0-9.]/g, '');
        if (cleanTp) setTakeProfit(cleanTp);
      }
    }
  }, [currentAnalysis]);

  const handleSyncWithSignal = () => {
    if (!currentAnalysis) return;
    if (currentAnalysis.pair) setPair(currentAnalysis.pair);
    if (currentAnalysis.signal === 'BUY' || currentAnalysis.signal === 'SELL') {
      setTradeType(currentAnalysis.signal);
    }
    if (currentAnalysis.entry_price) {
      const clean = currentAnalysis.entry_price.replace(/[^0-9.]/g, '');
      if (clean) setEntryPrice(clean);
    }
    if (currentAnalysis.stop_loss) {
      const clean = currentAnalysis.stop_loss.replace(/[^0-9.]/g, '');
      if (clean) setStopLoss(clean);
    }
    if (currentAnalysis.take_profit_1) {
      const clean = currentAnalysis.take_profit_1.replace(/[^0-9.]/g, '');
      if (clean) setTakeProfit(clean);
    }
  };

  // Perform Calculations
  const results = useMemo(() => {
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);

    const isEntryValid = !isNaN(entry) && entry > 0;
    const isSlValid = !isNaN(sl) && sl > 0;
    const isTpValid = !isNaN(tp) && tp > 0;

    if (!isEntryValid || !isSlValid) {
      return {
        isValid: false,
        error: 'Please enter valid numerical prices for Entry and Stop Loss.',
        pipsRisk: 0,
        moneyAtRisk: 0,
        lotSize: 0,
        units: 0,
        effectiveLeverage: 0,
        isLeverageConstrained: false,
        riskRewardRatio: null,
        potentialProfit: null,
        requiredMargin: 0,
        maxAllowedLots: 0,
        marginLevelPercent: 0,
        marginCallWarning: null,
      };
    }

    // Determine pip value size based on currency pair
    const upperPair = pair.toUpperCase();
    const isJpy = upperPair.includes('JPY');
    const isGold = upperPair.includes('XAU') || upperPair.includes('GOLD');
    const pipMultiplier = isJpy ? 100 : isGold ? 10 : 10000;

    const priceDiff = Math.abs(entry - sl);
    const pipsRisk = priceDiff * pipMultiplier;

    if (pipsRisk <= 0.0001) {
      return {
        isValid: false,
        error: 'Entry Price and Stop Loss cannot be identical.',
        pipsRisk: 0,
        moneyAtRisk: 0,
        lotSize: 0,
        units: 0,
        effectiveLeverage: 0,
        isLeverageConstrained: false,
        riskRewardRatio: null,
        potentialProfit: null,
        requiredMargin: 0,
        maxAllowedLots: 0,
        marginLevelPercent: 0,
        marginCallWarning: null,
      };
    }

    // Directional warning
    let directionWarning = null;
    if (tradeType === 'BUY' && sl >= entry) {
      directionWarning = 'For a BUY order, Stop Loss should typically be below Entry Price.';
    } else if (tradeType === 'SELL' && sl <= entry) {
      directionWarning = 'For a SELL order, Stop Loss should typically be above Entry Price.';
    }

    // Cash at risk based on risk %
    const moneyAtRisk = balance * (riskPercent / 100);

    // Pip value per standard lot
    const pipValuePerStandardLot = isGold ? 10 : isJpy ? 1000 / entry : 10;
    const notionalPerStandardLot = 100000 * (isGold ? entry / 1000 : entry);

    // 1. Pure Risk-Based Lot Size:
    const riskBasedLots = moneyAtRisk / (pipsRisk * pipValuePerStandardLot);

    // 2. Maximum Lot Size permitted by Account Leverage:
    // Purchasing Power = Balance * Leverage
    const maxAllowedLots = (balance * leverage) / notionalPerStandardLot;

    // 3. Final Lot Size based on Calculation Mode:
    let finalLotSize = 0;
    let isLeverageConstrained = false;

    if (calculationMode === 'risk') {
      // Risk mode: Lot size is determined by risk %, but STRICTLY constrained by account leverage!
      if (riskBasedLots > maxAllowedLots) {
        finalLotSize = maxAllowedLots;
        isLeverageConstrained = true;
      } else {
        finalLotSize = riskBasedLots;
      }
    } else {
      // Leverage-Targeted mode: directly sized by user's chosen effective leverage gearing (capped by broker max leverage)
      const appliedLeverage = Math.min(targetLeverageGearing, leverage);
      finalLotSize = (balance * appliedLeverage) / notionalPerStandardLot;
    }

    const lotSize = Math.max(0.01, parseFloat(finalLotSize.toFixed(2)));
    const units = Math.round(lotSize * 100000);

    // Margin Calculations with Account Leverage
    const notionalValue = lotSize * notionalPerStandardLot;
    const requiredMargin = notionalValue / Math.max(1, leverage);
    const effectiveLeverage = notionalValue / Math.max(1, balance);
    const marginLevelPercent =
      requiredMargin > 0 ? (balance / requiredMargin) * 100 : 9999;

    let marginCallWarning = null;
    if (requiredMargin > balance) {
      marginCallWarning = `At 1:${leverage} leverage, opening ${lotSize} lots requires $${requiredMargin.toFixed(
        2
      )} in margin, exceeding your total balance of $${balance.toLocaleString()}. Reduce position size or increase leverage.`;
    }

    // Reward calculation
    let riskRewardRatio = null;
    let potentialProfit = null;
    if (isTpValid) {
      const rewardDiff = Math.abs(tp - entry);
      const pipsReward = rewardDiff * pipMultiplier;
      if (pipsRisk > 0) {
        const rr = pipsReward / pipsRisk;
        riskRewardRatio = rr.toFixed(2);
        // Potential dollar profit
        const actualDollarRisk = pipsRisk * lotSize * pipValuePerStandardLot;
        potentialProfit = actualDollarRisk * rr;
      }
    }

    return {
      isValid: true,
      error: directionWarning,
      pipsRisk: Number(pipsRisk.toFixed(1)),
      moneyAtRisk: Number(moneyAtRisk.toFixed(2)),
      lotSize,
      units,
      effectiveLeverage: Number(effectiveLeverage.toFixed(1)),
      isLeverageConstrained,
      riskRewardRatio,
      potentialProfit: potentialProfit ? Number(potentialProfit.toFixed(2)) : null,
      requiredMargin: Number(requiredMargin.toFixed(2)),
      maxAllowedLots: Number(maxAllowedLots.toFixed(2)),
      marginLevelPercent: Number(marginLevelPercent.toFixed(0)),
      marginCallWarning,
    };
  }, [
    balance,
    riskPercent,
    leverage,
    calculationMode,
    targetLeverageGearing,
    pair,
    tradeType,
    entryPrice,
    stopLoss,
    takeProfit,
  ]);

  const handleExportPDF = () => {
    if (currentAnalysis) {
      exportSignalToPDF({
        analysis: currentAnalysis,
        accountBalance: balance,
        riskPercent,
        leverage,
        lotSize: results.lotSize,
        marginRequired: results.requiredMargin,
      });
    } else {
      const standaloneRecord: ForexAnalysisRecord = {
        id: `standalone-${Date.now()}`,
        userId: 'local',
        pair,
        signal: tradeType,
        explanation: `Risk & position size calculation based on Account Balance $${balance.toLocaleString()}, Risk ${riskPercent}%, Leverage 1:${leverage}.`,
        entry_price: entryPrice,
        stop_loss: stopLoss,
        take_profit_1: takeProfit,
        confidence: 'High',
        timeframe: 'Custom',
        analysis_type: 'Risk Management',
        createdAt: new Date().toISOString(),
      };
      exportSignalToPDF({
        analysis: standaloneRecord,
        accountBalance: balance,
        riskPercent,
        leverage,
        lotSize: results.lotSize,
        marginRequired: results.requiredMargin,
      });
    }
  };

  const quickBalances = [1000, 5000, 10000, 25000, 50000, 100000];
  const quickRisks = [0.5, 1.0, 1.5, 2.0, 3.0];
  const quickLeverages = [30, 50, 100, 200, 500, 1000];

  return (
    <div className="border border-gray-800 bg-zinc-950/80 backdrop-blur shadow-2xl rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-900 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Risk Management & Position Size Calculator
            </h3>
            <p className="text-xs text-gray-400">
              Calculates lot sizing actively constrained by account leverage and stop-loss distance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLeverageInfo((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-amber-400 bg-zinc-900 border border-gray-800 rounded-lg transition-colors cursor-pointer"
            title="How leverage affects lot sizing"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">How Leverage Works</span>
          </button>

          {currentAnalysis && (
            <button
              type="button"
              onClick={handleSyncWithSignal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Signal
            </button>
          )}

          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-black bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 rounded-lg shadow-md transition-all cursor-pointer border border-amber-400/20"
            title="Download complete trading plan as PDF"
          >
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Sizing Mode Tabs */}
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between border-b border-gray-900 pb-3 flex-wrap gap-2">
        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
          Position Sizing Strategy:
        </span>
        <div className="flex rounded-lg p-0.5 bg-zinc-900 border border-gray-800 text-xs">
          <button
            type="button"
            onClick={() => setCalculationMode('risk')}
            className={`px-3 py-1 rounded font-semibold transition-all cursor-pointer ${
              calculationMode === 'risk'
                ? 'bg-amber-500 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Risk % (Capped by Leverage)
          </button>
          <button
            type="button"
            onClick={() => setCalculationMode('leverage')}
            className={`px-3 py-1 rounded font-semibold transition-all cursor-pointer ${
              calculationMode === 'leverage'
                ? 'bg-amber-500 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Leverage Target Gearing
          </button>
        </div>
      </div>

      {/* Educational Leverage Callout */}
      {showLeverageInfo && (
        <div className="mx-4 md:mx-6 mt-4 p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-gray-300 space-y-2">
          <div className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
            <Info className="w-4 h-4" />
            How Account Leverage Determines Your Position Size:
          </div>
          <p className="leading-relaxed">
            <strong>1. Hard Purchasing Power Cap:</strong> Your broker leverage (1:{leverage}) provides a maximum purchasing capacity of <strong>${(balance * leverage).toLocaleString()}</strong>.
            This limits you to at most <strong>{results.maxAllowedLots} Lots</strong>.
          </p>
          <p className="leading-relaxed">
            <strong>2. Margin Requirement:</strong> Every lot opened requires margin equal to <em>(Position Value / Leverage)</em>. If your broker leverage is low (e.g. 1:30), opening larger positions will exhaust your account margin before your risk target is reached, so the calculator automatically enforces your leverage cap.
          </p>
          <p className="leading-relaxed">
            <strong>3. Effective Leverage:</strong> Represents your real account gearing (<em>Position Notional / Balance</em>). While your broker allows up to 1:{leverage}, professional traders typically keep their effective gearing between <strong>1:3x and 1:15x</strong> to prevent rapid liquidation.
          </p>
        </div>
      )}

      <div className="p-4 md:p-6 space-y-6">
        {/* Top Controls: Account Balance, Risk %, Account Leverage */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* 1. Account Balance */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                Account Balance ($)
              </label>
              <span className="text-sm font-bold font-mono text-white">
                ${balance.toLocaleString()}
              </span>
            </div>
            <input
              type="number"
              min="100"
              step="500"
              value={balance}
              onChange={(e) => setBalance(Math.max(1, parseFloat(e.target.value) || 0))}
              className="w-full bg-zinc-900/60 border border-gray-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500/50"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickBalances.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBalance(val)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer font-mono ${
                    balance === val
                      ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 font-semibold'
                      : 'border-gray-800 bg-zinc-900 text-gray-400 hover:text-white'
                  }`}
                >
                  ${(val / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          {/* 2. Risk or Target Gearing depending on mode */}
          {calculationMode === 'risk' ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-500" />
                  Risk Per Trade (%)
                </label>
                <span
                  className={`text-sm font-bold font-mono ${
                    riskPercent <= 1.5
                      ? 'text-emerald-400'
                      : riskPercent <= 2.5
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {riskPercent}% (${results.moneyAtRisk.toFixed(2)})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.25"
                  max="5.0"
                  step="0.25"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  className="w-16 bg-zinc-900/60 border border-gray-800 rounded-lg px-2 py-1 text-center font-mono text-sm text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickRisks.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRiskPercent(val)}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer font-mono ${
                      riskPercent === val
                        ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 font-semibold'
                        : 'border-gray-800 bg-zinc-900 text-gray-400 hover:text-white'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Target Account Gearing
                </label>
                <span className="text-sm font-bold font-mono text-amber-400">
                  {targetLeverageGearing}x Gearing
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max={Math.min(leverage, 100)}
                  step="1"
                  value={targetLeverageGearing}
                  onChange={(e) => setTargetLeverageGearing(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className="w-16 text-center font-mono text-sm text-white font-bold">
                  {targetLeverageGearing}x
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[2, 5, 10, 20, 30].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTargetLeverageGearing(val)}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer font-mono ${
                      targetLeverageGearing === val
                        ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 font-semibold'
                        : 'border-gray-800 bg-zinc-900 text-gray-400 hover:text-white'
                    }`}
                  >
                    {val}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Account Leverage */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-500" />
                Broker Account Leverage
              </label>
              <span className="text-sm font-bold font-mono text-amber-400">
                1:{leverage}
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 font-mono text-sm">
                1:
              </div>
              <input
                type="number"
                min="1"
                max="3000"
                step="10"
                value={leverage}
                onChange={(e) => setLeverage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-zinc-900/60 border border-gray-800 rounded-lg pl-8 pr-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickLeverages.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setLeverage(val)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer font-mono ${
                    leverage === val
                      ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 font-semibold'
                      : 'border-gray-800 bg-zinc-900 text-gray-400 hover:text-white'
                  }`}
                >
                  1:{val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trade Parameters: Pair, Direction, Entry, SL, TP */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Pair */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 mb-1 block">Asset Pair</label>
            <input
              type="text"
              value={pair}
              onChange={(e) => setPair(e.target.value.toUpperCase())}
              placeholder="EUR/USD"
              className="w-full bg-zinc-900/60 border border-gray-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Direction */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 mb-1 block">Direction</label>
            <div className="flex rounded-lg p-0.5 bg-zinc-900 border border-gray-800">
              <button
                type="button"
                onClick={() => setTradeType('BUY')}
                className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  tradeType === 'BUY'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                BUY
              </button>
              <button
                type="button"
                onClick={() => setTradeType('SELL')}
                className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  tradeType === 'SELL'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                SELL
              </button>
            </div>
          </div>

          {/* Entry Price */}
          <div>
            <label className="text-[11px] font-medium text-gray-400 mb-1 block">Entry Price</label>
            <input
              type="text"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="1.0850"
              className="w-full bg-zinc-900/60 border border-gray-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Stop Loss */}
          <div>
            <label className="text-[11px] font-medium text-rose-300 mb-1 block">Stop Loss</label>
            <input
              type="text"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="1.0820"
              className="w-full bg-zinc-900/60 border border-rose-900/50 rounded-lg px-3 py-2 text-rose-300 font-mono text-sm focus:outline-none focus:border-rose-500/50"
            />
          </div>

          {/* Take Profit */}
          <div>
            <label className="text-[11px] font-medium text-emerald-300 mb-1 block">
              Take Profit (Min 1:1 RR)
            </label>
            <input
              type="text"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="1.0920"
              className="w-full bg-zinc-900/60 border border-emerald-900/50 rounded-lg px-3 py-2 text-emerald-300 font-mono text-sm focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Warnings & Direction Alerts */}
        {results.error && (
          <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg flex items-center gap-2 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>{results.error}</span>
          </div>
        )}

        {results.isLeverageConstrained && (
          <div className="p-3.5 bg-amber-950/40 border border-amber-500/50 rounded-lg flex items-center gap-2.5 text-xs text-amber-300">
            <Gauge className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>
              <strong>Leverage Constraint Active:</strong> Your 1:{leverage} account leverage caps your position to a maximum of <strong>{results.maxAllowedLots} lots</strong>. Recommended lot size has been adjusted to stay within broker margin limits.
            </span>
          </div>
        )}

        {results.marginCallWarning && (
          <div className="p-3.5 bg-red-950/40 border border-red-900/60 rounded-lg flex items-center gap-2.5 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{results.marginCallWarning}</span>
          </div>
        )}

        {/* Results Banner Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
          {/* 1. Recommended Lot Size */}
          <div className="p-4 bg-gradient-to-br from-amber-500/10 via-zinc-900/80 to-zinc-900/90 border border-amber-500/30 rounded-xl relative overflow-hidden">
            <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Recommended Lots</span>
              <Shield className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {results.isValid ? `${results.lotSize} Lots` : '--'}
            </div>
            <div className="text-xs text-gray-400 font-mono mt-1">
              {results.isValid ? `${results.units.toLocaleString()} units` : 'Invalid setup'}
            </div>
          </div>

          {/* 2. Effective Gearing / Leverage Used */}
          <div className="p-4 bg-zinc-900/60 border border-gray-800 rounded-xl">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Effective Leverage</span>
              <span className="text-[10px] text-amber-400/80 font-mono">Real Gearing</span>
            </div>
            <div className="text-2xl font-bold text-amber-400 font-mono tracking-tight">
              {results.isValid ? `1:${results.effectiveLeverage}x` : '--'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Broker allows up to 1:{leverage}
            </div>
          </div>

          {/* 3. Required Margin under Leverage */}
          <div className="p-4 bg-zinc-900/60 border border-gray-800 rounded-xl">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Required Margin</span>
              <span className="text-[10px] text-amber-400/80 font-mono">1:{leverage}</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight">
              ${results.requiredMargin.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {results.marginLevelPercent > 0 && results.marginLevelPercent < 9999
                ? `${results.marginLevelPercent}% margin level`
                : 'Margin tied up'}
            </div>
          </div>

          {/* 4. Capital at Risk & Pips */}
          <div className="p-4 bg-zinc-900/60 border border-gray-800 rounded-xl">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Capital at Risk ({results.pipsRisk} pips)
            </div>
            <div className="text-2xl font-bold text-rose-400 font-mono tracking-tight">
              ${results.moneyAtRisk.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Exact {riskPercent}% of ${balance.toLocaleString()}
            </div>
          </div>

          {/* 5. Risk : Reward Ratio */}
          <div className="p-4 bg-zinc-900/60 border border-gray-800 rounded-xl">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Risk : Reward Ratio</span>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono">
                {results.riskRewardRatio && parseFloat(results.riskRewardRatio) >= 1.0 ? 'High RR ✓' : ''}
              </span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">
              {results.riskRewardRatio ? `1 : ${results.riskRewardRatio}` : 'N/A'}
            </div>
            <div className="text-xs text-emerald-500/80 mt-1 font-mono">
              {results.potentialProfit ? `+ $${results.potentialProfit.toFixed(2)} Target` : 'Add TP for target'}
            </div>
          </div>
        </div>

        {/* Leverage & Margin Sizing Footnote */}
        <div className="p-4 bg-black/40 border border-gray-900 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>
              At <strong>1:{leverage} broker leverage</strong>, your max allowed position size is{' '}
              <strong className="text-white font-mono">{results.maxAllowedLots} Lots</strong>.
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-gray-500 font-mono">
              Free Margin Remaining:{' '}
              <span className="text-emerald-400 font-bold">
                ${Math.max(0, balance - results.requiredMargin).toLocaleString()}
              </span>
            </span>

            <span className="text-gray-500 font-mono">
              Risk Profile:{' '}
              <span
                className={`font-semibold ${
                  riskPercent <= 1.5
                    ? 'text-emerald-400'
                    : riskPercent <= 2.5
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {riskPercent <= 1.5 ? 'Conservative' : riskPercent <= 2.5 ? 'Moderate' : 'Aggressive'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
