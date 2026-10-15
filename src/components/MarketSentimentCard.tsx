import React, { useState, useEffect } from 'react';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ExternalLink,
  Newspaper,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle,
} from 'lucide-react';
import type { MarketSentimentResult } from '../../server/geminiService';

interface MarketSentimentCardProps {
  pair: string;
  technicalSignal?: 'BUY' | 'SELL' | 'HOLD';
}

export const MarketSentimentCard: React.FC<MarketSentimentCardProps> = ({
  pair,
  technicalSignal,
}) => {
  const [sentimentData, setSentimentData] = useState<MarketSentimentResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSentiment = async (targetPair: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/market-sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair: targetPair }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch sentiment');
      }
      const data: MarketSentimentResult = await response.json();
      setSentimentData(data);
    } catch (err: any) {
      console.error('Sentiment fetch error:', err);
      setError('Unable to load live news sentiment. Click refresh to retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pair) {
      fetchSentiment(pair);
    }
  }, [pair]);

  // Confluence calculation between Technical Signal and News Sentiment
  const confluence = sentimentData && technicalSignal
    ? (() => {
        const isTechBuy = technicalSignal === 'BUY';
        const isTechSell = technicalSignal === 'SELL';
        const isSentBull = sentimentData.sentiment === 'BULLISH';
        const isSentBear = sentimentData.sentiment === 'BEARISH';

        if ((isTechBuy && isSentBull) || (isTechSell && isSentBear)) {
          return {
            status: 'CONFLUENCE',
            label: 'Strong Technical & Fundamental Confluence',
            desc: `Both chart technicals (${technicalSignal}) and live news sentiment (${sentimentData.sentiment}) are in directional alignment.`,
            badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
            icon: ShieldCheck,
          };
        }
        if ((isTechBuy && isSentBear) || (isTechSell && isSentBull)) {
          return {
            status: 'DIVERGENCE',
            label: 'Macro Divergence Detected',
            desc: `Chart technicals suggest ${technicalSignal}, but live news headlines lean ${sentimentData.sentiment}. Use conservative sizing.`,
            badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
            icon: AlertTriangle,
          };
        }
        return {
          status: 'NEUTRAL',
          label: 'Neutral News Confluence',
          desc: `Current news flow is balanced while chart signals ${technicalSignal}.`,
          badgeClass: 'bg-zinc-800 text-gray-300 border-gray-700',
          icon: CheckCircle,
        };
      })()
    : null;

  return (
    <div className="border border-gray-800 bg-zinc-950/80 backdrop-blur shadow-2xl rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-900 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Market Sentiment & Google News Intelligence
            </h3>
            <p className="text-xs text-gray-400">
              Live macro headlines & sentiment score for <span className="text-amber-400 font-semibold">{pair}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchSentiment(pair)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-amber-400 bg-zinc-900/80 hover:bg-zinc-900 border border-gray-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh sentiment headlines from Google"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          {loading ? 'Analyzing News...' : 'Refresh Sentiment'}
        </button>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {loading && !sentimentData ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-sm text-gray-400">Scanning Google News headlines for {pair}...</p>
          </div>
        ) : error && !sentimentData ? (
          <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-center text-sm text-red-300">
            {error}
          </div>
        ) : sentimentData ? (
          <>
            {/* Top Row: Sentiment Score Gauge + Bull/Bear Meter */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Overall Bias Card */}
              <div className="p-4 bg-zinc-900/60 border border-gray-800 rounded-xl flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Overall Sentiment
                </span>
                <div className="flex items-center gap-3 my-2">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${
                      sentimentData.sentiment === 'BULLISH'
                        ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                        : sentimentData.sentiment === 'BEARISH'
                        ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white'
                        : 'bg-gradient-to-br from-amber-500 to-yellow-600 text-black'
                    }`}
                  >
                    {sentimentData.sentiment === 'BULLISH' ? (
                      <TrendingUp className="w-6 h-6 stroke-[2.5]" />
                    ) : sentimentData.sentiment === 'BEARISH' ? (
                      <TrendingDown className="w-6 h-6 stroke-[2.5]" />
                    ) : (
                      <Minus className="w-6 h-6 stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-2xl font-extrabold text-white tracking-tight">
                      {sentimentData.sentiment}
                    </h4>
                    <span className="text-xs font-mono text-gray-400">
                      Score: {sentimentData.score > 0 ? `+${sentimentData.score}` : sentimentData.score} / 100
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 font-mono">
                  Sourced from live financial news
                </div>
              </div>

              {/* Bull vs Bear Ratio Bar */}
              <div className="p-4 bg-zinc-900/60 border border-gray-800 rounded-xl flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Market Consensus Split
                  </span>
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="my-2 space-y-2">
                  <div className="flex justify-between text-xs font-bold font-mono">
                    <span className="text-emerald-400">{sentimentData.bullPercentage}% Bulls</span>
                    <span className="text-rose-400">{sentimentData.bearPercentage}% Bears</span>
                  </div>
                  <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-green-600 h-full transition-all duration-500"
                      style={{ width: `${sentimentData.bullPercentage}%` }}
                    />
                    <div
                      className="bg-gradient-to-r from-rose-500 to-red-600 h-full transition-all duration-500"
                      style={{ width: `${sentimentData.bearPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-[11px] text-gray-500">
                  Calculated across recent macro articles
                </div>
              </div>

              {/* Technical / Fundamental Confluence */}
              {confluence && (
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${confluence.badgeClass}`}>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                    <confluence.icon className="w-4 h-4" />
                    <span>{confluence.status}</span>
                  </div>
                  <div className="my-1.5">
                    <p className="text-xs font-semibold text-white mb-1">
                      {confluence.label}
                    </p>
                    <p className="text-[11px] text-gray-300 leading-snug">
                      {confluence.desc}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Technical Signal: {technicalSignal}
                  </span>
                </div>
              )}
            </div>

            {/* Executive Market Summary */}
            <div className="p-4 bg-black/40 border border-gray-900 rounded-xl space-y-1.5">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                Macro Intelligence Summary
              </span>
              <p className="text-sm text-gray-300 leading-relaxed">
                {sentimentData.summary}
              </p>
            </div>

            {/* Key Fundamental Drivers */}
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 block">
                Top Fundamental Drivers
              </span>
              <div className="grid sm:grid-cols-3 gap-2.5">
                {sentimentData.keyDrivers.map((driver, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-zinc-900/40 border border-gray-800/80 rounded-lg text-xs text-gray-300 flex items-start gap-2"
                  >
                    <span className="text-amber-500 font-bold font-mono text-[11px]">
                      0{idx + 1}.
                    </span>
                    <span className="leading-snug">{driver}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Google News Headlines */}
            {sentimentData.headlines && sentimentData.headlines.length > 0 && (
              <div className="pt-2 border-t border-gray-900">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Newspaper className="w-3.5 h-3.5 text-amber-500" />
                  Live Headlines (Google Search)
                </span>
                <div className="space-y-2">
                  {sentimentData.headlines.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg bg-zinc-900/30 hover:bg-zinc-900/70 border border-gray-800/60 hover:border-amber-500/30 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-gray-300 group-hover:text-amber-400 transition-colors line-clamp-1 font-medium">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-gray-400 font-mono">
                            {item.source}
                          </span>
                          <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-amber-400 transition-colors" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};
