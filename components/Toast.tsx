'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastState {
  message: string;
  tone?: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const tone = toast.tone ?? 'info';
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertCircle : Info;
  const toneClasses =
    tone === 'success'
      ? 'border-emerald-400/35 text-emerald-100'
      : tone === 'error'
        ? 'border-rose-400/40 text-rose-100'
        : 'border-champagne-400/35 text-champagne-100';
  const iconColor =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'error'
        ? 'text-rose-300'
        : 'text-champagne-gold';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] max-w-[calc(100vw-2rem)] sm:max-w-sm surface-elevated ${toneClasses} px-4 py-2.5 rounded-2xl flex items-center gap-2.5 animate-slideUp shadow-2xl`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
      <span className="text-xs font-medium leading-snug">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-1 text-stone-400 hover:text-stone-100 p-0.5 rounded-lg flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
