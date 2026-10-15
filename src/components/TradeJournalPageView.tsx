import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Search,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  TrendingUp,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import type { PersonalTradeRecord, AssetCategory } from '../firebase';
import { detectAssetCategory } from '../firebase';
import { DailyChecklist } from './DailyChecklist';

interface TradeJournalPageViewProps {
  personalTrades: PersonalTradeRecord[];
  onAddTrade: (trade: PersonalTradeRecord) => void;
  onUpdateTrade: (trade: PersonalTradeRecord) => void;
  onDeleteTrade: (id: string, e: React.MouseEvent) => void;
  onResetAllData?: () => void;
}

export const TradeJournalPageView: React.FC<TradeJournalPageViewProps> = ({
  personalTrades,
  onAddTrade,
  onUpdateTrade,
  onDeleteTrade,
  onResetAllData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN'>('ALL');
  const [filterCategory, setFilterCategory] = useState<AssetCategory | 'ALL'>('ALL');
  const [chartTimeRange, setChartTimeRange] = useState<'7D' | '30D' | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<PersonalTradeRecord | null>(null);

  // Form State - strictly manual entry
  const [formData, setFormData] = useState({
    pair: '',
    direction: 'BUY' as 'BUY' | 'SELL',
    category: 'forex' as AssetCategory,
    lotSize: '',
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    takeProfit: '',
    outcome: 'OPEN' as 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN',
    pnlAmount: '',
    broker: '',
    strategy: '',
    notes: '',
    executionDate: new Date().toISOString().split('T')[0],
  });

  const resetForm = () => {
    setFormData({
      pair: '',
      direction: 'BUY',
      category: 'forex',
      lotSize: '',
      entryPrice: '',
      exitPrice: '',
      stopLoss: '',
      takeProfit: '',
      outcome: 'OPEN',
      pnlAmount: '',
      broker: '',
      strategy: '',
      notes: '',
      executionDate: new Date().toISOString().split('T')[0],
    });
    setEditingTrade(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (trade: PersonalTradeRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTrade(trade);
    setFormData({
      pair: trade.pair,
      direction: trade.direction,
      category: trade.category || detectAssetCategory(trade.pair),
      lotSize: trade.lotSize || '',
      entryPrice: trade.entryPrice || '',
      exitPrice: trade.exitPrice || '',
      stopLoss: trade.stopLoss || '',
      takeProfit: trade.takeProfit || '',
      outcome: trade.outcome,
      pnlAmount: trade.pnlAmount || '',
      broker: trade.broker || '',
      strategy: trade.strategy || '',
      notes: trade.notes || '',
      executionDate: trade.executionDate ? trade.executionDate.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pair || !formData.entryPrice) return;

    if (editingTrade) {
      const updated: PersonalTradeRecord = {
        ...editingTrade,
        pair: formData.pair.toUpperCase().trim(),
        direction: formData.direction,
        category: formData.category,
        lotSize: formData.lotSize,
        entryPrice: formData.entryPrice,
        exitPrice: formData.exitPrice,
        stopLoss: formData.stopLoss,
        takeProfit: formData.takeProfit,
        outcome: formData.outcome,
        pnlAmount: formData.pnlAmount,
        broker: formData.broker,
        strategy: formData.strategy,
        notes: formData.notes,
        executionDate: formData.executionDate,
      };
      onUpdateTrade(updated);
    } else {
      const newTrade: PersonalTradeRecord = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: 'current',
        pair: formData.pair.toUpperCase().trim(),
        direction: formData.direction,
        category: formData.category,
        lotSize: formData.lotSize,
        entryPrice: formData.entryPrice,
        exitPrice: formData.exitPrice,
        stopLoss: formData.stopLoss,
        takeProfit: formData.takeProfit,
        outcome: formData.outcome,
        pnlAmount: formData.pnlAmount,
        broker: formData.broker,
        strategy: formData.strategy,
        notes: formData.notes,
        executionDate: formData.executionDate,
        createdAt: new Date().toISOString(),
      };
      onAddTrade(newTrade);
    }

    setIsModalOpen(false);
  };

  // Filtered personal trades
  const filteredTrades = personalTrades.filter((item) => {
    const matchesSearch =
      item.pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.broker && item.broker.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.strategy && item.strategy.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesOutcome = filterOutcome === 'ALL' || item.outcome === filterOutcome;
    const cat = item.category || detectAssetCategory(item.pair);
    const matchesCategory = filterCategory === 'ALL' || cat === filterCategory;

    return matchesSearch && matchesOutcome && matchesCategory;
  });

  // Calculate Personal Trade Metrics & Advanced Statistics
  const closedTrades = personalTrades.filter((t) => t.outcome === 'WIN' || t.outcome === 'LOSS');
  const winCount = personalTrades.filter((t) => t.outcome === 'WIN').length;
  const lossCount = personalTrades.filter((t) => t.outcome === 'LOSS').length;
  const openCount = personalTrades.filter((t) => t.outcome === 'OPEN').length;
  const beCount = personalTrades.filter((t) => t.outcome === 'BREAKEVEN').length;

  const winRate =
    closedTrades.length > 0 ? ((winCount / closedTrades.length) * 100).toFixed(1) : '0.0';

  let totalPnl = 0;
  let totalProfits = 0;
  let totalLosses = 0;
  const winPnlList: number[] = [];
  const lossPnlList: number[] = [];

  personalTrades.forEach((t) => {
    if (t.pnlAmount) {
      const clean = parseFloat(t.pnlAmount.replace(/[^0-9.-]/g, ''));
      if (!isNaN(clean)) {
        totalPnl += clean;
        if (clean > 0) {
          totalProfits += clean;
          winPnlList.push(clean);
        } else if (clean < 0) {
          totalLosses += Math.abs(clean);
          lossPnlList.push(Math.abs(clean));
        }
      }
    }
  });

  const profitFactor =
    totalLosses > 0 ? (totalProfits / totalLosses).toFixed(2) : totalProfits > 0 ? 'MAX' : '0.00';

  const expectancy = closedTrades.length > 0 ? (totalPnl / closedTrades.length).toFixed(2) : '0.00';
  const avgWin = winPnlList.length > 0 ? (totalProfits / winPnlList.length).toFixed(2) : '0.00';
  const avgLoss = lossPnlList.length > 0 ? (totalLosses / lossPnlList.length).toFixed(2) : '0.00';
  const largestWin = winPnlList.length > 0 ? Math.max(...winPnlList).toFixed(2) : '0.00';
  const largestLoss = lossPnlList.length > 0 ? Math.max(...lossPnlList).toFixed(2) : '0.00';

  const longTrades = personalTrades.filter(t => t.direction === 'BUY' && (t.outcome === 'WIN' || t.outcome === 'LOSS'));
  const longWins = longTrades.filter(t => t.outcome === 'WIN').length;
  const longWinRate = longTrades.length > 0 ? ((longWins / longTrades.length) * 100).toFixed(1) : '0.0';

  const shortTrades = personalTrades.filter(t => t.direction === 'SELL' && (t.outcome === 'WIN' || t.outcome === 'LOSS'));
  const shortWins = shortTrades.filter(t => t.outcome === 'WIN').length;
  const shortWinRate = shortTrades.length > 0 ? ((shortWins / shortTrades.length) * 100).toFixed(1) : '0.0';

  // Recharts data preparation with time-range filtering
  const nowTime = new Date().getTime();
  const timeFilteredTrades = personalTrades.filter((t) => {
    if (chartTimeRange === 'ALL') return true;
    const tradeDate = new Date(t.executionDate || t.createdAt).getTime();
    const diffDays = (nowTime - tradeDate) / (1000 * 60 * 60 * 24);
    if (chartTimeRange === '7D') return diffDays <= 7;
    if (chartTimeRange === '30D') return diffDays <= 30;
    return true;
  });

  const timeFilteredClosedTrades = timeFilteredTrades.filter((t) => t.outcome === 'WIN' || t.outcome === 'LOSS' || t.outcome === 'BREAKEVEN');
  const timeFilteredWinCount = timeFilteredTrades.filter((t) => t.outcome === 'WIN').length;
  const timeFilteredLossCount = timeFilteredTrades.filter((t) => t.outcome === 'LOSS').length;
  const timeFilteredBeCount = timeFilteredTrades.filter((t) => t.outcome === 'BREAKEVEN').length;
  const timeFilteredOpenCount = timeFilteredTrades.filter((t) => t.outcome === 'OPEN').length;
  const timeFilteredWinRate = timeFilteredClosedTrades.length > 0 ? ((timeFilteredWinCount / timeFilteredClosedTrades.length) * 100).toFixed(1) : '0.0';

  let timeFilteredTotalPnl = 0;
  timeFilteredTrades.forEach((t) => {
    if (t.pnlAmount) {
      const clean = parseFloat(t.pnlAmount.replace(/[^0-9.-]/g, ''));
      if (!isNaN(clean)) timeFilteredTotalPnl += clean;
    }
  });

  const winLossPieData = [
    { name: 'Wins', value: timeFilteredWinCount, color: '#34d399' },
    { name: 'Losses', value: timeFilteredLossCount, color: '#f43f5e' },
    { name: 'Break Even', value: timeFilteredBeCount, color: '#fbbf24' },
    { name: 'Open', value: timeFilteredOpenCount, color: '#a855f7' },
  ].filter(d => d.value > 0);

  const sortedTradesForChart = [...timeFilteredTrades]
    .filter(t => t.outcome === 'WIN' || t.outcome === 'LOSS' || t.outcome === 'BREAKEVEN')
    .sort((a, b) => new Date(a.executionDate || a.createdAt).getTime() - new Date(b.executionDate || b.createdAt).getTime());

  let runningPnl = 0;
  const cumulativePnlData = sortedTradesForChart.map((t, idx) => {
    let pnlNum = 0;
    if (t.pnlAmount) {
      const clean = parseFloat(t.pnlAmount.replace(/[^0-9.-]/g, ''));
      if (!isNaN(clean)) pnlNum = clean;
    }
    runningPnl += pnlNum;
    return {
      index: `Trade #${idx + 1}`,
      pair: t.pair,
      pnl: pnlNum,
      cumulative: parseFloat(runningPnl.toFixed(2)),
      date: (t.executionDate || t.createdAt).slice(5, 10),
    };
  });



  // Export to CSV
  const handleExportCSV = () => {
    if (personalTrades.length === 0) return;
    const headers = ['ID', 'Date', 'Pair', 'Direction', 'Category', 'LotSize', 'Entry', 'Exit', 'SL', 'TP', 'Outcome', 'PnL', 'Broker', 'Strategy', 'Notes'];
    const rows = personalTrades.map((t) => [
      t.id,
      t.executionDate || t.createdAt,
      t.pair,
      t.direction,
      t.category || '',
      t.lotSize || '',
      t.entryPrice || '',
      t.exitPrice || '',
      t.stopLoss || '',
      t.takeProfit || '',
      t.outcome,
      t.pnlAmount || '',
      `"${(t.broker || '').replace(/"/g, '""')}"`,
      `"${(t.strategy || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `personal_trading_journal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="border border-gray-800 bg-zinc-950/80 backdrop-blur p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Personal Live Trade Execution Journal
              </h2>
              <p className="text-sm text-gray-400">
                Record your real broker trade executions manually, manage position sizes, and track personal trading P&L
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={personalTrades.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white border border-gray-800 transition-all cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Export CSV
            </button>

            {onResetAllData && (
              <button
                type="button"
                onClick={onResetAllData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                title="Reset all trade logs, journal data, and stats to zero"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                Reset Data to Zero
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black shadow-lg shadow-amber-500/20 border border-amber-400/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Log Manual Trade
            </button>
          </div>
        </div>
      </div>

      {/* Personal Trading KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Realized Win Rate */}
        <div className="p-5 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            Personal Win Rate
          </span>
          <div className="text-3xl font-extrabold text-white font-mono tracking-tight mb-1">
            {winRate}%
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {winCount}W - {lossCount}L ({beCount} BE)
          </span>
        </div>

        {/* Net Realized PnL */}
        <div className="p-5 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            Net Realized P&L
          </span>
          <div
            className={`text-3xl font-extrabold font-mono tracking-tight mb-1 ${
              totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`}
          </div>
          <span className="text-xs text-gray-500 font-mono">
            +${totalProfits.toFixed(0)} / -${totalLosses.toFixed(0)}
          </span>
        </div>

        {/* Total Trades */}
        <div className="p-5 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            Total Executed
          </span>
          <div className="text-3xl font-extrabold text-white font-mono tracking-tight mb-1">
            {personalTrades.length}
          </div>
          <span className="text-xs text-amber-400/90 font-mono">
            {openCount} Open Positions
          </span>
        </div>

        {/* Profit Factor */}
        <div className="p-5 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            Profit Factor
          </span>
          <div className="text-3xl font-extrabold text-amber-400 font-mono tracking-tight mb-1">
            {profitFactor}
          </div>
          <span className="text-xs text-gray-500 font-mono">
            Gross Win / Gross Loss
          </span>
        </div>
      </div>

      {/* Advanced Professional Statistics & Analytics Panel */}
      <div className="p-6 bg-zinc-950/90 border border-gray-800 rounded-2xl shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-gray-900 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Advanced Institutional Performance Analytics
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Comprehensive statistical breakdown of your execution edge, expectancy, and directional bias.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 bg-zinc-900/60 border border-gray-800/80 rounded-xl">
            <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">Trade Expectancy</span>
            <div className={`text-xl font-extrabold font-mono ${parseFloat(expectancy) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {parseFloat(expectancy) >= 0 ? `+$${expectancy}` : `-$${Math.abs(parseFloat(expectancy))}`}
            </div>
            <span className="text-[10px] text-gray-500 block mt-1">Per Closed Trade</span>
          </div>

          <div className="p-4 bg-zinc-900/60 border border-gray-800/80 rounded-xl">
            <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">Average Win</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">
              +${avgWin}
            </div>
            <span className="text-[10px] text-gray-500 block mt-1">{winPnlList.length} Winning Trades</span>
          </div>

          <div className="p-4 bg-zinc-900/60 border border-gray-800/80 rounded-xl">
            <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">Average Loss</span>
            <div className="text-xl font-extrabold text-rose-400 font-mono">
              -${avgLoss}
            </div>
            <span className="text-[10px] text-gray-500 block mt-1">{lossPnlList.length} Losing Trades</span>
          </div>

          <div className="p-4 bg-zinc-900/60 border border-gray-800/80 rounded-xl">
            <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">Largest Win / Loss</span>
            <div className="text-lg font-extrabold font-mono text-white flex items-center gap-2">
              <span className="text-emerald-400">+${largestWin}</span>
              <span className="text-gray-600">/</span>
              <span className="text-rose-400">-${largestLoss}</span>
            </div>
            <span className="text-[10px] text-gray-500 block mt-1">Peak Extremes</span>
          </div>

          <div className="p-4 bg-zinc-900/60 border border-gray-800/80 rounded-xl">
            <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">Longs Win Rate</span>
            <div className="text-xl font-extrabold text-white font-mono">
              {longWinRate}%
            </div>
            <span className="text-[10px] text-gray-500 block mt-1">{longTrades.length} Total Longs</span>
          </div>

          <div className="p-4 bg-zinc-900/60 border border-gray-800/80 rounded-xl">
            <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">Shorts Win Rate</span>
            <div className="text-xl font-extrabold text-white font-mono">
              {shortWinRate}%
            </div>
            <span className="text-[10px] text-gray-500 block mt-1">{shortTrades.length} Total Shorts</span>
          </div>
        </div>
      </div>

      {/* Recharts Performance Visualization Section with Time-Range Filter */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-950/90 border border-gray-800 p-4 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-bold text-white">Interactive Performance Visualizations</h3>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs text-gray-400 font-semibold uppercase mr-1">Time Range:</span>
            {(['7D', '30D', 'ALL'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setChartTimeRange(range)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  chartTimeRange === range
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-zinc-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {range === '7D' ? 'Last 7 Days' : range === '30D' ? 'Last 30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Win/Loss Ratio Distribution Pie / Donut Chart */}
          <div className="p-6 bg-zinc-950/90 border border-gray-800 rounded-2xl shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-amber-500" />
                Win / Loss Outcome Distribution
              </h3>
              <span className="text-xs text-gray-400 font-mono">
                {timeFilteredWinCount} Wins / {timeFilteredLossCount} Losses ({timeFilteredWinRate}%)
              </span>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              {winLossPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={winLossPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      {winLossPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#18181b" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 text-xs py-12">
                  No closed trades recorded in this time range.
                </div>
              )}
            </div>
          </div>

          {/* Cumulative PnL Curve Chart */}
          <div className="p-6 bg-zinc-950/90 border border-gray-800 rounded-2xl shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Cumulative Equity Curve ($)
              </h3>
              <span className={`text-xs font-mono font-bold ${timeFilteredTotalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                Net: {timeFilteredTotalPnl >= 0 ? `+$${timeFilteredTotalPnl.toFixed(2)}` : `-$${Math.abs(timeFilteredTotalPnl).toFixed(2)}`}
              </span>
            </div>

            <div className="h-64 w-full">
              {cumulativePnlData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativePnlData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#fff' }}
                      formatter={(value: any) => [`$${value}`, 'Cumulative P&L']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload ? `${payload[0].payload.index} (${payload[0].payload.pair})` : label}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#34d399"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#pnlGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 text-xs py-12">
                  No closed trades with P&L data in this time range.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Daily Trader's Checklist */}
      <DailyChecklist />



      {/* Filter & Search Bar */}
      <div className="p-4 bg-zinc-950/80 border border-gray-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Outcome Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {(['ALL', 'WIN', 'LOSS', 'OPEN', 'BREAKEVEN'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterOutcome(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterOutcome === status
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-zinc-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search pair, broker, setup, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Market Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-gray-900 pt-3 text-xs">
          <span className="text-gray-500 font-semibold text-[11px] uppercase mr-1">Market:</span>
          {(['ALL', 'forex', 'stock', 'crypto', 'indices'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                filterCategory === cat
                  ? 'bg-zinc-800 text-amber-400 border border-amber-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {cat === 'ALL' ? 'All Markets' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Trades List / Grid */}
      {filteredTrades.length === 0 ? (
        <div className="text-center py-16 border border-gray-900 bg-zinc-950/60 rounded-2xl p-8 space-y-4">
          <BookOpen className="w-12 h-12 text-gray-700 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-white mb-1">No Personal Trades Found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {personalTrades.length === 0
                ? "You haven't logged any personal live trades yet. Click 'Log Manual Trade' to begin recording real executions."
                : 'No trades match your current filter and search criteria.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Your First Live Trade
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrades.map((trade) => {
            const isBuy = trade.direction === 'BUY';
            const isWin = trade.outcome === 'WIN';
            const isLoss = trade.outcome === 'LOSS';
            const isOpen = trade.outcome === 'OPEN';

            return (
              <div
                key={trade.id}
                className="p-5 bg-zinc-950/90 border border-gray-800/80 hover:border-amber-500/30 rounded-2xl shadow-xl transition-all space-y-4 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Row: Symbol, Direction, Outcome Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-extrabold ${
                          isBuy
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {trade.direction}
                      </span>
                      <span className="text-lg font-extrabold text-white font-mono tracking-tight">
                        {trade.pair}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                        isWin
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isLoss
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : isOpen
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          : 'bg-zinc-800 text-gray-300 border border-gray-700'
                      }`}
                    >
                      {trade.outcome}
                    </span>
                  </div>

                  {/* Sub Details: Broker & Strategy */}
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono mb-3">
                    {trade.broker && (
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-gray-800 text-gray-400">
                        {trade.broker}
                      </span>
                    )}
                    {trade.lotSize && (
                      <span>Size: <strong className="text-gray-300">{trade.lotSize}</strong></span>
                    )}
                    <span className="ml-auto text-[10px]">{trade.executionDate || trade.createdAt.slice(0, 10)}</span>
                  </div>

                  {/* Price Execution Grid */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-zinc-900/60 border border-gray-800/80 rounded-xl text-xs font-mono mb-3">
                    <div>
                      <span className="text-[10px] text-gray-500 block">ENTRY</span>
                      <span className="text-white font-bold">{trade.entryPrice || '--'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">STOP LOSS</span>
                      <span className="text-rose-400 font-bold">{trade.stopLoss || '--'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">
                        {trade.exitPrice ? 'EXIT' : 'TAKE PROFIT'}
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {trade.exitPrice || trade.takeProfit || '--'}
                      </span>
                    </div>
                  </div>

                  {/* Realized PnL Banner */}
                  {trade.pnlAmount && (
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between font-mono text-xs font-bold mb-3 ${
                        isWin
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                          : isLoss
                          ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                          : 'bg-zinc-900 border-gray-800 text-gray-300'
                      }`}
                    >
                      <span>Realized P&L:</span>
                      <span className="text-sm font-extrabold">{trade.pnlAmount}</span>
                    </div>
                  )}

                  {/* Setup & Notes */}
                  {trade.strategy && (
                    <div className="text-xs text-amber-400/90 font-medium mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      {trade.strategy}
                    </div>
                  )}

                  {trade.notes && (
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 bg-zinc-900/30 p-2 rounded-lg border border-gray-900">
                      {trade.notes}
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-gray-900 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-gray-500 font-mono">
                    ID: {trade.id.slice(0, 12)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(trade, e)}
                      className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                      title="Edit trade record"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onDeleteTrade(trade.id, e)}
                      className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                      title="Delete trade record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Trade Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {editingTrade ? 'Edit Live Personal Trade' : 'Log New Personal Trade'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Pair & Direction */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Asset / Ticker *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EUR/USD, NVDA, BTC/USD"
                    value={formData.pair}
                    onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                    className="w-full bg-zinc-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Direction *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, direction: 'BUY' })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formData.direction === 'BUY'
                          ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                          : 'bg-zinc-900 border-gray-800 text-gray-400'
                      }`}
                    >
                      BUY / LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, direction: 'SELL' })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formData.direction === 'SELL'
                          ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                          : 'bg-zinc-900 border-gray-800 text-gray-400'
                      }`}
                    >
                      SELL / SHORT
                    </button>
                  </div>
                </div>
              </div>

              {/* Execution Prices: Entry, Stop Loss, Take Profit */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Entry Price *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="1.0850"
                    value={formData.entryPrice}
                    onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                    className="w-full bg-zinc-900 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-rose-400 block mb-1">
                    Stop Loss
                  </label>
                  <input
                    type="text"
                    placeholder="1.0820"
                    value={formData.stopLoss}
                    onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                    className="w-full bg-zinc-900 border border-gray-800 rounded-xl px-3 py-2 text-sm text-rose-300 font-mono focus:outline-none focus:border-rose-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-emerald-400 block mb-1">
                    Take Profit / Exit
                  </label>
                  <input
                    type="text"
                    placeholder="1.0950"
                    value={formData.takeProfit}
                    onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value })}
                    className="w-full bg-zinc-900 border border-gray-800 rounded-xl px-3 py-2 text-sm text-emerald-300 font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Outcome & Realized PnL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Trade Outcome
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['WIN', 'LOSS', 'OPEN', 'BREAKEVEN'] as const).map((out) => (
                      <button
                        key={out}
                        type="button"
                        onClick={() => setFormData({ ...formData, outcome: out })}
                        className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          formData.outcome === out
                            ? 'bg-amber-500 text-black border-amber-400'
                            : 'bg-zinc-900 border-gray-800 text-gray-400'
                        }`}
                      >
                        {out}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Realized P&L ($ or R)
                  </label>
                  <input
                    type="text"
                    placeholder="+$350.00 or +10R"
                    value={formData.pnlAmount}
                    onChange={(e) => setFormData({ ...formData, pnlAmount: e.target.value })}
                    className="w-full bg-zinc-900 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Broker & Lot Size & Strategy */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Broker / Account
                  </label>
                  <input
                    type="text"
                    placeholder="MetaTrader, Binance, FTMO"
                    value={formData.broker}
                    onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                    className="w-full bg-zinc-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Position / Lot Size
                  </label>
                  <input
                    type="text"
                    placeholder="1.00 Lot / 50 Shares"
                    value={formData.lotSize}
                    onChange={(e) => setFormData({ ...formData, lotSize: e.target.value })}
                    className="w-full bg-zinc-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Strategy / Setup
                  </label>
                  <input
                    type="text"
                    placeholder="AI 1:10, Breakout..."
                    value={formData.strategy}
                    onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                    className="w-full bg-zinc-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Execution Date */}
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Execution Date
                </label>
                <input
                  type="date"
                  value={formData.executionDate}
                  onChange={(e) => setFormData({ ...formData, executionDate: e.target.value })}
                  className="w-full bg-zinc-900 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Execution Notes & Psychology */}
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Execution Review & Psychology Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Record trade mindset, execution precision, slippage, trade management decisions..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-zinc-900 border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-gray-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {editingTrade ? 'Update Live Trade' : 'Save Live Trade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
