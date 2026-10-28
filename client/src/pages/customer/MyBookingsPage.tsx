import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { fetchMyBookings } from '../../features/booking/api.ts';
import type { BookingTicket } from '../../features/booking/types.ts';
import { formatINR, formatIST } from '../../features/booking/format.ts';
import { ArrowLeft, Calendar, MapPin, Ticket } from 'lucide-react';

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingTicket[]>([]);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyBookings()
      .then(setBookings)
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();
  const filtered = bookings.filter(b => {
    const eventTime = new Date(b.event.startsAt).getTime();
    return tab === 'upcoming' ? eventTime >= now : eventTime < now;
  });

  return (
    <div className="min-h-screen pb-20 px-4 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="py-6 flex items-center justify-between border-b border-white/5">
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => setTab('upcoming')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'upcoming' ? 'bg-white/10 text-white' : 'text-slate-400'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setTab('past')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              tab === 'past' ? 'bg-white/10 text-white' : 'text-slate-400'
            }`}
          >
            Past
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-white mt-6 mb-4">My Tickets</h1>

      {loading ? (
        <div className="text-slate-400 text-xs">Loading tickets...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <Ticket className="w-12 h-12 mx-auto text-slate-600" />
          <p className="text-slate-400 text-sm">No {tab} tickets found.</p>
          <button
            onClick={() => navigate('/events')}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Browse Events
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(bk => (
            <div
              key={bk.id}
              className="relative rounded-2xl bg-[#0E1020] border border-white/10 p-5 flex flex-col justify-between overflow-hidden shadow-xl"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF5E62]">
                      {bk.event.eventType}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">{bk.event.title}</h3>
                  </div>
                  <div className="p-1.5 bg-white rounded-lg">
                    <QRCodeSVG value={bk.ticketCode} size={48} />
                  </div>
                </div>

                <div className="mt-4 space-y-1 text-xs text-slate-400">
                  <p className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-coral-400" /> {formatIST(bk.event.startsAt)}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" /> {bk.event.venue.name}, {bk.event.venue.city}
                  </p>
                </div>

                {/* Perforated Divider */}
                <div className="relative my-4 border-t border-dashed border-white/20">
                  <div className="absolute -left-7 -top-2.5 w-5 h-5 rounded-full bg-[#07080F]" />
                  <div className="absolute -right-7 -top-2.5 w-5 h-5 rounded-full bg-[#07080F]" />
                </div>

                {/* Seats list */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Reserved Seats / Items</span>
                  <div className="flex flex-wrap gap-1.5">
                    {bk.items.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-medium text-slate-300"
                      >
                        {item.label || item.sectionName} (x{item.qty})
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono">{bk.ticketCode}</span>
                <span className="font-bold text-amber-400">{formatINR(bk.totalPaise)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
