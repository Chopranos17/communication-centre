import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ToastStack } from "../components/ui/ToastStack";

export type ToastVariant = "neutral" | "success" | "error";

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  showToast: (
    variant: ToastVariant,
    message: string,
    action?: Toast["action"],
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState<Toast[]>([]);
  const queue = useRef<Toast[]>([]);
  const timerRefs = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timerRefs.current.get(id);
    if (t) {
      window.clearTimeout(t);
      timerRefs.current.delete(id);
    }
    setVisible((prev) => {
      const next = prev.filter((x) => x.id !== id);
      if (queue.current.length > 0 && next.length < 3) {
        const [queued, ...rest] = queue.current;
        queue.current = rest;
        return [queued, ...next].slice(0, 3);
      }
      return next;
    });
  }, []);

  const showToast = useCallback(
    (variant: ToastVariant, message: string, action?: Toast["action"]) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const toast: Toast = { id, variant, message, action };
      setVisible((prev) => {
        if (prev.length >= 3) {
          queue.current = [...queue.current, toast];
          return prev;
        }
        return [toast, ...prev];
      });
    },
    [],
  );

  useEffect(() => {
    visible.forEach((t) => {
      if (timerRefs.current.has(t.id)) return;
      const duration = t.variant === "error" ? 6000 : 4000;
      timerRefs.current.set(
        t.id,
        window.setTimeout(() => {
          timerRefs.current.delete(t.id);
          dismiss(t.id);
        }, duration),
      );
    });
  }, [visible, dismiss]);

  useEffect(() => {
    return () => {
      timerRefs.current.forEach((id) => window.clearTimeout(id));
      timerRefs.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastStack toasts={visible} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
