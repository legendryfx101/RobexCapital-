import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validation connection test on startup as mandated by skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export interface ForexAnalysisRecord {
  id: string;
  userId: string;
  pair: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  order_type?: string;
  explanation: string;
  entry_price?: string;
  take_profit_1?: string;
  take_profit_2?: string;
  take_profit_3?: string;
  stop_loss?: string;
  confidence: 'High' | 'Medium' | 'Low';
  analysis_type?: string;
  timeframe?: string;
  image_url?: string;
  journal_notes?: string;
  trade_outcome?: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'PENDING';
  pnl_amount?: string;
  createdAt: string;

  // Comprehensive Trade Execution & Management Details
  risk_reward_ratio?: string;
  risk_pips?: string | number;
  reward_pips_tp1?: string | number;
  reward_pips_tp2?: string | number;
  reward_pips_tp3?: string | number;
  breakeven_trigger?: string;
  trailing_stop_rule?: string;
  invalidation_level?: string;
  lot_size_recommendation?: string;
  support_level?: string;
  resistance_level?: string;

  // George Milton Volume Price Analysis (VPA) fields
  vpa_tape_reading_situation?: string;
  vpa_volume_wave_detected?: string;
  vpa_pullback_volume_reduction?: string;
  vpa_fair_price_zone?: string;
  crv_ratio?: string;
}

export type AssetCategory = 'forex' | 'stock' | 'crypto' | 'indices';

export function detectAssetCategory(ticker: string): AssetCategory {
  const t = ticker.toUpperCase().trim();
  // Crypto
  if (
    t.includes('BTC') ||
    t.includes('ETH') ||
    t.includes('SOL') ||
    t.includes('XRP') ||
    t.includes('DOGE') ||
    t.includes('BNB') ||
    t.includes('ADA') ||
    t.includes('AVAX') ||
    t.includes('DOT') ||
    t.includes('LINK') ||
    t.includes('SHIB') ||
    t.includes('SUI') ||
    t.includes('NEAR') ||
    t.includes('LTC') ||
    t.includes('PEPE') ||
    t.includes('UNI') ||
    t.includes('APT') ||
    t.includes('ICP') ||
    t.includes('RENDER') ||
    t.includes('FET') ||
    t.includes('FIL') ||
    t.includes('AAVE') ||
    t.includes('ARB') ||
    t.includes('OP') ||
    t.includes('TIA') ||
    t.includes('MATIC') ||
    t.includes('ATOM') ||
    t.includes('XLM')
  ) {
    return 'crypto';
  }
  // Indices
  if (
    t.includes('US30') ||
    t.includes('NAS100') ||
    t.includes('SPX500') ||
    t.includes('GER40') ||
    t.includes('UK100') ||
    t.includes('JP225') ||
    t.includes('FRA40') ||
    t.includes('EU50') ||
    t.includes('AUS200') ||
    t.includes('HK50') ||
    t.includes('CHN50') ||
    t.includes('ESP35') ||
    t.includes('ITA40') ||
    t.includes('SUI20') ||
    t.includes('CAN60') ||
    t.includes('US2000') ||
    t.includes('STOXX600') ||
    t.includes('NIFTY50') ||
    t.includes('BRA50') ||
    t.includes('SOX') ||
    t.includes('KOSPI') ||
    t.includes('TWSE') ||
    t.includes('WTI') ||
    t.includes('BRENT') ||
    t.includes('DXY') ||
    t.includes('DOW') ||
    t.includes('NASDAQ') ||
    t.includes('S&P') ||
    t.includes('DAX') ||
    t.includes('NIKKEI') ||
    t.includes('FTSE') ||
    t.includes('VIX')
  ) {
    return 'indices';
  }
  // Stocks (US & Global equities)
  if (
    t === 'AAPL' ||
    t === 'NVDA' ||
    t === 'TSLA' ||
    t === 'MSFT' ||
    t === 'AMZN' ||
    t === 'GOOGL' ||
    t === 'META' ||
    t === 'AMD' ||
    t === 'NFLX' ||
    t === 'PLTR' ||
    t === 'AVGO' ||
    t === 'ORCL' ||
    t === 'CRM' ||
    t === 'INTC' ||
    t === 'COIN' ||
    t === 'BABA' ||
    t === 'DIS' ||
    t === 'JPM' ||
    t === 'V' ||
    t === 'MA' ||
    t === 'BA' ||
    t === 'UBER' ||
    t === 'PYPL' ||
    t === 'NKE' ||
    t === 'XOM' ||
    t === 'CVX' ||
    (!t.includes('/') && t.length <= 5 && !t.includes('USD'))
  ) {
    return 'stock';
  }
  // Default Forex & Commodities
  return 'forex';
}

export interface WatchlistItem {
  id: string;
  userId: string;
  pair: string;
  category?: AssetCategory;
  addedAt: string;
}

export async function addToWatchlist(
  userId: string,
  pair: string,
  category?: AssetCategory
): Promise<void> {
  try {
    const docRef = doc(collection(db, 'watchlist'));
    await setDoc(docRef, {
      userId,
      pair,
      category: category || detectAssetCategory(pair),
      addedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'watchlist');
  }
}

export async function removeFromWatchlist(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'watchlist', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'watchlist');
  }
}

export function subscribeToWatchlist(
  userId: string,
  onData: (items: WatchlistItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'watchlist';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const results: WatchlistItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as WatchlistItem[];
      onData(results);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveForexAnalysisToFirestore(analysis: ForexAnalysisRecord): Promise<void> {
  const path = `forex_analyses/${analysis.id}`;
  try {
    const docRef = doc(db, 'forex_analyses', analysis.id);
    await setDoc(docRef, {
      userId: analysis.userId,
      pair: analysis.pair,
      signal: analysis.signal,
      explanation: analysis.explanation,
      entry_price: analysis.entry_price || '',
      take_profit_1: analysis.take_profit_1 || '',
      take_profit_2: analysis.take_profit_2 || '',
      take_profit_3: analysis.take_profit_3 || '',
      stop_loss: analysis.stop_loss || '',
      confidence: analysis.confidence,
      analysis_type: analysis.analysis_type || 'Technical',
      timeframe: analysis.timeframe || 'H1',
      image_url: analysis.image_url || '',
      journal_notes: analysis.journal_notes || '',
      trade_outcome: analysis.trade_outcome || 'PENDING',
      pnl_amount: analysis.pnl_amount || '',
      createdAt: analysis.createdAt,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteForexAnalysisFromFirestore(id: string): Promise<void> {
  const path = `forex_analyses/${id}`;
  try {
    const docRef = doc(db, 'forex_analyses', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToUserAnalyses(
  userId: string,
  onData: (items: ForexAnalysisRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'forex_analyses';
  const q = query(
    collection(db, path),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const results: ForexAnalysisRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        results.push({
          id: docSnap.id,
          userId: d.userId,
          pair: d.pair,
          signal: d.signal,
          explanation: d.explanation,
          entry_price: d.entry_price,
          take_profit_1: d.take_profit_1,
          take_profit_2: d.take_profit_2,
          take_profit_3: d.take_profit_3,
          stop_loss: d.stop_loss,
          confidence: d.confidence,
          analysis_type: d.analysis_type,
          timeframe: d.timeframe,
          image_url: d.image_url,
          journal_notes: d.journal_notes || '',
          trade_outcome: d.trade_outcome || 'PENDING',
          pnl_amount: d.pnl_amount || '',
          createdAt: d.createdAt,
        });
      });
      onData(results);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToAllAnalyses(
  onData: (items: ForexAnalysisRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'forex_analyses';
  const q = query(
    collection(db, path),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const results: ForexAnalysisRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        results.push({
          id: docSnap.id,
          userId: d.userId,
          pair: d.pair,
          signal: d.signal,
          explanation: d.explanation,
          entry_price: d.entry_price,
          take_profit_1: d.take_profit_1,
          take_profit_2: d.take_profit_2,
          take_profit_3: d.take_profit_3,
          stop_loss: d.stop_loss,
          confidence: d.confidence,
          analysis_type: d.analysis_type,
          timeframe: d.timeframe,
          image_url: d.image_url,
          journal_notes: d.journal_notes || '',
          trade_outcome: d.trade_outcome || 'PENDING',
          pnl_amount: d.pnl_amount || '',
          createdAt: d.createdAt,
        });
      });
      onData(results);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export interface PersonalTradeRecord {
  id: string;
  userId: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  category?: AssetCategory;
  lotSize?: string;
  entryPrice?: string;
  exitPrice?: string;
  stopLoss?: string;
  takeProfit?: string;
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'OPEN';
  pnlAmount?: string;
  broker?: string;
  strategy?: string;
  notes?: string;
  executionDate?: string;
  createdAt: string;
}

export async function savePersonalTradeToFirestore(trade: PersonalTradeRecord): Promise<void> {
  const path = `personal_trades/${trade.id}`;
  try {
    const docRef = doc(db, 'personal_trades', trade.id);
    await setDoc(docRef, {
      userId: trade.userId,
      pair: trade.pair,
      direction: trade.direction,
      category: trade.category || detectAssetCategory(trade.pair),
      lotSize: trade.lotSize || '',
      entryPrice: trade.entryPrice || '',
      exitPrice: trade.exitPrice || '',
      stopLoss: trade.stopLoss || '',
      takeProfit: trade.takeProfit || '',
      outcome: trade.outcome || 'OPEN',
      pnlAmount: trade.pnlAmount || '',
      broker: trade.broker || '',
      strategy: trade.strategy || '',
      notes: trade.notes || '',
      executionDate: trade.executionDate || new Date().toISOString(),
      createdAt: trade.createdAt || new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePersonalTradeFromFirestore(id: string): Promise<void> {
  const path = `personal_trades/${id}`;
  try {
    const docRef = doc(db, 'personal_trades', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToPersonalTrades(
  userId: string,
  onData: (items: PersonalTradeRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'personal_trades';
  const q = query(
    collection(db, path),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const results: PersonalTradeRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        results.push({
          id: docSnap.id,
          userId: d.userId,
          pair: d.pair,
          direction: d.direction || 'BUY',
          category: d.category || 'forex',
          lotSize: d.lotSize || '',
          entryPrice: d.entryPrice || '',
          exitPrice: d.exitPrice || '',
          stopLoss: d.stopLoss || '',
          takeProfit: d.takeProfit || '',
          outcome: d.outcome || 'OPEN',
          pnlAmount: d.pnlAmount || '',
          broker: d.broker || '',
          strategy: d.strategy || '',
          notes: d.notes || '',
          executionDate: d.executionDate || d.createdAt,
          createdAt: d.createdAt,
        });
      });
      onData(results);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function deleteAllUserPersonalTradesFromFirestore(userId: string): Promise<void> {
  try {
    const q = query(collection(db, 'personal_trades'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(doc(db, 'personal_trades', docSnap.id)));
    await Promise.all(deletePromises);
  } catch (error) {
    console.warn('Error clearing user personal trades:', error);
  }
}

export async function deleteAllUserAnalysesFromFirestore(userId: string): Promise<void> {
  try {
    const q = query(collection(db, 'forex_analyses'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(doc(db, 'forex_analyses', docSnap.id)));
    await Promise.all(deletePromises);
  } catch (error) {
    console.warn('Error clearing user analyses:', error);
  }
}

export const DEFAULT_WATCHLIST_ITEMS: WatchlistItem[] = [
  // Forex & Metals (26 assets)
  { id: 'def-fx-1', userId: 'default', pair: 'EUR/USD', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-2', userId: 'default', pair: 'GBP/USD', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-3', userId: 'default', pair: 'USD/JPY', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-4', userId: 'default', pair: 'USD/CHF', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-5', userId: 'default', pair: 'AUD/USD', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-6', userId: 'default', pair: 'USD/CAD', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-7', userId: 'default', pair: 'NZD/USD', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-8', userId: 'default', pair: 'EUR/GBP', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-9', userId: 'default', pair: 'EUR/JPY', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-10', userId: 'default', pair: 'GBP/JPY', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-11', userId: 'default', pair: 'EUR/AUD', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-12', userId: 'default', pair: 'GBP/AUD', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-13', userId: 'default', pair: 'AUD/JPY', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-14', userId: 'default', pair: 'CAD/JPY', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-15', userId: 'default', pair: 'CHF/JPY', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-16', userId: 'default', pair: 'NZD/JPY', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-17', userId: 'default', pair: 'EUR/CAD', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-18', userId: 'default', pair: 'GBP/CAD', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-19', userId: 'default', pair: 'AUD/CAD', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-20', userId: 'default', pair: 'EUR/CHF', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-21', userId: 'default', pair: 'GBP/CHF', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-22', userId: 'default', pair: 'XAU/USD', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-23', userId: 'default', pair: 'XAG/USD', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-24', userId: 'default', pair: 'USD/SGD', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-25', userId: 'default', pair: 'USD/MXN', category: 'forex', addedAt: new Date().toISOString() },
  { id: 'def-fx-26', userId: 'default', pair: 'USD/ZAR', category: 'forex', addedAt: new Date().toISOString() },

  // Stocks (26 assets)
  { id: 'def-st-1', userId: 'default', pair: 'NVDA', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-2', userId: 'default', pair: 'AAPL', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-3', userId: 'default', pair: 'MSFT', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-4', userId: 'default', pair: 'AMZN', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-5', userId: 'default', pair: 'GOOGL', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-6', userId: 'default', pair: 'META', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-7', userId: 'default', pair: 'TSLA', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-8', userId: 'default', pair: 'AMD', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-9', userId: 'default', pair: 'NFLX', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-10', userId: 'default', pair: 'PLTR', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-11', userId: 'default', pair: 'AVGO', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-12', userId: 'default', pair: 'ORCL', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-13', userId: 'default', pair: 'CRM', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-14', userId: 'default', pair: 'INTC', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-15', userId: 'default', pair: 'COIN', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-16', userId: 'default', pair: 'BABA', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-17', userId: 'default', pair: 'DIS', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-18', userId: 'default', pair: 'JPM', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-19', userId: 'default', pair: 'V', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-20', userId: 'default', pair: 'MA', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-21', userId: 'default', pair: 'BA', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-22', userId: 'default', pair: 'UBER', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-23', userId: 'default', pair: 'PYPL', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-24', userId: 'default', pair: 'NKE', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-25', userId: 'default', pair: 'XOM', category: 'stock', addedAt: new Date().toISOString() },
  { id: 'def-st-26', userId: 'default', pair: 'CVX', category: 'stock', addedAt: new Date().toISOString() },

  // Cryptocurrency (26 assets)
  { id: 'def-cr-1', userId: 'default', pair: 'BTC/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-2', userId: 'default', pair: 'ETH/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-3', userId: 'default', pair: 'SOL/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-4', userId: 'default', pair: 'BNB/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-5', userId: 'default', pair: 'XRP/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-6', userId: 'default', pair: 'DOGE/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-7', userId: 'default', pair: 'ADA/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-8', userId: 'default', pair: 'AVAX/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-9', userId: 'default', pair: 'LINK/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-10', userId: 'default', pair: 'DOT/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-11', userId: 'default', pair: 'SHIB/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-12', userId: 'default', pair: 'SUI/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-13', userId: 'default', pair: 'NEAR/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-14', userId: 'default', pair: 'LTC/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-15', userId: 'default', pair: 'PEPE/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-16', userId: 'default', pair: 'UNI/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-17', userId: 'default', pair: 'APT/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-18', userId: 'default', pair: 'ICP/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-19', userId: 'default', pair: 'RENDER/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-20', userId: 'default', pair: 'FET/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-21', userId: 'default', pair: 'FIL/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-22', userId: 'default', pair: 'AAVE/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-23', userId: 'default', pair: 'ARB/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-24', userId: 'default', pair: 'OP/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-25', userId: 'default', pair: 'TIA/USD', category: 'crypto', addedAt: new Date().toISOString() },
  { id: 'def-cr-26', userId: 'default', pair: 'MATIC/USD', category: 'crypto', addedAt: new Date().toISOString() },

  // Indices (26 assets)
  { id: 'def-idx-1', userId: 'default', pair: 'US30', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-2', userId: 'default', pair: 'NAS100', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-3', userId: 'default', pair: 'SPX500', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-4', userId: 'default', pair: 'GER40', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-5', userId: 'default', pair: 'UK100', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-6', userId: 'default', pair: 'JP225', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-7', userId: 'default', pair: 'FRA40', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-8', userId: 'default', pair: 'EU50', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-9', userId: 'default', pair: 'AUS200', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-10', userId: 'default', pair: 'HK50', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-11', userId: 'default', pair: 'CHN50', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-12', userId: 'default', pair: 'ESP35', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-13', userId: 'default', pair: 'ITA40', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-14', userId: 'default', pair: 'SUI20', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-15', userId: 'default', pair: 'CAN60', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-16', userId: 'default', pair: 'VIX', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-17', userId: 'default', pair: 'DXY', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-18', userId: 'default', pair: 'US2000', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-19', userId: 'default', pair: 'STOXX600', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-20', userId: 'default', pair: 'NIFTY50', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-21', userId: 'default', pair: 'BRA50', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-22', userId: 'default', pair: 'SOX', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-23', userId: 'default', pair: 'KOSPI', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-24', userId: 'default', pair: 'TWSE', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-25', userId: 'default', pair: 'WTI', category: 'indices', addedAt: new Date().toISOString() },
  { id: 'def-idx-26', userId: 'default', pair: 'BRENT', category: 'indices', addedAt: new Date().toISOString() },
];
