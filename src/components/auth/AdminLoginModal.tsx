import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Lock, X, Loader2, AlertCircle, Clock } from 'lucide-react';
import { normalizeGasErrorMessage } from '../../services/api';

export const AdminLoginModal: React.FC = () => {
  const { isAdminLoginOpen, setIsAdminLoginOpen, loginAdmin } = useApp();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Brute-force protection: 5 failed attempts -> 30s lockout
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  // Focus input when modal opens
  useEffect(() => {
    if (isAdminLoginOpen) {
      setPin('');
      setErrorMsg(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isAdminLoginOpen]);

  if (!isAdminLoginOpen) return null;

  const isLocked = lockoutRemaining > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || isLoading || !pin.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await loginAdmin(pin.trim());
      // Successful login resets state
      setPin('');
      setFailedAttempts(0);
    } catch (err: unknown) {
      const msg = normalizeGasErrorMessage(err, undefined, 'PIN salah atau verifikasi gagal.');
      setErrorMsg(msg);
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 5) {
        setLockoutRemaining(30);
        setErrorMsg('Terlalu banyak percobaan gagal. Akses dikunci sementara selama 30 detik.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 text-center flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          onClick={() => !isLoading && setIsAdminLoginOpen(false)}
        />

        {/* Modal Window */}
        <div className="inline-block w-full max-w-sm p-6 my-8 text-left align-middle bg-white shadow-2xl rounded-2xl border border-slate-200 relative z-10 animate-fadeIn">
          {/* Close button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setIsAdminLoginOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Masuk sebagai Admin</h3>
              <p className="text-[11px] text-slate-500">Masukkan PIN Keamanan Admin Gudang</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                PIN Admin:
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  disabled={isLocked || isLoading}
                  placeholder="••••••"
                  maxLength={10}
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-center tracking-widest font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Lockout Warning */}
            {isLocked && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                <span>
                  Terkunci sementara. Coba lagi dalam <strong>{lockoutRemaining} detik</strong>.
                </span>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && !isLocked && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsAdminLoginOpen(false)}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLocked || isLoading || !pin.trim()}
                className="flex-1 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <span>Masuk</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
