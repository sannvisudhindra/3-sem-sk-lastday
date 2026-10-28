import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Coverflow from '../../features/booking/Coverflow.tsx';
import { fetchEvents, joinQueue } from '../../features/booking/api.ts';
import { formatINR, formatIST } from '../../features/booking/format.ts';
import type { EventSummary } from '../../features/booking/types.ts';
import { MapPin, Calendar } from 'lucide-react';

const CATEGORIES = ['all', 'concert', 'comedy', 'theatre', 'sports', 'festival'];

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchEvents(cityFilter, selectedCat)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [cityFilter, selectedCat]);

  const handleBook = async (event: EventSummary) => {
    try {
      const q = await joinQueue(event.id);
      if (q.status === 'waiting') {
        navigate(`/events/${event.id}/queue`);
      } else {
        navigate(`/events/${event.id}/book`);
      }
    } catch {
      navigate(`/events/${event.id}/book`);
    }
  };

  return (
    <div className="min-h-screen pb-20 px-4 max-w-7xl mx-auto">
      {/* Category Pills & City Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-6 pb-2">
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                selectedCat === cat
                  ? 'bg-gradient-to-r from-[#FF5E62] to-[#FF9F43] text-[#1A0F0A]'
                  : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs text-slate-300 w-full sm:w-auto">
          <MapPin className="w-3.5 h-3.5 text-teal-400" />
          <input
            type="text"
            placeholder="Filter by city..."
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="bg-transparent border-none outline-none text-white placeholder-slate-500 w-28"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-[460px] flex items-center justify-center text-slate-400">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 gap-2">
          <p>No events found matching your filter.</p>
        </div>
      ) : (
        <>
          <Coverflow events={events} onSelectEvent={handleBook} />

          {/* Flat Grid Below per PRD §8.3 */}
          <div className="mt-14">
            <h2 className="text-lg font-bold text-white mb-4">All Events</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => handleBook(ev)}
                  className="rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
                >
                  <div className="p-4 flex flex-col justify-between h-full space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF5E62]">
                        {ev.eventType}
                      </span>
                      <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                        {ev.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-teal-400" /> {ev.venue.name}, {ev.venue.city}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> {formatIST(ev.startsAt)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-xs text-slate-400">
                        From <strong className="text-white">{formatINR(ev.minPricePaise)}</strong>
                      </span>
                      <span className="text-xs font-semibold text-teal-400 group-hover:underline">Select Seats →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
