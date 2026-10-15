import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { BackgroundDecorations } from './components/BackgroundDecorations';
import { ChartUploader } from './components/ChartUploader';
import { AnalysisCard } from './components/AnalysisCard';
import { RiskCalculator } from './components/RiskCalculator';
import { TradingJournalCard } from './components/TradingJournalCard';
import { TradeJournalPageView } from './components/TradeJournalPageView';
import { AdvisorChat } from './components/AdvisorChat';
import { AnalysisHistory } from './components/AnalysisHistory';
import { AdminDashboard } from './components/AdminDashboard';
import { DailyChecklist } from './components/DailyChecklist';
import { FixedBottomActionBar, type ActivePage } from './components/FixedBottomActionBar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { exportSignalToPDF } from './utils/pdfExport';
import {
  saveForexAnalysisToFirestore,
  deleteForexAnalysisFromFirestore,
  deleteAllUserAnalysesFromFirestore,
  subscribeToUserAnalyses,
  subscribeToAllAnalyses,
  savePersonalTradeToFirestore,
  deletePersonalTradeFromFirestore,
  deleteAllUserPersonalTradesFromFirestore,
  subscribeToPersonalTrades,
  type ForexAnalysisRecord,
  type AssetCategory,
  type PersonalTradeRecord,
} from './firebase';

const LOCAL_STORAGE_KEY_ANALYSES = 'forexpulse_analyses_v2';
const LOCAL_STORAGE_KEY_PERSONAL_TRADES = 'forexpulse_personal_trades_v2';

function MainApp() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState<ActivePage>('analyzer');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<ForexAnalysisRecord | null>(null);
  const [selectedPairForView, setSelectedPairForView] = useState<string>('EUR/USD');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = user?.email === 'legendryfx101@gmail.com';

  // Initialize historyList from local storage
  const [historyList, setHistoryList] = useState<ForexAnalysisRecord[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_ANALYSES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => item && !item.id?.startsWith('demo-'));
        }
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }
    return [];
  });

  // Initialize personal live trade execution journal (reset to zero default)
  const [personalTrades, setPersonalTrades] = useState<PersonalTradeRecord[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_PERSONAL_TRADES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out legacy dummy trades
          return parsed.filter((item) => item && !item.id?.startsWith('pt-'));
        }
      }
    } catch (e) {
      console.warn('Personal trades load error:', e);
    }
    return [];
  });

  // Global community analyses from all users
  const [globalAnalyses, setGlobalAnalyses] = useState<ForexAnalysisRecord[]>([]);

  // Listen to Firestore for analyses and personal trades when signed in
  useEffect(() => {
    if (!user) return;

    const unsubscribeAnalyses = subscribeToUserAnalyses(
      user.uid,
      (firestoreAnalyses) => setHistoryList(firestoreAnalyses),
      (err) => console.error('Firestore analyses subscription error:', err)
    );

    const unsubscribeGlobal = subscribeToAllAnalyses(
      (all) => setGlobalAnalyses(all),
      (err) => console.warn('Global analyses subscription error:', err)
    );

    const unsubscribePersonalTrades = subscribeToPersonalTrades(
      user.uid,
      (trades) => setPersonalTrades(trades),
      (err) => console.error('Firestore personal trades subscription error:', err)
    );

    return () => {
      unsubscribeAnalyses();
      unsubscribeGlobal();
      unsubscribePersonalTrades();
    };
  }, [user]);

  const handleUpdateOutcome = async (id: string, outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'PENDING', e: React.MouseEvent) => {
    e.stopPropagation();
    const target = historyList.find(item => item.id === id) || globalAnalyses.find(item => item.id === id);
    if (!target) return;

    const updated: ForexAnalysisRecord = {
      ...target,
      trade_outcome: outcome,
    };

    setHistoryList(prev => prev.map(item => item.id === id ? updated : item));
    setGlobalAnalyses(prev => prev.map(item => item.id === id ? updated : item));
    if (currentAnalysis?.id === id) {
      setCurrentAnalysis(updated);
    }

    try {
      if (user && target.userId === user.uid) {
        await saveForexAnalysisToFirestore(updated);
      }
    } catch (err) {
      console.error('Failed to update outcome in Firestore:', err);
    }
  };

  // Persist locally when user is not authenticated
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_ANALYSES, JSON.stringify(historyList));
      } catch (e) {
        console.warn('LocalStorage analyses save error:', e);
      }
    }
  }, [historyList, user]);

  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_PERSONAL_TRADES, JSON.stringify(personalTrades));
      } catch (e) {
        console.warn('LocalStorage personal trades save error:', e);
      }
    }
  }, [personalTrades, user]);

  const handleImageSelect = (dataUrl: string) => {
    setSelectedImage(dataUrl);
    setCurrentAnalysis(null);
    setErrorMessage(null);
  };

  const handleAnalyzeChart = async () => {
    if (!selectedImage || isAnalyzing) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedImage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze chart');
      }

      const result = await response.json();

      const newRecord: ForexAnalysisRecord = {
        id: `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: user ? user.uid : 'guest',
        pair: result.pair || 'EUR/USD',
        signal: result.signal || 'BUY',
        order_type: result.order_type || 'Market Execution',
        explanation: result.explanation || 'Technical analysis completed.',
        entry_price: result.entry_price || '',
        take_profit_1: result.take_profit_1 || '',
        take_profit_2: result.take_profit_2 || '',
        take_profit_3: result.take_profit_3 || '',
        stop_loss: result.stop_loss || '',
        risk_reward_ratio: result.risk_reward_ratio || '',
        risk_pips: result.risk_pips || '',
        reward_pips_tp1: result.reward_pips_tp1 || '',
        reward_pips_tp2: result.reward_pips_tp2 || '',
        reward_pips_tp3: result.reward_pips_tp3 || '',
        breakeven_trigger: result.breakeven_trigger || '',
        trailing_stop_rule: result.trailing_stop_rule || '',
        invalidation_level: result.invalidation_level || '',
        lot_size_recommendation: result.lot_size_recommendation || '',
        support_level: result.support_level || '',
        resistance_level: result.resistance_level || '',
        vpa_tape_reading_situation: result.vpa_tape_reading_situation,
        vpa_volume_wave_detected: result.vpa_volume_wave_detected,
        vpa_pullback_volume_reduction: result.vpa_pullback_volume_reduction,
        vpa_fair_price_zone: result.vpa_fair_price_zone,
        crv_ratio: result.crv_ratio,
        confidence: result.confidence || 'Medium',
        analysis_type: result.analysis_type || 'George Milton Volume Price Analysis',
        timeframe: result.timeframe || 'H1',
        // Whenever signal is generated in the history, maintain signal data and discard the screenshot
        image_url: undefined,
        trade_outcome: 'PENDING',
        pnl_amount: '',
        journal_notes: '',
        createdAt: new Date().toISOString(),
      };

      // Discard uploaded screenshot from state once signal data is captured
      setSelectedImage(null);

      setCurrentAnalysis(newRecord);
      setSelectedPairForView(newRecord.pair);
      setHistoryList((prev) => [newRecord, ...prev]);

      // Trigger browser notification if permitted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`New Forex Signal: ${newRecord.signal} ${newRecord.pair}`, {
          body: `Entry: ${newRecord.entry_price || 'N/A'} | SL: ${newRecord.stop_loss || 'N/A'} | TP: ${newRecord.take_profit_1 || 'N/A'}`,
        });
      }

      // If user is authenticated with Firebase, save to Firestore
      if (user) {
        await saveForexAnalysisToFirestore(newRecord).catch((err) => {
          console.error('Error saving to Firestore:', err);
        });
      }
    } catch (err: any) {
      console.error('Error analyzing chart:', err);
      setErrorMessage(err?.message || 'Failed to analyze chart. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectHistory = (item: ForexAnalysisRecord) => {
    setCurrentAnalysis(item);
    if (item.pair) setSelectedPairForView(item.pair);
    if (item.image_url) {
      setSelectedImage(item.image_url);
    }
    setActivePage('analyzer');
  };

  const handleUpdateAnalysis = (updated: ForexAnalysisRecord) => {
    setCurrentAnalysis(updated);
    setHistoryList((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleDeleteHistory = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setHistoryList((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_ANALYSES, JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });

    setGlobalAnalyses((prev) => prev.filter((a) => a.id !== id));

    if (currentAnalysis?.id === id) {
      setCurrentAnalysis(null);
      setSelectedImage(null);
    }

    if (user) {
      await deleteForexAnalysisFromFirestore(id).catch((err) => {
        console.error('Failed to delete analysis from Firestore:', err);
      });
    }
  };

  const handleExportPDFAction = () => {
    if (currentAnalysis) {
      exportSignalToPDF({ analysis: currentAnalysis });
    } else if (historyList.length > 0) {
      exportSignalToPDF({ analysis: historyList[0] });
    } else {
      alert('Please analyze a chart or have at least one analysis record in history before exporting PDF.');
    }
  };

  const handleAddPersonalTrade = async (trade: PersonalTradeRecord) => {
    setPersonalTrades((prev) => {
      const updated = [trade, ...prev];
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_PERSONAL_TRADES, JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });

    if (user) {
      await savePersonalTradeToFirestore({ ...trade, userId: user.uid }).catch((err) => {
        console.error('Failed to save personal trade to Firestore:', err);
      });
    }
  };

  const handleUpdatePersonalTrade = async (trade: PersonalTradeRecord) => {
    setPersonalTrades((prev) => {
      const updated = prev.map((t) => (t.id === trade.id ? trade : t));
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_PERSONAL_TRADES, JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });

    if (user) {
      await savePersonalTradeToFirestore({ ...trade, userId: user.uid }).catch((err) => {
        console.error('Failed to update personal trade in Firestore:', err);
      });
    }
  };

  const handleDeletePersonalTrade = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setPersonalTrades((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_PERSONAL_TRADES, JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });

    if (user) {
      await deletePersonalTradeFromFirestore(id).catch((err) => {
        console.error('Failed to delete personal trade from Firestore:', err);
      });
    }
  };

  const handleResetAllData = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset all data within the site to zero? This will permanently delete all trade logs, journal entries, and analyses from your device and Firebase.'
    );
    if (!confirmed) return;

    setHistoryList([]);
    setGlobalAnalyses([]);
    setPersonalTrades([]);
    setCurrentAnalysis(null);
    setSelectedImage(null);

    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY_ANALYSES);
      localStorage.removeItem(LOCAL_STORAGE_KEY_PERSONAL_TRADES);
    } catch (err) {
      console.warn('LocalStorage clear error:', err);
    }

    if (user) {
      await Promise.all([
        deleteAllUserPersonalTradesFromFirestore(user.uid).catch(console.warn),
        deleteAllUserAnalysesFromFirestore(user.uid).catch(console.warn),
      ]);
    }
  };

  const displayPair = selectedPairForView || currentAnalysis?.pair || 'EUR/USD';

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans selection:bg-amber-500 selection:text-black pb-24">
      {/* Background decorations */}
      <BackgroundDecorations />

      {/* Main Navbar with Firebase Auth */}
      <Navbar />

      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-4"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-2xl shadow-amber-500/30 border border-amber-400/20">
                <TrendingUp className="w-8 h-8 text-black" strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-3 tracking-tight">
              Forex Signal Analyzer
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mb-4" />
            <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Upload your chart screenshot and get instant AI-powered trading signals with precise
              entry, take profit, and stop loss levels
            </p>
          </motion.div>

          {/* Error notice if analysis fails */}
          {errorMessage && (
            <div className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/60 flex items-center gap-3 text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}

          {/* PAGE ROUTING BASED ON activePage */}
          {activePage === 'journal' ? (
            <TradeJournalPageView
              personalTrades={personalTrades}
              onAddTrade={handleAddPersonalTrade}
              onUpdateTrade={handleUpdatePersonalTrade}
              onDeleteTrade={handleDeletePersonalTrade}
              onResetAllData={handleResetAllData}
            />
          ) : activePage === 'admin' && isAdmin ? (
            <AdminDashboard />
          ) : (
            /* ANALYZER PAGE VIEW */
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Area (Upload + Analysis + Risk Calculator + Journal + Chat) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Chart Uploader Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="border border-gray-800 bg-zinc-950/80 backdrop-blur p-6 shadow-2xl rounded-xl">
                    <ChartUploader
                      currentImage={selectedImage}
                      onImageSelect={handleImageSelect}
                      isAnalyzing={isAnalyzing}
                    />

                    {selectedImage && !currentAnalysis && (
                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={handleAnalyzeChart}
                          disabled={isAnalyzing}
                          className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:opacity-50 text-black font-semibold h-14 text-lg shadow-xl shadow-amber-500/25 border border-amber-400/20 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Analyzing Chart...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 mr-2" />
                              Analyze & Generate Signal
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Analysis Result Display */}
                {currentAnalysis && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <AnalysisCard analysis={currentAnalysis} />
                    </motion.div>

                    {/* Risk Management Calculator linked directly to the analysis */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <RiskCalculator currentAnalysis={currentAnalysis} />
                    </motion.div>

                    {/* Trade Journal & Outcome Tracker */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18 }}
                    >
                      <TradingJournalCard
                        analysis={currentAnalysis}
                        onUpdateAnalysis={handleUpdateAnalysis}
                        isCloudSynced={Boolean(user)}
                      />
                    </motion.div>

                    {/* Advisor Chat Panel */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <AdvisorChat analysis={currentAnalysis} />
                    </motion.div>
                  </>
                )}
              </div>

              {/* Right Area (Analysis History) */}
              {/* Right Area (Analysis History) */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <AnalysisHistory
                  analyses={historyList}
                  onSelectAnalysis={handleSelectHistory}
                  onDeleteAnalysis={handleDeleteHistory}
                  onUpdateOutcome={handleUpdateOutcome}
                  selectedId={currentAnalysis?.id}
                  isCloudSynced={Boolean(user)}
                />
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Action Bar (Page Tabs with Highlighting) */}
      <FixedBottomActionBar
        activePage={activePage}
        onPageChange={setActivePage}
        onExportPDFClick={handleExportPDFAction}
        isAdmin={isAdmin}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
