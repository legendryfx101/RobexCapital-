import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Award,
  DollarSign,
  BarChart2,
  PieChart as PieIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Coins,
  Bitcoin,
  Briefcase,
  Search,
  Filter,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import type { ForexAnalysisRecord, PersonalTradeRecord } from '../firebase';
import { detectAssetCategory } from '../firebase';

interface PerformanceDashboardProps {
  analyses: ForexAnalysisRecord[];
  globalAnalyses?: ForexAnalysisRecord[];
  personalTrades?: PersonalTradeRecord[];
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ analyses, globalAnalyses, personalTrades }) => {
  const [dataScope, setDataScope] = useState<'global' | 'personal'>('global');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'WIN' | 'LOSS' | 'BREAKEVEN' | 'PENDING'>('ALL');
  const [filterMarket, setFilterMarket] = useState<'ALL' | 'forex' | 'stock' | 'crypto' | 'indices'>('ALL');
  const [chartTimeRange, setChartTimeRange] = useState<'7D' | '30D' | '90D' | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const activeAnalyses = dataScope === 'global' && globalAnalyses && globalAnalyses.length > 0 ? globalAnalyses : analyses;

  // Comprehensive AI Signal Accuracy & Performance Calculations
  const stats = useMemo(() => {
    const nowTime = new Date().getTime();
    const timeFilteredAnalyses = activeAnalyses.filter((a) => {
      if (chartTimeRange === 'ALL') return true;
      const createdAt = new Date(a.createdAt).getTime();
      const diffDays = (nowTime - createdAt) / (1000 * 60 * 60 * 24);
      if (chartTimeRange === '7D') return diffDays <= 7;
      if (chartTimeRange === '30D') return diffDays <= 30;
      if (chartTimeRange === '90D') return diffDays <= 90;
      return true;
    });

    const signalsOnly = timeFilteredAnalyses;
    const total = signalsOnly.length;
    const wins = signalsOnly.filter((a) => a.trade_outcome === 'WIN');
    const losses = signalsOnly.filter((a) => a.trade_outcome === 'LOSS');
    const breakEvens = signalsOnly.filter((a) => a.trade_outcome === 'BREAKEVEN');
    const pending = signalsOnly.filter((a) => !a.trade_outcome || a.trade_outcome === 'PENDING');

    const closedCount = wins.length + losses.length + breakEvens.length;
    const aiAccuracy = closedCount > 0 ? ((wins.length + breakEvens.length * 0.5) / closedCount) * 100 : 0;

    // Calculate Net R Accumulated (Wins = +10R target, Losses = -1R, Breakeven = 0R)
    let netR = 0;
    signalsOnly.forEach((item) => {
      if (item.trade_outcome === 'WIN') {
        const customR = parseFloat(item.pnl_amount?.replace(/[^0-9.]/g, '') || '10.0');
        netR += !isNaN(customR) && customR > 0 ? customR : 10.0;
      } else if (item.trade_outcome === 'LOSS') {
        netR -= 1.0;
      }
    });

    // Accuracy by Category
    const categoryStats: {
      [key in 'forex' | 'stock' | 'crypto' | 'indices']: { wins: number; losses: number; breakEvens: number; total: number };
    } = {
      forex: { wins: 0, losses: 0, breakEvens: 0, total: 0 },
      stock: { wins: 0, losses: 0, breakEvens: 0, total: 0 },
      crypto: { wins: 0, losses: 0, breakEvens: 0, total: 0 },
      indices: { wins: 0, losses: 0, breakEvens: 0, total: 0 },
    };

    signalsOnly.forEach((item) => {
      const cat = detectAssetCategory(item.pair);
      categoryStats[cat].total += 1;
      if (item.trade_outcome === 'WIN') categoryStats[cat].wins += 1;
      if (item.trade_outcome === 'LOSS') categoryStats[cat].losses += 1;
      if (item.trade_outcome === 'BREAKEVEN') categoryStats[cat].breakEvens += 1;
    });

    const categoryData = Object.entries(categoryStats).map(([cat, val]) => {
      const resolved = val.wins + val.losses + val.breakEvens;
      const rate = resolved > 0 ? (((val.wins + val.breakEvens * 0.5) / resolved) * 100).toFixed(1) : '0.0';
      return {
        category: cat.toUpperCase(),
        accuracy: parseFloat(rate),
        wins: val.wins,
        losses: val.losses,
        breakEvens: val.breakEvens,
        total: val.total,
      };
    });

    // Accuracy by Confidence Tier
    const confidenceStats = {
      High: { wins: 0, losses: 0, breakEvens: 0, total: 0 },
      Medium: { wins: 0, losses: 0, breakEvens: 0, total: 0 },
      Low: { wins: 0, losses: 0, breakEvens: 0, total: 0 },
    };

    signalsOnly.forEach((item) => {
      const conf = (item.confidence || 'Medium') as 'High' | 'Medium' | 'Low';
      if (confidenceStats[conf]) {
        confidenceStats[conf].total += 1;
        if (item.trade_outcome === 'WIN') confidenceStats[conf].wins += 1;
        if (item.trade_outcome === 'LOSS') confidenceStats[conf].losses += 1;
        if (item.trade_outcome === 'BREAKEVEN') confidenceStats[conf].breakEvens += 1;
      }
    });

    // Directional Accuracy (BUY vs SELL)
    const directionStats = {
      BUY: { wins: 0, losses: 0, breakEvens: 0, total: 0 },
      SELL: { wins: 0, losses: 0, breakEvens: 0, total: 0 },
    };

    signalsOnly.forEach((item) => {
      if (item.signal === 'BUY' || item.signal === 'SELL') {
        directionStats[item.signal].total += 1;
        if (item.trade_outcome === 'WIN') directionStats[item.signal].wins += 1;
        if (item.trade_outcome === 'LOSS') directionStats[item.signal].losses += 1;
        if (item.trade_outcome === 'BREAKEVEN') directionStats[item.signal].breakEvens += 1;
      }
    });

    // Cumulative R-Factor Timeline for Chart
    const sortedAnalyses = [...signalsOnly].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let cumulativeR = 0;
    const rTimeline = sortedAnalyses.map((item, index) => {
      let rDelta = 0;
      if (item.trade_outcome === 'WIN') {
        const custom = parseFloat(item.pnl_amount?.replace(/[^0-9.]/g, '') || '10.0');
        rDelta = !isNaN(custom) && custom > 0 ? custom : 10.0;
      } else if (item.trade_outcome === 'LOSS') {
        rDelta = -1.0;
      }
      cumulativeR += rDelta;

      return {
        step: `Signal #${index + 1}`,
        pair: item.pair,
        signal: item.signal,
        outcome: item.trade_outcome || 'PENDING',
        rDelta,
        cumulativeR: parseFloat(cumulativeR.toFixed(1)),
      };
    });

    // Outcome Distribution for PieChart
    const outcomeData = [
      { name: 'Winning Signals', value: wins.length, color: '#10B981' },
      { name: 'Break Even', value: breakEvens.length, color: '#F59E0B' },
      { name: 'Losing Signals', value: losses.length, color: '#F43F5E' },
      { name: 'Active Monitoring', value: pending.length, color: '#6B7280' },
    ].filter((d) => d.value > 0);

    return {
      total,
      wins: wins.length,
      losses: losses.length,
      breakEvens: breakEvens.length,
      pending: pending.length,
      closedCount,
      aiAccuracy: aiAccuracy.toFixed(1),
      netR: netR.toFixed(1),
      categoryData,
      confidenceStats,
      directionStats,
      rTimeline,
      outcomeData,
    };
  }, [activeAnalyses, chartTimeRange]);


  // Filtered signal ledger table
  const filteredLedger = activeAnalyses.filter((item) => {
    const matchesSearch =
      item.pair.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.signal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.explanation && item.explanation.toLowerCase().includes(searchQuery.toLowerCase()));

    const status = item.trade_outcome || 'PENDING';
    const matchesStatus = filterStatus === 'ALL' || status === filterStatus;

    const cat = detectAssetCategory(item.pair);
    const matchesMarket = filterMarket === 'ALL' || cat === filterMarket;

    return matchesSearch && matchesStatus && matchesMarket;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="border border-gray-800 bg-zinc-950/80 backdrop-blur p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-black font-extrabold shadow-lg shadow-amber-500/20">
              <Sparkles className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-extrabold text-white tracking-tight">
                  AI Signal Accuracy & Market Performance Center
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Live Audit
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Track how accurately the AI analyzes market charts, verify win/loss hit rates against Take Profit and Stop Loss levels, and audit all generated signals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-gray-800 text-center">
              <span className="text-[10px] uppercase font-semibold text-gray-400 block">Single TP Payoff</span>
              <span className="text-sm font-extrabold text-amber-400 font-mono">1:10 Target R:R</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-gray-800 text-center">
              <span className="text-[10px] uppercase font-semibold text-gray-400 block">Breakeven Rate</span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono">9.1% Required</span>
            </div>
          </div>
        </div>

        {/* Global vs Personal AI Accuracy Scope Toggle */}
        <div className="mt-6 pt-6 border-t border-gray-900 flex items-center justify-between flex-wrap gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-400">Accuracy & Results Scope:</span>
            <div className="inline-flex p-1 bg-zinc-900 rounded-xl border border-gray-800">
              <button
                type="button"
                onClick={() => setDataScope('global')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dataScope === 'global' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}
              >
                Global Community AI Accuracy (All Users)
              </button>
              <button
                type="button"
                onClick={() => setDataScope('personal')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${dataScope === 'personal' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}
              >
                My Personal Analyses
              </button>
            </div>
          </div>
          <span className="text-xs text-amber-400/90 font-mono font-semibold">
            Categorising {activeAnalyses.length} signal records ({dataScope === 'global' ? 'Global Community' : 'Personal'})
          </span>
        </div>

        {/* Time-Range Filter for Statistics */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Visualization Time Range:</span>
          {(['7D', '30D', '90D', 'ALL'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setChartTimeRange(range)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartTimeRange === range
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-zinc-900 border border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {range === '7D' ? 'Last 7 Days' : range === '30D' ? 'Last 30 Days' : range === '90D' ? 'Last 90 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>


      {/* Primary AI Accuracy Scoreboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dedicated RobexCapital Scanner AI Accuracy Scoreboard */}
        <div className="p-6 bg-gradient-to-br from-zinc-950 to-zinc-900 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/10 space-y-2 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              RobexCapital Scanner AI Accuracy
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white font-mono tracking-tight">
            {stats.aiAccuracy}%
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-gray-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${stats.aiAccuracy}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400 font-mono block">
              {stats.wins} Wins | {stats.losses} Losses | {stats.breakEvens} Break-Even
            </span>
          </div>
        </div>
        
        {/* AI Signal Accuracy Rate */}
        <div className="p-6 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Overall Signal Hit Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white font-mono tracking-tight">
            {stats.aiAccuracy}%
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-gray-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${stats.aiAccuracy}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-500 font-mono block">
              {stats.wins} Winning / {stats.losses} Losing ({stats.closedCount} Resolved)
            </span>
          </div>
        </div>

        {/* Accumulated Net R-Multiple */}
        <div className="p-6 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Cumulative Edge (R)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-4xl font-extrabold font-mono tracking-tight ${
              parseFloat(stats.netR) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {parseFloat(stats.netR) >= 0 ? `+${stats.netR}R` : `${stats.netR}R`}
          </div>
          <p className="text-xs text-gray-500 font-mono">
            +10R Reward per Win vs -1R Risk per Loss
          </p>
        </div>

        {/* Signals Monitored */}
        <div className="p-6 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Signals Analyzed
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-white font-mono tracking-tight">
            {stats.total}
          </div>
          <p className="text-xs text-amber-400/90 font-mono">
            {stats.pending} Signals Actively Tracking Live Price
          </p>
        </div>

        {/* Mathematical Expectancy Advantage */}
        <div className="p-6 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Expectancy Edge
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-4xl font-extrabold text-purple-300 font-mono tracking-tight">
            {parseFloat(stats.aiAccuracy) > 20 ? 'High Edge' : 'Active'}
          </div>
          <p className="text-xs text-gray-500 font-mono">
            Asymmetric 1:10 R:R payoff dominates coin-flip (50%)
          </p>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cumulative R Expectancy Curve */}
        <div className="lg:col-span-2 p-6 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              AI Cumulative R-Growth Curve
            </h3>
            <span className="text-xs font-mono text-gray-400">
              Net: <strong className="text-emerald-400">{parseFloat(stats.netR) >= 0 ? `+${stats.netR}R` : `${stats.netR}R`}</strong>
            </span>
          </div>

          {stats.rTimeline.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
              No signal resolutions recorded yet. Upload a chart and monitor price triggers.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.rTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="step" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} unit="R" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                    labelStyle={{ color: '#f4f4f5', fontWeight: 'bold' }}
                    itemStyle={{ color: '#F59E0B' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeR"
                    name="Cumulative R"
                    stroke="#F59E0B"
                    strokeWidth={3}
                    dot={{ fill: '#F59E0B', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* AI Signal Resolution Pie Split */}
        <div className="p-6 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl flex flex-col justify-between">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-amber-500" />
            AI Signal Outcomes Split
          </h3>

          {stats.outcomeData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
              No signals recorded yet.
            </div>
          ) : (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.outcomeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {stats.outcomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex justify-center gap-4 text-xs font-semibold pt-2 border-t border-gray-900">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Wins ({stats.wins})
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Losses ({stats.losses})
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Active ({stats.pending})
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Dimensional Accuracy Breakdown: Market, Confidence, Direction */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Market Category Accuracy */}
        <div className="p-6 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Coins className="w-4 h-4 text-blue-400" />
            Accuracy by Market Category
          </h4>
          <div className="space-y-3">
            {stats.categoryData.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-400">{item.category}</span>
                  <span className="text-white font-bold">{item.accuracy}% ({item.wins}W / {item.losses}L)</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-gray-800">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${Math.min(item.accuracy, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Confidence Accuracy */}
        <div className="p-6 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Accuracy by Confidence Tier
          </h4>
          <div className="space-y-3">
            {(['High', 'Medium', 'Low'] as const).map((tier) => {
              const val = stats.confidenceStats[tier];
              const resolved = val.wins + val.losses;
              const rate = resolved > 0 ? ((val.wins / resolved) * 100).toFixed(1) : '0.0';
              return (
                <div key={tier} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">{tier} Confidence</span>
                    <span className="text-white font-bold">{rate}% ({val.wins}W / {val.losses}L)</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-gray-800">
                    <div
                      className={`h-full ${
                        tier === 'High' ? 'bg-emerald-500' : tier === 'Medium' ? 'bg-amber-500' : 'bg-gray-500'
                      }`}
                      style={{ width: `${Math.min(parseFloat(rate), 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Directional Accuracy (BUY vs SELL) */}
        <div className="p-6 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Accuracy by Direction
          </h4>
          <div className="space-y-3">
            {(['BUY', 'SELL'] as const).map((dir) => {
              const val = stats.directionStats[dir];
              const resolved = val.wins + val.losses;
              const rate = resolved > 0 ? ((val.wins / resolved) * 100).toFixed(1) : '0.0';
              const isBuy = dir === 'BUY';
              return (
                <div key={dir} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className={isBuy ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {dir} Signals
                    </span>
                    <span className="text-white font-bold">{rate}% ({val.wins}W / {val.losses}L)</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-gray-800">
                    <div
                      className={`h-full ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(parseFloat(rate), 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RobexCapital Strategy & Personal Trade Correlation Analysis Section */}
      {(() => {
        const robexAiSignals = activeAnalyses.filter(
          (a) => a.analysis_type?.toLowerCase().includes('robexcapital') || a.explanation?.toLowerCase().includes('robexcapital')
        );

        const personalList = personalTrades || [];
        const alignedPersonalTrades = personalList.filter((pt) => {
          const matchesSignal = robexAiSignals.some(
            (sig) => sig.pair.toUpperCase() === pt.pair.toUpperCase() && sig.signal === pt.direction
          );
          const mentionsRobex = (pt.strategy || '').toLowerCase().includes('robexcapital') || (pt.notes || '').toLowerCase().includes('robexcapital');
          return matchesSignal || mentionsRobex;
        });

        const alignedWins = alignedPersonalTrades.filter((t) => t.outcome === 'WIN').length;
        const alignedClosed = alignedPersonalTrades.filter((t) => t.outcome === 'WIN' || t.outcome === 'LOSS').length;
        const alignedWinRate = alignedClosed > 0 ? ((alignedWins / alignedClosed) * 100).toFixed(1) : '0.0';

        const unalignedPersonalTrades = personalList.filter((pt) => !alignedPersonalTrades.includes(pt));
        const unalignedWins = unalignedPersonalTrades.filter((t) => t.outcome === 'WIN').length;
        const unalignedClosed = unalignedPersonalTrades.filter((t) => t.outcome === 'WIN' || t.outcome === 'LOSS').length;
        const unalignedWinRate = unalignedClosed > 0 ? ((unalignedWins / unalignedClosed) * 100).toFixed(1) : '0.0';

        const correlationScore = personalList.length > 0
          ? Math.min(100, Math.round((alignedPersonalTrades.length / personalList.length) * 100))
          : 0;

        return (
          <div className="border border-amber-500/30 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 md:p-8 rounded-2xl shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-900 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    RobexCapital Strategy & Personal Trade Correlation Analysis
                  </h3>
                  <p className="text-xs text-gray-400">
                    Evaluating how successfully your manual executions align with the 65% win-rate RobexCapital AI strategy
                  </p>
                </div>
              </div>

              <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Strategy Alignment Score</span>
                <span className="text-2xl font-extrabold text-amber-400 font-mono">{correlationScore}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              <div className="p-5 bg-zinc-900/70 border border-gray-800 rounded-xl space-y-2">
                <span className="text-xs text-gray-400 uppercase font-semibold block">Aligned Manual Trades</span>
                <div className="text-2xl font-extrabold text-white font-mono">{alignedPersonalTrades.length} Trades</div>
                <p className="text-xs text-emerald-400 font-mono">
                  Aligned Win Rate: <span className="font-bold">{alignedWinRate}%</span> ({alignedWins}W / {alignedClosed} Closed)
                </p>
              </div>

              <div className="p-5 bg-zinc-900/70 border border-gray-800 rounded-xl space-y-2">
                <span className="text-xs text-gray-400 uppercase font-semibold block">Unaligned Manual Trades</span>
                <div className="text-2xl font-extrabold text-white font-mono">{unalignedPersonalTrades.length} Trades</div>
                <p className="text-xs text-gray-400 font-mono">
                  Unaligned Win Rate: <span className="font-bold">{unalignedWinRate}%</span> ({unalignedWins}W / {unalignedClosed} Closed)
                </p>
              </div>

              <div className="p-5 bg-zinc-900/70 border border-gray-800 rounded-xl space-y-2">
                <span className="text-xs text-gray-400 uppercase font-semibold block">Strategic Edge Audit</span>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {correlationScore >= 50
                    ? 'High correlation with RobexCapital AI signals. Your manual setups demonstrate strong adherence to 3-candle volume exhaustion principles.'
                    : 'Low strategy correlation. Increase execution alignment with RobexCapital setups (2 consecutive candles with decreasing volume + reversal) to improve edge.'}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ALL CONTENT ADDED TO PERFORMANCE SECTION: Comprehensive AI Signal Audit Ledger */}
      <div className="border border-gray-800 bg-zinc-950/90 backdrop-blur rounded-2xl shadow-2xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-900 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-amber-500" />
              Complete AI Signal Accuracy Audit Ledger
            </h3>
            <p className="text-xs text-gray-400">
              Audit every signal generated by the AI: entry, single 1:10 take profit, stop loss, and verified live outcome
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">
              Showing {filteredLedger.length} of {analyses.length} signals
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {(['ALL', 'WIN', 'LOSS', 'PENDING'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === st
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-zinc-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'All Outcomes' : st === 'WIN' ? 'Winning (TP Hit)' : st === 'LOSS' ? 'Losing (SL Hit)' : 'Monitoring'}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Filter pair, signal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-gray-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Signal Table / Grid */}
        {filteredLedger.length === 0 ? (
          <div className="text-center py-12 border border-gray-900 bg-zinc-900/30 rounded-xl p-6">
            <Clock className="w-10 h-10 text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-400 font-semibold">No AI Signals Match Filter</p>
            <p className="text-xs text-gray-600">Try adjusting your outcome or market filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-gray-400 uppercase font-mono border-b border-gray-800">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Asset</th>
                  <th className="py-3 px-3">Signal</th>
                  <th className="py-3 px-3">Entry</th>
                  <th className="py-3 px-3">Stop Loss</th>
                  <th className="py-3 px-3">Single TP (1:10)</th>
                  <th className="py-3 px-3">Confidence</th>
                  <th className="py-3 px-3">AI Outcome Result</th>
                  <th className="py-3 px-3 text-right">R-Payoff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900 font-mono">
                {filteredLedger.map((item) => {
                  const isBuy = item.signal === 'BUY';
                  const isWin = item.trade_outcome === 'WIN';
                  const isLoss = item.trade_outcome === 'LOSS';
                  const isPending = !item.trade_outcome || item.trade_outcome === 'PENDING';

                  return (
                    <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-3 text-gray-500">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {item.pair}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold ${
                            isBuy
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {item.signal}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-300 font-bold">
                        {item.entry_price || '--'}
                      </td>
                      <td className="py-3 px-3 text-rose-400 font-bold">
                        {item.stop_loss || '--'}
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-bold">
                        {item.take_profit_1 || '--'}
                      </td>
                      <td className="py-3 px-3 text-amber-400/90 font-semibold font-sans">
                        {item.confidence}
                      </td>
                      <td className="py-3 px-3">
                        {isWin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            WIN (TP Hit)
                          </span>
                        ) : isLoss ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            LOSS (SL Hit)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-2.5 h-2.5" />
                            MONITORING
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold font-mono">
                        {isWin ? (
                          <span className="text-emerald-400">{item.pnl_amount || '+10.0R'}</span>
                        ) : isLoss ? (
                          <span className="text-rose-400">{item.pnl_amount || '-1.0R'}</span>
                        ) : (
                          <span className="text-gray-500">0.0R</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
