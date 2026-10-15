import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Save,
  FileText,
  FileDown,
} from 'lucide-react';
import type { ForexAnalysisRecord } from '../firebase';
import { saveForexAnalysisToFirestore } from '../firebase';
import { exportSignalToPDF } from '../utils/pdfExport';

interface TradingJournalProps {
  analysis: ForexAnalysisRecord | null;
  onUpdateAnalysis?: (updated: ForexAnalysisRecord) => void;
  isCloudSynced?: boolean;
}

export const TradingJournalCard: React.FC<TradingJournalProps> = ({
  analysis,
  onUpdateAnalysis,
  isCloudSynced,
}) => {
  if (!analysis) return null;

  const [notes, setNotes] = useState<string>(analysis.journal_notes || '');
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (analysis) {
      setNotes(analysis.journal_notes || '');
    }
  }, [analysis]);

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysis) return;
    setSaving(true);
    setSavedSuccess(false);

    const updatedRecord: ForexAnalysisRecord = {
      ...analysis,
      journal_notes: notes,
    };

    try {
      if (isCloudSynced && analysis.userId && analysis.userId !== 'guest') {
        await saveForexAnalysisToFirestore(updatedRecord);
      }

      if (onUpdateAnalysis) {
        onUpdateAnalysis(updatedRecord);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving journal notes:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = () => {
    if (!analysis) return;
    exportSignalToPDF({
      analysis: {
        ...analysis,
        journal_notes: notes,
      },
    });
  };

  return (
    <div className="border border-gray-800 bg-zinc-950/80 backdrop-blur shadow-2xl rounded-xl overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-900 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Signal Notes & Trading Reflections
            </h3>
            <p className="text-xs text-gray-400">
              Record trade execution thoughts, execution plan, and notes for <span className="text-amber-400 font-semibold">{analysis.pair}</span>
            </p>
          </div>
        </div>

        {savedSuccess && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Notes Saved!
          </span>
        )}
      </div>

      <form onSubmit={handleSaveJournal} className="p-4 md:p-6 space-y-5">
        {/* Manual Journal Notes */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            Trading Notes & Reflections
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record entry execution details, psychological mindset, management updates (e.g. moved stop loss to breakeven at 40 pips)..."
            className="w-full bg-zinc-900/60 border border-gray-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-amber-500/50 leading-relaxed resize-y"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-gray-200 hover:text-white font-semibold rounded-xl border border-gray-800 transition-all cursor-pointer shadow-md text-xs sm:text-sm"
          >
            <FileDown className="w-4 h-4 text-amber-500" />
            Export PDF Report
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold rounded-xl shadow-lg shadow-amber-500/20 border border-amber-400/20 transition-all cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Signal Notes'}
          </button>
        </div>
      </form>
    </div>
  );
};
