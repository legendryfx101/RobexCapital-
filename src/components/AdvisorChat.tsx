import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Sparkles, Send, Loader2 } from 'lucide-react';
import type { ForexAnalysisRecord } from '../firebase';

interface AdvisorChatProps {
  analysis: ForexAnalysisRecord | null;
}

interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
}

export const AdvisorChat: React.FC<AdvisorChatProps> = ({ analysis }) => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  if (!analysis) return null;

  const handleSubmit = async (e?: React.FormEvent, directQuestion?: string) => {
    if (e) e.preventDefault();
    const query = directQuestion || question;
    if (!query.trim() || loading) return;

    const trimmed = query.trim();
    setQuestion('');
    setMessages((prev) => [...prev, { type: 'user', content: trimmed }]);
    setLoading(true);

    try {
      const sanitizedAnalysis = {
        pair: analysis.pair,
        signal: analysis.signal,
        order_type: analysis.order_type,
        entry_price: analysis.entry_price,
        stop_loss: analysis.stop_loss,
        take_profit_1: analysis.take_profit_1,
        take_profit_2: analysis.take_profit_2,
        take_profit_3: analysis.take_profit_3,
        confidence: analysis.confidence,
        analysis_type: analysis.analysis_type,
        timeframe: analysis.timeframe,
        explanation: analysis.explanation,
        vpa_tape_reading_situation: analysis.vpa_tape_reading_situation,
        vpa_volume_wave_detected: analysis.vpa_volume_wave_detected,
        vpa_pullback_volume_reduction: analysis.vpa_pullback_volume_reduction,
        vpa_fair_price_zone: analysis.vpa_fair_price_zone,
        crv_ratio: analysis.crv_ratio,
        breakeven_trigger: analysis.breakeven_trigger,
        invalidation_level: analysis.invalidation_level,
      };

      const response = await fetch('/api/ask-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: sanitizedAnalysis,
          question: trimmed,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Advisor request failed (${response.status})`);
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { type: 'ai', content: data.answer || "I couldn't process that query." },
      ]);
    } catch (err: any) {
      console.error('Error asking advisor:', err);
      setMessages((prev) => [
        ...prev,
        {
          type: 'ai',
          content: err?.message || "Sorry, I couldn't process your question right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Analyze this trade using the book's 50% volume pullback rule",
    "Explain the Tape Reading Situation (1-4) on this chart",
    "What does Effort vs. Result reveal about smart money volume?",
    "How should I manage my 1% risk & Chance-to-Risk ratio?",
  ];

  return (
    <div className="border border-gray-800 bg-zinc-950/80 backdrop-blur shadow-2xl rounded-xl">
      <div className="p-4 border-b border-gray-900">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-amber-500" />
          Ask About This Analysis
        </h3>
      </div>

      <div className="p-4">
        {/* Message history */}
        <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto pr-1">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-4">
                  Ask me anything about this signal
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQuestion(item);
                        handleSubmit(undefined, item);
                      }}
                      className="text-xs px-3 py-2 bg-zinc-900/50 border border-gray-800 rounded-lg text-gray-400 hover:text-amber-500 hover:border-amber-500/30 transition-all cursor-pointer"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    msg.type === 'user'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-medium'
                      : 'bg-zinc-900/50 border border-gray-800 text-gray-300'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-zinc-900/50 border border-gray-800 rounded-lg p-3">
                <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Input form */}
        <form onSubmit={(e) => handleSubmit(e)} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about risk, strategy, indicators..."
            disabled={loading}
            className="flex-1 bg-zinc-900/50 border border-gray-800 rounded-md px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-md shadow-lg shadow-amber-500/25 border border-amber-400/20 transition-all flex items-center justify-center cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
