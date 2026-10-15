import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import type { EconomicEvent } from '../../server/geminiService';

interface EconomicCalendarCardProps {
  pair: string;
}

export const EconomicCalendarCard: React.FC<EconomicCalendarCardProps> = ({ pair }) => {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = async (targetPair: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/economic-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair: targetPair }),
      });
      if (!response.ok) throw new Error('Failed to fetch economic calendar');
      const data: EconomicEvent[] = await response.json();
      setEvents(data);
    } catch (err) {
      console.error('Calendar fetch error:', err);
      setError('Unable to load economic calendar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar(pair);
  }, [pair]);

  return (
    <div className="border border-gray-800 bg-zinc-950/80 backdrop-blur shadow-2xl rounded-xl overflow-hidden max-w-4xl mx-auto">
      <div className="p-4 md:p-6 border-b border-gray-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Economic Calendar</h3>
            <p className="text-xs text-gray-400">High-impact news for {pair}</p>
          </div>
        </div>
        <button
          onClick={() => fetchCalendar(pair)}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-sm">Loading calendar...</div>
        ) : error ? (
          <div className="text-center py-8 text-rose-400 text-sm">{error}</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No high-impact events found.</div>
        ) : (
          <div className="space-y-4">
            {events.map((event, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/60 rounded-lg border border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="text-amber-500 font-mono text-sm font-bold flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {event.time}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{event.event}</div>
                    <div className="text-xs text-gray-400">Forecast: {event.forecast}</div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                  event.impact === 'High' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {event.impact}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
