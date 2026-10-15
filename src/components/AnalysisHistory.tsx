import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Trash2,
  Cloud,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Sparkles,
} from 'lucide-react';
import type { ForexAnalysisRecord } from '../firebase';

interface AnalysisHistoryProps {
  analyses: ForexAnalysisRecord[];
  onSelectAnalysis: (analysis: ForexAnalysisRecord) => void;
  onDeleteAnalysis?: (id: string, e: React.MouseEvent) => void;
  onUpdateOutcome?: (id: string, outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'PENDING', e: React.MouseEvent) => void;
  selectedId?: string;
  isCloudSynced?: boolean;
}

export const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({
  analyses,
  onSelectAnalysis,
  onDeleteAnalysis,
  onUpdateOutcome,
  selectedId,
  isCloudSynced,
}) => {
  const getConfidenceScore = (c: string) => {
    switch (c) {
      case 'High': return 3;
      case 'Medium': return 2;
      case 'Low': return 1;
      default: return 0;
    }
  };

  const getBadgeClass = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'SELL':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return <TrendingUp className="w-3 h-3" />;
      case 'SELL':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Recent';
    }
  };

  const [confidenceFilter, setConfidenceFilter] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');
  const [timeframeFilter, setTimeframeFilter] = useState<'ALL' | string>('ALL');
  const [pairFilter, setPairFilter] = useState<'ALL' | string>('ALL');

  const uniquePairs = Array.from(new Set(analyses.map((a) => a.pair))).sort();
  const timeframeOptions = [
    'Monthly Bias / Daily Entry',
    'Weekly Bias / 4H Entry',
    'Daily Bias / 1H Entry',
    '4H Bias / 15M Entry',
    '1H Bias / 5M Entry',
    '30M Bias / 1M Entry'
  ];

  const filteredAnalyses = analyses.filter((item) => {
    const matchesConfidence = confidenceFilter === 'ALL' || item.confidence === confidenceFilter;
    const matchesTimeframe = timeframeFilter === 'ALL' || (item.timeframe || '') === timeframeFilter;
    const matchesPair = pairFilter === 'ALL' || item.pair === pairFilter;
    return matchesConfidence && matchesTimeframe && matchesPair;
  });

  return (
    <div className="border border-gray-800 bg-zinc-950/80 backdrop-blur shadow-2xl rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-900 flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          Analysis History
        </h3>
        {isCloudSynced && (
          <span className="text-[10px] text-amber-400/80 flex items-center gap-1 font-mono">
            <Cloud className="w-3 h-3 text-amber-500" />
            Firestore Sync
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Filters */}
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <select
            className="bg-zinc-900 border border-gray-700 text-white text-[10px] rounded p-1.5 focus:outline-none focus:border-amber-500"
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value as any)}
          >
            <option value="ALL">All Confidence</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            className="bg-zinc-900 border border-gray-700 text-white text-[10px] rounded p-1.5 focus:outline-none focus:border-amber-500"
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value)}
          >
            <option value="ALL">All Timeframes</option>
            {timeframeOptions.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
          </select>
          <select
            className="bg-zinc-900 border border-gray-700 text-white text-[10px] rounded p-1.5 focus:outline-none focus:border-amber-500 col-span-2 sm:col-span-1"
            value={pairFilter}
            onChange={(e) => setPairFilter(e.target.value)}
          >
            <option value="ALL">All Pairs</option>
            {uniquePairs.map((pair) => <option key={pair} value={pair}>{pair}</option>)}
          </select>
        </div>

        {!filteredAnalyses || filteredAnalyses.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500 text-sm">
              No analysis matches your filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            <AnimatePresence>
              {filteredAnalyses.map((item, index) => {
                const isSelected = selectedId === item.id;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onSelectAnalysis(item)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer group relative ${
                      isSelected
                        ? 'border-amber-500/60 bg-zinc-900/90 shadow-lg shadow-amber-500/10'
                        : 'border-gray-800 bg-zinc-900/50 hover:border-amber-500/30 hover:bg-zinc-900/80'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-semibold ${getBadgeClass(
                            item.signal
                          )}`}
                        >
                          {getSignalIcon(item.signal)}
                          {item.signal}
                        </span>
                        <span className="text-amber-500 font-bold text-sm tracking-wide">
                          {item.pair}
                        </span>

                        {/* Strategy Name Badge */}
                        {item.analysis_type?.toLowerCase().includes('robexcapital') ||
                        item.analysis_type?.toLowerCase().includes('three') ||
                        item.analysis_type?.includes('65%') ||
                        !item.analysis_type ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            RobexCapital Strategy
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            George Milton VPA
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-500 font-mono">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                      {item.explanation}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-2 text-xs flex-wrap">
                        {item.entry_price && (
                          <span className="text-gray-500">
                            Entry:{' '}
                            <span className="text-gray-300 font-semibold font-mono">
                              {item.entry_price}
                            </span>
                          </span>
                        )}
                        {item.stop_loss && (
                          <span className="text-gray-500">
                            SL:{' '}
                            <span className="text-rose-400 font-semibold font-mono">
                              {item.stop_loss}
                            </span>
                          </span>
                        )}
                        {item.take_profit_1 && (
                          <span className="text-gray-500">
                            TP:{' '}
                            <span className="text-emerald-400 font-semibold font-mono">
                              {item.take_profit_1}
                            </span>
                          </span>
                        )}
                        {item.timeframe && (
                          <span className="text-gray-600 font-mono">
                            • {item.timeframe}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-amber-500/70 font-semibold">
                          • {item.confidence}
                          {(() => {
                            const currentScore = getConfidenceScore(item.confidence);
                            const previousItem = analyses
                              .slice(index + 1)
                              .find((a) => a.pair === item.pair);
                            const previousScore = previousItem ? getConfidenceScore(previousItem.confidence) : null;
                            let trendIcon = <Minus className="w-3 h-3" />;
                            let trendColor = 'text-gray-500';
                            if (previousScore !== null) {
                              if (currentScore > previousScore) { trendIcon = <ArrowUp className="w-3 h-3" />; trendColor = 'text-emerald-400'; }
                              else if (currentScore < previousScore) { trendIcon = <ArrowDown className="w-3 h-3" />; trendColor = 'text-rose-400'; }
                            }
                            return <span className={trendColor}>{trendIcon}</span>;
                          })()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onDeleteAnalysis && (
                          <button
                            type="button"
                            title="Delete this trade record (removes from device & Firebase)"
                            onClick={(e) => onDeleteAnalysis(item.id, e)}
                            className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ExternalLink className="w-3.5 h-3.5 text-amber-500/50" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
