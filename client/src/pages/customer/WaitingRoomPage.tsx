import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { checkQueueStatus } from '../../features/booking/api.ts';
import { Users, Clock } from 'lucide-react';

export default function WaitingRoomPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const entryId = (location.state as any)?.entryId || 'q-mock-entry';
  const [position, setPosition] = useState<number>((location.state as any)?.position || 42);

  useEffect(() => {
    const targetEventId = eventId || 'ev-neon-nights';
    const interval = setInterval(async () => {
      try {
        const res = await checkQueueStatus(entryId);
        if (res.status === 'admitted') {
          clearInterval(interval);
          navigate(`/events/${targetEventId}/book`);
        } else {
          setPosition(res.position);
        }
      } catch {
        // Continue polling on transient errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [entryId, eventId, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#07080F]">
      {/* Aurora Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF5E62]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#14D3B5]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-6">
          <Users className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">You're in Line!</h1>
        <p className="text-xs text-slate-400 mb-8">
          This event has heavy demand. Please do not refresh; we will automatically move you to seat selection.
        </p>

        {/* Animated Position Counter */}
        <div className="p-6 rounded-2xl bg-black/40 border border-white/5 mb-6">
          <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Your Position</span>
          <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF5E62] to-[#FF9F43] mt-2 tabular-nums">
            #{position}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Clock className="w-4 h-4 text-amber-400 animate-spin" />
          <span>Estimated wait: ~{Math.max(1, Math.ceil(position / 10))} min</span>
        </div>
      </div>
    </div>
  );
}
