'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CircleCheck } from 'lucide-react';

type Toast = { id: number; message: string };
type ToastFn = (message: string) => void;

const ToastContext = createContext<ToastFn>(() => {});
const DURATION_MS = 4000;
let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback<ToastFn>((message) => {
    const id = ++counter;
    setToasts((current) => [...current, { id, message }]);
    // Each notice removes itself after ~4 s.
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), DURATION_MS);
  }, []);

  const value = useMemo(() => toast, [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-sm">
            <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
