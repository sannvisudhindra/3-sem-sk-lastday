import type { EventSection } from './types.ts';
import { formatINR } from './format.ts';
import { Minus, Plus } from 'lucide-react';

interface SectionPickerProps {
  sections: EventSection[];
  quantities: Record<string, number>;
  onQtyChange: (sectionId: string, delta: number) => void;
  maxTotalAllowed: number;
  currentTotal: number;
}

export default function SectionPicker({
  sections,
  quantities,
  onQtyChange,
  maxTotalAllowed,
  currentTotal
}: SectionPickerProps) {
  return (
    <div className="space-y-3">
      {sections.map(sec => {
        const qty = quantities[sec.id] || 0;
        const isSoldOut = sec.available <= 0;
        const canAdd = currentTotal < maxTotalAllowed && qty < sec.available && !isSoldOut;

        return (
          <div
            key={sec.id}
            className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
              qty > 0 ? 'bg-white/[0.08] border-teal-500/50' : 'bg-white/[0.02] border-white/10'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sec.color }} />
                <h4 className="font-bold text-white text-sm">{sec.name}</h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {formatINR(sec.pricePaise)} · {isSoldOut ? (
                  <span className="text-red-400">Sold out</span>
                ) : (
                  <span>{sec.available} available</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={qty <= 0}
                onClick={() => onQtyChange(sec.id, -1)}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-bold text-white tabular-nums">{qty}</span>
              <button
                disabled={!canAdd}
                onClick={() => onQtyChange(sec.id, 1)}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
