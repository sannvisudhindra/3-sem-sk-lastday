import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchEventDetail, fetchEventSeats, createHold } from '../../features/booking/api.ts';
import { setActiveHold } from '../../features/booking/holdStore.ts';
import type { EventDetail, SeatItem } from '../../features/booking/types.ts';
import SeatMap from '../../features/booking/SeatMap.tsx';
import SectionPicker from '../../features/booking/SectionPicker.tsx';
import QuantityPicker from '../../features/booking/QuantityPicker.tsx';
import { formatINR, formatIST } from '../../features/booking/format.ts';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [sectionQtys, setSectionQtys] = useState<Record<string, number>>({});
  const [freeQty, setFreeQty] = useState(1);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    const targetId = id || 'ev-neon-nights';
    setLoading(true);
    Promise.all([fetchEventDetail(targetId), fetchEventSeats(targetId)])
      .then(([evDetail, evSeats]) => {
        setEvent(evDetail);
        setSeats(evSeats);
      })
      .catch(() => {
        toast.error('Failed to load event details.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading seating layout...
      </div>
    );
  }

  // Max tickets per user rule R6
  const maxAllowed = Math.max(0, 10 - (event.myTicketCount || 0));

  const handleToggleSeat = (seatId: string) => {
    if (selectedSeatIds.includes(seatId)) {
      setSelectedSeatIds(prev => prev.filter(s => s !== seatId));
    } else {
      if (selectedSeatIds.length >= maxAllowed) {
        toast.error(`You can hold at most ${maxAllowed} tickets.`);
        return;
      }
      setSelectedSeatIds(prev => [...prev, seatId]);
    }
  };

  const handleSectionQtyChange = (sectionId: string, delta: number) => {
    setSectionQtys(prev => {
      const current = prev[sectionId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [sectionId]: next };
    });
  };

  const totalSectionCount = Object.values(sectionQtys).reduce((a, b) => a + b, 0);

  // Total price calculation
  let totalPaise = 0;
  if (event.seatingMode === 'assigned') {
    selectedSeatIds.forEach(sId => {
      const seat = seats.find(s => s.id === sId);
      const sec = event.sections.find(s => s.id === seat?.sectionId);
      totalPaise += sec?.pricePaise || event.minPricePaise;
    });
  } else if (event.seatingMode === 'sectioned') {
    event.sections.forEach(sec => {
      const qty = sectionQtys[sec.id] || 0;
      totalPaise += qty * sec.pricePaise;
    });
  } else {
    totalPaise = freeQty * (event.sections[0]?.pricePaise || event.minPricePaise);
  }

  const ticketCount =
    event.seatingMode === 'assigned'
      ? selectedSeatIds.length
      : event.seatingMode === 'sectioned'
      ? totalSectionCount
      : freeQty;

  const handleConfirmHold = async () => {
    if (ticketCount === 0) {
      toast.error('Please pick at least one ticket.');
      return;
    }
    setHolding(true);
    try {
      const payload: any = { eventId: event.id };
      if (event.seatingMode === 'assigned') {
        payload.seatIds = selectedSeatIds;
      } else if (event.seatingMode === 'sectioned') {
        payload.sections = Object.entries(sectionQtys)
          .filter(([_, q]) => q > 0)
          .map(([secId, q]) => ({ sectionId: secId, qty: q }));
      } else {
        payload.sections = [{ sectionId: event.sections[0]?.id || 'default', qty: freeQty }];
      }

      const res = await createHold(payload);
      setActiveHold({
        holdId: res.holdId,
        eventId: event.id,
        eventTitle: event.title,
        expiresAt: res.expiresAt,
        totalPaise: res.totalPaise,
        ticketCount: res.ticketCount
      });

      toast.success('Seats held! Proceeding to checkout.');
      navigate(`/checkout/${res.holdId}`);
    } catch (err: any) {
      if (err.code === 'SEAT_TAKEN') {
        toast.error('One or more of your chosen seats were just taken. Please re-select.');
        fetchEventSeats(event.id).then(setSeats);
      } else if (err.code === 'LIMIT_EXCEEDED') {
        toast.error('Limit exceeded: You can only book up to 10 tickets per event.');
      } else {
        toast.error(err.message || 'Failed to hold tickets.');
      }
    } finally {
      setHolding(false);
    }
  };

  return (
    <div className="min-h-screen pb-32 px-4 max-w-6xl mx-auto">
      {/* Top Bar */}
      <div className="py-6 flex items-center justify-between border-b border-white/5">
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </button>
        <span className="text-xs text-slate-400">
          Max limit: <strong className="text-white">{maxAllowed} tickets</strong>
        </span>
      </div>

      {/* Header Info */}
      <div className="py-6 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#FF5E62]">
            {event.eventType}
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">{event.title}</h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-400" /> {event.venue.name}, {event.venue.city} · <Calendar className="w-3.5 h-3.5 text-coral-400" /> {formatIST(event.startsAt)}
          </p>
        </div>
      </div>

      {/* Seating Picker Area */}
      <div className="mt-4">
        {event.seatingMode === 'assigned' && (
          <SeatMap
            layout={event.venue.layout}
            seats={seats}
            sections={event.sections}
            selected={selectedSeatIds}
            onToggleSeat={handleToggleSeat}
          />
        )}

        {event.seatingMode === 'sectioned' && (
          <SectionPicker
            sections={event.sections}
            quantities={sectionQtys}
            onQtyChange={handleSectionQtyChange}
            maxTotalAllowed={maxAllowed}
            currentTotal={totalSectionCount}
          />
        )}

        {event.seatingMode === 'free' && (
          <QuantityPicker
            qty={freeQty}
            onChange={setFreeQty}
            maxAllowed={maxAllowed}
            pricePaise={event.sections[0]?.pricePaise || event.minPricePaise}
            availableCapacity={event.sections[0]?.available || 100}
          />
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 p-4 bg-[#07080F]/90 backdrop-blur-xl border-t border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">
              Selected: <strong className="text-white">{ticketCount}</strong> tickets
            </p>
            <p className="text-xl font-bold text-white tabular-nums">{formatINR(totalPaise)}</p>
          </div>

          <button
            disabled={ticketCount === 0 || holding}
            onClick={handleConfirmHold}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#FF5E62] to-[#FF9F43] text-[#1A0F0A] font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
          >
            {holding ? 'Holding Seats...' : 'Confirm & Pay'}
          </button>
        </div>
      </div>
    </div>
  );
}
