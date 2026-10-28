import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useActiveHold, setActiveHold } from '../../features/booking/holdStore.ts';
import { createPayment, sendOtp, verifyOtp, getPaymentStatus, releaseHold } from '../../features/booking/api.ts';
import Confetti from '../../features/booking/Confetti.tsx';
import { formatINR } from '../../features/booking/format.ts';
import { toast } from 'sonner';
import { CheckCircle, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

export default function CheckoutPage() {
  const { holdId } = useParams<{ holdId: string }>();
  const navigate = useNavigate();
  const hold = useActiveHold();

  const [method, setMethod] = useState<'upi_qr' | 'netbanking'>('netbanking');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentExpiresAt, setPaymentExpiresAt] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');

  // Net banking state
  const [selectedBank, setSelectedBank] = useState('Bank of Bengaluru');
  const [, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(3);
  const [isVerifying, setIsVerifying] = useState(false);

  // Timers
  const [holdSecs, setHoldSecs] = useState<number>(180);
  const [paySecs, setPaySecs] = useState<number>(60);

  // Result modals
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);

  // Hold-to-pay button state
  const [holdProgress, setHoldProgress] = useState(0);
  const holdIntervalRef = useRef<any>(null);

  // Hold countdown derived from server expiresAt
  useEffect(() => {
    if (!hold) return;
    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000));
      setHoldSecs(remaining);
      if (remaining === 0) {
        setFailureReason('Hold expired. Your seats were released.');
        setActiveHold(null);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [hold]);

  // Payment countdown (60s)
  useEffect(() => {
    if (!paymentExpiresAt) return;
    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(paymentExpiresAt).getTime() - Date.now()) / 1000));
      setPaySecs(remaining);
      if (remaining === 0 && !showSuccess) {
        setFailureReason('Payment attempt timed out.');
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [paymentExpiresAt, showSuccess]);

  // Poll for QR confirmation or status
  useEffect(() => {
    if (!paymentId || showSuccess || failureReason) return;
    const poll = setInterval(async () => {
      try {
        const res = await getPaymentStatus(paymentId);
        if (res.status === 'succeeded') {
          setBookingId(res.bookingId || 'BK-SUCCESS');
          setShowSuccess(true);
          setActiveHold(null);
          clearInterval(poll);
        } else if (res.status === 'failed') {
          setFailureReason(res.failureReason || 'Payment failed.');
          clearInterval(poll);
        }
      } catch {}
    }, 2500);
    return () => clearInterval(poll);
  }, [paymentId, showSuccess, failureReason]);

  const handleStartPayment = async () => {
    const targetHoldId = holdId || hold?.holdId;
    if (!targetHoldId) return;
    try {
      const p = await createPayment(targetHoldId, method);
      setPaymentId(p.paymentId);
      setPaymentExpiresAt(p.expiresAt);
      if (p.qrUrl) setQrUrl(p.qrUrl);
      if (method === 'netbanking') {
        const otpRes = await sendOtp(p.paymentId);
        setOtpSent(true);
        toast.success(`OTP sent to ${otpRes.emailHint}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not start payment.');
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const updated = [...otpDigits];
    updated[index] = val.slice(-1);
    setOtpDigits(updated);
    if (val && index < 5 && typeof document !== 'undefined') {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const startHoldToPay = () => {
    if (otpDigits.join('').length !== 6) {
      toast.error('Enter 6-digit OTP first.');
      return;
    }
    holdIntervalRef.current = setInterval(() => {
      setHoldProgress(p => {
        if (p >= 100) {
          clearInterval(holdIntervalRef.current);
          triggerVerify();
          return 100;
        }
        return p + 10;
      });
    }, 120);
  };

  const endHoldToPay = () => {
    clearInterval(holdIntervalRef.current);
    if (holdProgress < 100) setHoldProgress(0);
  };

  const triggerVerify = async () => {
    if (!paymentId) return;
    setIsVerifying(true);
    try {
      const res = await verifyOtp(paymentId, otpDigits.join(''));
      setBookingId(res.bookingId || 'BK-SUCCESS');
      setShowSuccess(true);
      setActiveHold(null);
    } catch (err: any) {
      setHoldProgress(0);
      if (err.details?.attemptsLeft !== undefined) {
        setOtpAttemptsLeft(err.details.attemptsLeft);
        toast.error(`Invalid OTP. ${err.details.attemptsLeft} attempts remaining.`);
      } else {
        setFailureReason(err.message || 'Payment verification failed.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReleaseAndExit = async () => {
    const targetHoldId = holdId || hold?.holdId;
    if (targetHoldId) await releaseHold(targetHoldId);
    setActiveHold(null);
    navigate('/events');
  };

  return (
    <div className="min-h-screen py-10 px-4 max-w-4xl mx-auto">
      {showSuccess && <Confetti />}

      {/* Header with hold countdown */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-white/5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Checkout</h1>
          <p className="text-xs text-slate-400 mt-0.5">Complete your payment before the hold expires.</p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
          <Clock className="w-4 h-4" />
          <span>
            Hold expires in: <strong className="font-mono tabular-nums">{Math.floor(holdSecs / 60)}:{(holdSecs % 60).toString().padStart(2, '0')}</strong>
          </span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Order Summary (Server calculated) */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 h-fit space-y-4">
          <h3 className="text-sm font-bold text-white">Order Summary</h3>
          <div className="border-t border-white/5 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Tickets ({hold?.ticketCount || 1}x)</span>
              <span>{formatINR(hold?.totalPaise || 0)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Convenience Fee</span>
              <span>₹0</span>
            </div>
            <div className="border-t border-white/5 pt-2 flex justify-between font-bold text-base text-white">
              <span>Total</span>
              <span className="text-amber-400">{formatINR(hold?.totalPaise || 0)}</span>
            </div>
          </div>

          <button
            onClick={handleReleaseAndExit}
            className="w-full py-2 text-xs text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
          >
            Release seats & cancel
          </button>
        </div>

        {/* Payment Methods */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-6">
          <div className="flex border-b border-white/10 pb-3 gap-6 text-sm font-bold">
            <button
              onClick={() => { setMethod('netbanking'); setPaymentId(null); }}
              className={`pb-2 border-b-2 transition-all cursor-pointer ${
                method === 'netbanking' ? 'border-[#FF5E62] text-white' : 'border-transparent text-slate-500'
              }`}
            >
              Net Banking (Mock)
            </button>
            <button
              onClick={() => { setMethod('upi_qr'); setPaymentId(null); }}
              className={`pb-2 border-b-2 transition-all cursor-pointer ${
                method === 'upi_qr' ? 'border-[#FF5E62] text-white' : 'border-transparent text-slate-500'
              }`}
            >
              UPI QR Code
            </button>
          </div>

          {method === 'upi_qr' ? (
            <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
              {!paymentId ? (
                <button
                  onClick={handleStartPayment}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5E62] to-[#FF9F43] text-[#1A0F0A] font-bold text-xs cursor-pointer"
                >
                  Generate QR Code
                </button>
              ) : (
                <>
                  <div className="p-3 bg-white rounded-2xl">
                    <QRCodeSVG value={qrUrl || 'https://encore.pay/mock-token'} size={180} />
                  </div>
                  <p className="text-xs text-slate-300">Scan using any UPI App or use the confirm link</p>
                  <p className="text-xs text-amber-300 font-mono">Attempt expires in: {paySecs}s</p>
                  <a
                    href={`/pay/mock-token`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-teal-400 underline hover:text-teal-300"
                  >
                    Open Mock Bank in New Tab
                  </a>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!paymentId ? (
                <>
                  <div>
                    <label className="text-xs text-slate-400">Select Mock Bank</label>
                    <select
                      value={selectedBank}
                      onChange={e => setSelectedBank(e.target.value)}
                      className="w-full mt-1.5 p-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs outline-none"
                    >
                      <option value="Bank of Bengaluru">Bank of Bengaluru</option>
                      <option value="Coastal Bank">Coastal Bank</option>
                      <option value="Metro Bank">Metro Bank</option>
                    </select>
                  </div>
                  <button
                    onClick={handleStartPayment}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF5E62] to-[#FF9F43] text-[#1A0F0A] font-bold text-xs cursor-pointer"
                  >
                    Send OTP to Email
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Enter 6-digit OTP (use <code className="text-teal-400">123456</code>)</span>
                    <span className="text-amber-300 font-mono">{paySecs}s left</span>
                  </div>

                  <div className="flex justify-center gap-2">
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        className="w-10 h-12 rounded-xl bg-black/50 border border-white/15 text-center text-lg font-bold text-white outline-none focus:border-teal-400"
                      />
                    ))}
                  </div>

                  {otpAttemptsLeft < 3 && (
                    <p className="text-xs text-red-400 text-center">{otpAttemptsLeft} attempts remaining</p>
                  )}

                  {/* Hold-to-pay button */}
                  <div className="relative pt-2">
                    <button
                      onMouseDown={startHoldToPay}
                      onMouseUp={endHoldToPay}
                      onTouchStart={startHoldToPay}
                      onTouchEnd={endHoldToPay}
                      className="relative w-full h-12 rounded-xl overflow-hidden bg-white/10 border border-white/10 font-bold text-sm text-white select-none flex items-center justify-center cursor-pointer"
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-75"
                        style={{ width: `${holdProgress}%` }}
                      />
                      <span className="relative z-10 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        {isVerifying ? 'Verifying...' : 'Press & Hold to Pay'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[#0E1020] border border-teal-500/30 text-center space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto text-teal-400" />
            <h2 className="text-xl font-bold text-white">Payment Confirmed!</h2>
            <p className="text-xs text-slate-300">
              Your tickets are booked. Booking ID: <code className="text-teal-400">{bookingId}</code>. A confirmation has been emailed to you.
            </p>
            <button
              onClick={() => navigate('/bookings')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#14D3B5] to-[#3B82F6] text-white font-bold text-xs cursor-pointer"
            >
              View My Bookings
            </button>
          </div>
        </div>
      )}

      {/* Failure / Timeout Modal */}
      {failureReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[#0E1020] border border-red-500/30 text-center space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-red-400" />
            <h2 className="text-xl font-bold text-white">Payment Incomplete</h2>
            <p className="text-xs text-slate-300">{failureReason}</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setFailureReason(null); setPaymentId(null); }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/15 cursor-pointer"
              >
                Retry Payment
              </button>
              <button
                onClick={() => navigate('/events')}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-300 font-bold text-xs hover:bg-red-500/30 cursor-pointer"
              >
                Choose New Seats
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
