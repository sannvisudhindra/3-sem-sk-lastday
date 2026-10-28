import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { approvePaymentLink } from '../../features/booking/api.ts';
import { Shield, CheckCircle } from 'lucide-react';

export default function MockPayPage() {
  const { token } = useParams<{ token: string }>();
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approvePaymentLink(token || 'mock-token');
      setApproved(true);
    } catch {
      // In mock mode, mark as approved
      setApproved(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#07080F]">
      <div className="max-w-sm w-full p-6 rounded-3xl bg-[#0E1020] border border-white/10 text-center space-y-6 shadow-2xl">
        <div className="w-12 h-12 mx-auto rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
          <Shield className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">Encore Pay (Mock)</h2>
          <p className="text-xs text-slate-400 mt-1">Merchant Authorization Portal</p>
        </div>

        {approved ? (
          <div className="space-y-3">
            <CheckCircle className="w-12 h-12 mx-auto text-teal-400" />
            <p className="text-sm font-bold text-white">Payment Approved!</p>
            <p className="text-xs text-slate-400">You may now return to your primary device.</p>
          </div>
        ) : (
          <button
            disabled={loading}
            onClick={handleApprove}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-400 to-blue-500 text-white font-bold text-xs cursor-pointer hover:scale-105 transition-all"
          >
            {loading ? 'Approving...' : 'Approve Payment (Mock)'}
          </button>
        )}
      </div>
    </div>
  );
}
