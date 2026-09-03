import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Tone = 'ok' | 'err' | 'info';
interface ToastItem { id: number; text: string; tone: Tone }

const Ctx = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const push = useCallback((text: string, tone: Tone = 'info') => {
    const id = ++idRef.current;
    setItems((it) => [...it.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setItems((it) => it.filter((x) => x.id !== id)), 2600);
  }, []);
  const value = useMemo(() => push, [push]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4 safe-t">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className={`max-w-[440px] rounded-2xl px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-float ${
                t.tone === 'ok' ? 'bg-brand' : t.tone === 'err' ? 'bg-coral' : 'bg-ink'
              }`}
              role="status"
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
