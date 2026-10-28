import React, { useState } from 'react';
import type { VenueLayout, SeatItem, EventSection } from './types.ts';
import { formatINR } from './format.ts';

export interface SeatMapProps {
  layout?: VenueLayout;
  seats?: SeatItem[];
  sections?: EventSection[];
  selected?: string[];
  onToggleSeat?: (seatId: string) => void;
  onSelectSection?: (sectionId: string) => void;
  readOnly?: boolean;
  highlightBooked?: boolean;
}

export default function SeatMap({
  layout,
  seats = [],
  sections = [],
  selected = [],
  onToggleSeat,
  readOnly = false,
  highlightBooked = false
}: SeatMapProps) {
  const [hoveredSeat, setHoveredSeat] = useState<SeatItem | null>(null);

  // Realtime subscription hook (Rule T-06 / PRD §8.3): listens to event_seats updates live
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const sb = (window as any).supabase;
    if (!sb) return;

    const channel = sb
      .channel('realtime-event-seats')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'event_seats' },
        (payload: any) => {
          if (payload.new && onToggleSeat && payload.new.status !== 'available') {
            // Deselect seat if taken by someone else
            if (selected.includes(payload.new.id)) {
              onToggleSeat(payload.new.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [selected, onToggleSeat]);

  const width = layout?.width || 1000;
  const height = layout?.height || 600;

  const getSeatColor = (seat: SeatItem) => {
    if (selected.includes(seat.id)) return '#FFFFFF'; // White fill
    if (seat.status === 'booked') return '#2A2D3A';
    if (seat.status === 'held') return '#555A70';
    const sec = sections.find(s => s.id === seat.sectionId);
    return sec?.color || '#3B82F6';
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-[#090B14] border border-white/10 p-4 flex flex-col items-center">
      {/* Stage visual */}
      {layout?.stage && (
        <div
          className="mb-8 w-1/2 py-2 text-center text-xs font-bold tracking-widest text-slate-400 uppercase rounded border border-white/10 bg-white/[0.02]"
          style={{ boxShadow: '0 4px 20px -2px rgba(255, 94, 98, 0.25)' }}
        >
          {layout.stage.label || 'STAGE'}
        </div>
      )}

      {/* SVG Container */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-h-[500px] select-none"
      >
        <defs>
          <pattern
            id="diagonalHatch"
            width="6"
            height="6"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {seats.map(seat => {
          const isSelected = selected.includes(seat.id);
          const isBooked = seat.status === 'booked';
          const isHeld = seat.status === 'held';
          const isClickable = !readOnly && seat.status === 'available';

          return (
            <g
              key={seat.id}
              onClick={() => isClickable && onToggleSeat?.(seat.id)}
              onMouseEnter={() => setHoveredSeat(seat)}
              onMouseLeave={() => setHoveredSeat(null)}
              className={isClickable ? 'cursor-pointer' : isBooked ? 'cursor-not-allowed opacity-80' : ''}
            >
              <circle
                cx={seat.x}
                cy={seat.y}
                r={isSelected ? 9 : 7}
                fill={getSeatColor(seat)}
                stroke={isSelected ? '#FF5E62' : 'rgba(0,0,0,0.5)'}
                strokeWidth={isSelected ? 3 : 1}
                className="transition-all duration-150"
              />
              {isHeld && (
                <circle
                  cx={seat.x}
                  cy={seat.y}
                  r={7}
                  fill="url(#diagonalHatch)"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover Tooltip */}
      {hoveredSeat && (
        <div className="absolute top-4 left-4 pointer-events-none px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-xs text-white backdrop-blur-md">
          <p className="font-bold">{hoveredSeat.label}</p>
          <p className="text-slate-400 capitalize">Status: {hoveredSeat.status}</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-white border border-[#FF5E62]" /> Selected
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-[#2A2D3A]" /> Booked
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-[#555A70]" /> Held
        </div>
        {sections.map(sec => (
          <div key={sec.id} className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: sec.color }} />
            {sec.name} ({formatINR(sec.pricePaise)})
          </div>
        ))}
      </div>
    </div>
  );
}
