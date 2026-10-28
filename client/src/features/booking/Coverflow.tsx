import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { formatINR, formatIST } from './format.ts';
import type { EventSummary } from './types.ts';
import { Calendar, MapPin, Sparkles } from 'lucide-react';

interface CoverflowProps {
  events: EventSummary[];
  onSelectEvent: (event: EventSummary) => void;
}

export default function Coverflow({ events, onSelectEvent }: CoverflowProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setActiveIndex(i => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveIndex(i => Math.min(events.length - 1, i + 1));
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [events.length]);

  if (!events || events.length === 0) return null;

  const current = events[activeIndex] || events[0];

  return (
    <div className="flex flex-col items-center w-full py-6 select-none overflow-hidden">
      {/* 3D Viewport with 1200px perspective per PRD §8.3 */}
      <div
        className="relative flex items-center justify-center h-[460px] w-full"
        style={{ perspective: 1200 }}
      >
        {events.map((ev, index) => {
          const distance = index - activeIndex;
          const absDist = Math.abs(distance);
          const rotateY = Math.max(-45, Math.min(45, distance * -30));
          const scale = Math.max(0.7, 1 - absDist * 0.14);
          const zIndex = 50 - absDist;
          const zTranslate = -absDist * 140;
          const opacity = Math.max(0.3, 1 - absDist * 0.28);
          const translateX = distance * 220;

          return (
            <motion.div
              key={ev.id}
              onClick={() => setActiveIndex(index)}
              animate={{
                x: translateX,
                rotateY,
                scale,
                z: zTranslate,
                opacity
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="absolute w-[290px] h-[410px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer border border-white/10 bg-[#0E1020]"
              style={{
                zIndex,
                transformStyle: 'preserve-3d'
              }}
            >
              {ev.posterUrl ? (
                <img src={ev.posterUrl} alt={ev.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1E1B4B] via-[#0F172A] to-[#020617] p-6 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF5E62]">
                      {ev.eventType}
                    </span>
                    <h2 className="text-xl font-black text-white leading-tight">{ev.title}</h2>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-teal-400" /> {ev.venue.name}</p>
                    <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-coral-400" /> {formatIST(ev.startsAt)}</p>
                  </div>
                </div>
              )}

              {/* Bottom glass glow overlay */}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FF5E62]">
                  {ev.eventType}
                </span>
                <h3 className="text-base font-bold text-white truncate">{ev.title}</h3>
                <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-teal-400" /> {ev.venue.name}, {ev.venue.city}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Indicator Dots */}
      <div className="flex gap-1.5 my-4">
        {events.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              i === activeIndex ? 'w-6 bg-[#FF5E62]' : 'w-1.5 bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Expanded Active Panel */}
      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl mx-auto p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              {current.seatingMode}
            </span>
            {current.availability === 'fast' && (
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Filling Fast
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white">{current.title}</h2>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 justify-center sm:justify-start">
            <Calendar className="w-3.5 h-3.5 text-coral-400" /> {formatIST(current.startsAt)}
          </p>
          <p className="text-sm font-medium text-white">
            From <span className="text-amber-400 font-bold">{formatINR(current.minPricePaise)}</span>
          </p>
        </div>

        <button
          onClick={() => onSelectEvent(current)}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF5E62] to-[#FF9F43] text-[#1A0F0A] font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" /> Book Now
        </button>
      </motion.div>
    </div>
  );
}
