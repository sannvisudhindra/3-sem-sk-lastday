import { useEffect, useState } from 'react';
import { useActiveHold } from './holdStore.ts';
import { Clock } from 'lucide-react';

export default function HoldTimerPill() {
  const hold = useActiveHold();
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!hold) {
      setSecondsLeft(0);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [hold]);

  if (!hold || secondsLeft <= 0) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

  const isCritical = secondsLeft <= 20;
  const isWarning = secondsLeft <= 60;

  const colorClasses = isCritical
    ? 'border-red-500/50 bg-red-500/10 text-red-400 animate-pulse'
    : isWarning
    ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
    : 'border-teal-500/30 bg-teal-500/10 text-teal-300';

  const handleClick = () => {
    if (typeof window !== 'undefined') {
      window.location.href = `/checkout/${hold.holdId}`;
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium backdrop-blur-md transition-all hover:scale-105 cursor-pointer ${colorClasses}`}
      title="Click to return to active checkout"
    >
      <Clock className="w-3.5 h-3.5" />
      <span>
        Seats held · <strong className="tabular-nums font-mono">{timeFormatted}</strong>
      </span>
    </button>
  );
}
