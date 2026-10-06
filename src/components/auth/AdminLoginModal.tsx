import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Lock, X, Loader2, AlertCircle, Clock } from 'lucide-react';
import { normalizeGasErrorMessage } from '../../services/api';
import { LoginIllustration } from '../illustrations/LoginIllustration';

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
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
          onClick={() => !isLoading && setIsAdminLoginOpen(false)}
        />

        {/* Modal Window */}
        <div className="inline-block w-full max-w-sm p-6 my-8 text-left align-middle bg-white dark:bg-stone-900 shadow-2xl rounded-2xl border border-stone-200 dark:border-stone-700 relative z-10 animate-fadeIn transition-colors">
          {/* Close button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setIsAdminLoginOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-lg text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Login Illustration */}
          <div className="w-full h-28 mb-3 rounded-xl overflow-hidden flex items-center justify-center bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800">
            <LoginIllustration className="h-full w-auto max-w-full" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Masuk sebagai Admin</h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">Masukkan PIN Keamanan Admin Gudang</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
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
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-center tracking-widest font-mono font-bold text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-700 dark:focus:ring-amber-500 disabled:opacity-50 transition-all"
                />
                <Lock className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Lockout Warning */}
            {isLocked && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-lg text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
                <span>
                  Terkunci sementara. Coba lagi dalam <strong>{lockoutRemaining} detik</strong>.
                </span>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && !isLocked && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-lg text-rose-900 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsAdminLoginOpen(false)}
                className="flex-1 py-2 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLocked || isLoading || !pin.trim()}
                className="flex-1 py-2 px-4 bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 shadow-xs"
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
