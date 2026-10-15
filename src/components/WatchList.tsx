import React, { useState } from 'react';
import {
  Eye,
  Trash2,
  Plus,
  TrendingUp,
  Globe,
  Calendar,
  Search,
  Check,
  Briefcase,
  Bitcoin,
  Activity,
  Coins,
  Sparkles,
} from 'lucide-react';
import type { WatchlistItem, AssetCategory } from '../firebase';
import { addToWatchlist, removeFromWatchlist, detectAssetCategory } from '../firebase';
import { useAuth } from '../context/AuthContext';

interface WatchListProps {
  watchlist: WatchlistItem[];
  onSelectPair?: (pair: string) => void;
  onNavigatePage?: (page: 'sentiment' | 'calendar' | 'analyzer', pair?: string) => void;
  onLocalAdd?: (pair: string, category?: AssetCategory) => void;
  onLocalRemove?: (id: string) => void;
}

interface CategoryConfig {
  id: AssetCategory | 'all';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeClass: string;
  presets: string[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'all',
    label: 'All Markets',
    icon: Sparkles,
    color: 'text-amber-400',
    badgeClass: 'bg-zinc-800 text-gray-300',
    presets: [],
  },
  {
    id: 'forex',
    label: 'Forex & Metals',
    icon: Coins,
    color: 'text-blue-400',
    badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    presets: [
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
      'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/AUD', 'GBP/AUD', 'AUD/JPY', 'CAD/JPY',
      'CHF/JPY', 'NZD/JPY', 'EUR/CAD', 'GBP/CAD', 'AUD/CAD', 'EUR/CHF', 'GBP/CHF',
      'XAU/USD', 'XAG/USD', 'USD/SGD', 'USD/MXN', 'USD/ZAR'
    ],
  },
  {
    id: 'stock',
    label: 'Stocks',
    icon: Briefcase,
    color: 'text-indigo-400',
    badgeClass: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
    presets: [
      'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AMD', 'NFLX', 'PLTR',
      'AVGO', 'ORCL', 'CRM', 'INTC', 'COIN', 'BABA', 'DIS', 'JPM', 'V', 'MA',
      'BA', 'UBER', 'PYPL', 'NKE', 'XOM', 'CVX'
    ],
  },
  {
    id: 'crypto',
    label: 'Cryptocurrency',
    icon: Bitcoin,
    color: 'text-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    presets: [
      'BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD', 'DOGE/USD', 'ADA/USD',
      'AVAX/USD', 'LINK/USD', 'DOT/USD', 'SHIB/USD', 'SUI/USD', 'NEAR/USD', 'LTC/USD',
      'PEPE/USD', 'UNI/USD', 'APT/USD', 'ICP/USD', 'RENDER/USD', 'FET/USD', 'FIL/USD',
      'AAVE/USD', 'ARB/USD', 'OP/USD', 'TIA/USD', 'MATIC/USD'
    ],
  },
  {
    id: 'indices',
    label: 'Indices',
    icon: Activity,
    color: 'text-purple-400',
    badgeClass: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    presets: [
      'US30', 'NAS100', 'SPX500', 'GER40', 'UK100', 'JP225', 'FRA40', 'EU50',
      'AUS200', 'HK50', 'CHN50', 'ESP35', 'ITA40', 'SUI20', 'CAN60', 'VIX',
      'DXY', 'US2000', 'STOXX600', 'NIFTY50', 'BRA50', 'SOX', 'KOSPI', 'TWSE',
      'WTI', 'BRENT'
    ],
  },
];

export const WatchList: React.FC<WatchListProps> = ({
  watchlist,
  onNavigatePage,
  onLocalAdd,
  onLocalRemove,
}) => {
  const { user } = useAuth();
  const [activeCategoryTab, setActiveCategoryTab] = useState<AssetCategory | 'all'>('all');
  const [newPair, setNewPair] = useState('');
  const [selectedAddCategory, setSelectedAddCategory] = useState<AssetCategory>('forex');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanPairInput = (val: string) => {
    let cleaned = val.toUpperCase().trim();
    if (cleaned.length === 6 && !cleaned.includes('/') && !cleaned.includes('100') && !cleaned.includes('500')) {
      cleaned = `${cleaned.substring(0, 3)}/${cleaned.substring(3)}`;
    }
    return cleaned;
  };

  const handleAdd = async (pairToAdd?: string, categoryOverride?: AssetCategory) => {
    const raw = pairToAdd || newPair;
    if (!raw) return;
    const formatted = cleanPairInput(raw);
    setErrorMsg(null);

    // Check duplicate
    if (watchlist.some((w) => w.pair === formatted)) {
      setErrorMsg(`${formatted} is already in your watchlist.`);
      return;
    }

    const detected = categoryOverride || detectAssetCategory(formatted);

    try {
      if (user) {
        await addToWatchlist(user.uid, formatted, detected);
      } else if (onLocalAdd) {
        onLocalAdd(formatted, detected);
      }
      setNewPair('');
    } catch (err: any) {
      console.error('Error adding to watchlist:', err);
      setErrorMsg('Failed to add pair. Please try again.');
    }
  };

  const handleAddAllPresets = async () => {
    const currentPresets =
      activeCategoryTab === 'all'
        ? [
            ...CATEGORIES[1].presets,
            ...CATEGORIES[2].presets,
            ...CATEGORIES[3].presets,
            ...CATEGORIES[4].presets,
          ]
        : CATEGORIES.find((c) => c.id === activeCategoryTab)?.presets || [];

    for (const pair of currentPresets) {
      if (!watchlist.some((w) => w.pair === pair)) {
        await handleAdd(pair, detectAssetCategory(pair));
      }
    }
  };

  const handleRemove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (user && !id.startsWith('local-')) {
        await removeFromWatchlist(id);
      } else if (onLocalRemove) {
        onLocalRemove(id);
      }
    } catch (err: any) {
      console.error('Error removing from watchlist:', err);
    }
  };

  // Filter watchlist items by category tab
  const filteredWatchlist = watchlist.filter((item) => {
    if (activeCategoryTab === 'all') return true;
    const cat = item.category || detectAssetCategory(item.pair);
    return cat === activeCategoryTab;
  });

  const getCategoryDetails = (item: WatchlistItem) => {
    const cat = item.category || detectAssetCategory(item.pair);
    const found = CATEGORIES.find((c) => c.id === cat);
    return found || CATEGORIES[1];
  };

  return (
    <div className="border border-gray-800 bg-zinc-950/80 backdrop-blur shadow-2xl rounded-2xl p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-900 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Multi-Asset Watchlist
            </h2>
            <p className="text-xs text-gray-400">
              Track Forex, Stocks, Cryptocurrency, and Indices with live sentiment & economic news
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 bg-zinc-900 border border-gray-800 rounded-full text-gray-400">
            {watchlist.length} Total Assets
          </span>
        </div>
      </div>

      {/* Asset Category Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategoryTab === cat.id;
          const count =
            cat.id === 'all'
              ? watchlist.length
              : watchlist.filter((w) => (w.category || detectAssetCategory(w.pair)) === cat.id).length;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryTab(cat.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                isActive
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-zinc-900/80 hover:bg-zinc-900 text-gray-400 hover:text-white border-gray-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-black/20 text-black' : 'bg-zinc-800 text-gray-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Add Custom Asset Form */}
      <div className="space-y-3 p-4 bg-zinc-900/40 border border-gray-900 rounded-xl">
        <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
          Add Ticker / Pair to Watchlist
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={newPair}
              onChange={(e) => setNewPair(e.target.value.toUpperCase())}
              placeholder="e.g. NVDA, BTC/USD, NAS100, or EUR/USD"
              className="w-full bg-zinc-900/80 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedAddCategory}
              onChange={(e) => setSelectedAddCategory(e.target.value as AssetCategory)}
              className="bg-zinc-900 border border-gray-800 text-gray-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="forex">Forex & Metals</option>
              <option value="stock">Stocks</option>
              <option value="crypto">Cryptocurrency</option>
              <option value="indices">Indices</option>
            </select>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold rounded-xl shadow-lg shadow-amber-500/20 border border-amber-400/20 transition-all cursor-pointer text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </form>

        {errorMsg && <p className="text-xs text-rose-400 font-medium pl-1">{errorMsg}</p>}

        {/* Quick Add Preset Chips by Active Category */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <span className="text-[11px] text-gray-400 font-medium">
              Category Asset Catalog (
              {activeCategoryTab === 'all'
                ? 'All Markets • 100+ Total Assets'
                : `${CATEGORIES.find((c) => c.id === activeCategoryTab)?.label} • 26 Assets`}
              ):
            </span>
            <button
              type="button"
              onClick={handleAddAllPresets}
              className="text-[11px] px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Add All 25+ Category Assets
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(activeCategoryTab === 'all'
              ? [
                  ...CATEGORIES[1].presets.slice(0, 3),
                  ...CATEGORIES[2].presets.slice(0, 3),
                  ...CATEGORIES[3].presets.slice(0, 3),
                  ...CATEGORIES[4].presets.slice(0, 3),
                ]
              : CATEGORIES.find((c) => c.id === activeCategoryTab)?.presets || []
            ).map((pair) => {
              const isAdded = watchlist.some((w) => w.pair === pair);
              const catType = detectAssetCategory(pair);
              return (
                <button
                  key={pair}
                  type="button"
                  onClick={() => !isAdded && handleAdd(pair, catType)}
                  disabled={isAdded}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-all cursor-pointer flex items-center gap-1 ${
                    isAdded
                      ? 'bg-zinc-900/40 border-gray-900 text-gray-600 cursor-default'
                      : 'bg-zinc-900 border-gray-800 text-gray-300 hover:text-amber-400 hover:border-amber-500/40'
                  }`}
                >
                  {isAdded ? <Check className="w-3 h-3 text-emerald-500" /> : <Plus className="w-3 h-3" />}
                  {pair}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Watchlist Asset Cards */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {activeCategoryTab === 'all'
              ? 'All Tracked Assets'
              : `${CATEGORIES.find((c) => c.id === activeCategoryTab)?.label} Watchlist`}
          </span>
          <span className="text-xs font-mono text-gray-500">
            {filteredWatchlist.length} {filteredWatchlist.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {filteredWatchlist.length === 0 ? (
          <div className="text-center py-12 border border-gray-900 bg-zinc-950/40 rounded-xl p-6">
            <Eye className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-semibold mb-1">
              No {activeCategoryTab === 'all' ? 'Assets' : CATEGORIES.find((c) => c.id === activeCategoryTab)?.label} in Watchlist
            </p>
            <p className="text-xs text-gray-600 max-w-sm mx-auto">
              Use the input or quick preset chips above to add stocks, cryptocurrency pairs, or indices to your live monitor.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {filteredWatchlist.map((item) => {
              const catDetails = getCategoryDetails(item);
              const CatIcon = catDetails.icon;

              return (
                <div
                  key={item.id}
                  className="p-4 bg-zinc-900/50 hover:bg-zinc-900/80 border border-gray-800/80 hover:border-amber-500/30 rounded-xl transition-all flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${catDetails.badgeClass}`}
                    >
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-extrabold text-white tracking-tight font-mono">
                          {item.pair}
                        </h4>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${catDetails.badgeClass}`}
                        >
                          {catDetails.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500">
                        Added {new Date(item.addedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onNavigatePage && (
                      <>
                        <button
                          type="button"
                          onClick={() => onNavigatePage('sentiment', item.pair)}
                          className="p-2 text-gray-400 hover:text-amber-400 bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                          title={`View News Sentiment for ${item.pair}`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigatePage('calendar', item.pair)}
                          className="p-2 text-gray-400 hover:text-amber-400 bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                          title={`View Economic Calendar for ${item.pair}`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleRemove(item.id, e)}
                      className="p-2 text-gray-500 hover:text-rose-400 bg-zinc-800/40 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
