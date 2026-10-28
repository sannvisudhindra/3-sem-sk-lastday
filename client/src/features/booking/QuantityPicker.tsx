import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { formatINR } from './format.ts';

interface QuantityPickerProps {
  qty: number;
  onChange: (qty: number) => void;
  maxAllowed: number;
  pricePaise: number;
  availableCapacity: number;
}

export default function QuantityPicker({
  qty,
  onChange,
  maxAllowed,
  pricePaise,
  availableCapacity
}: QuantityPickerProps) {
  const max = Math.min(maxAllowed, availableCapacity);

  return (
    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h4 className="font-bold text-white text-base">General Admission</h4>
        <p className="text-xs text-slate-400 mt-1">
          {formatINR(pricePaise)} per ticket · {availableCapacity} spots remaining
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          disabled={qty <= 1}
          onClick={() => onChange(Math.max(1, qty - 1))}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-xl font-bold text-white tabular-nums w-8 text-center">{qty}</span>
        <button
          disabled={qty >= max}
          onClick={() => onChange(Math.min(max, qty + 1))}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
