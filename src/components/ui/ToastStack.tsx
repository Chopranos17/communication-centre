import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { Toast } from "../../contexts/ToastContext";

const VARIANT_STYLES: Record<
  Toast["variant"],
  { bg: string; Icon: LucideIcon }
> = {
  neutral: { bg: "bg-neutral-800", Icon: Info },
  success: { bg: "bg-success", Icon: CheckCircle2 },
  error: { bg: "bg-error", Icon: XCircle },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const { bg, Icon } = VARIANT_STYLES[toast.variant];
  return (
    <div
      className={`${bg} animate-fadeSlideIn pointer-events-auto flex min-h-10 w-max min-w-[240px] max-w-[480px] items-center gap-1 rounded-sds-8 px-4 py-2 font-darwin text-body-m font-book leading-snug text-white shadow-sds-1`}
      role="alert"
      aria-live="polite"
    >
      <Icon size={24} className="shrink-0 text-white" aria-hidden />
      <span className="ml-1 flex-1">{toast.message}</span>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick();
            onDismiss(toast.id);
          }}
          className="ml-4 whitespace-nowrap text-body-m font-medium text-white underline underline-offset-2 transition-opacity hover:opacity-80"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="ml-3 shrink-0 opacity-80 transition-opacity hover:opacity-100"
      >
        <X size={16} className="text-white" aria-hidden />
      </button>
    </div>
  );
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-6 z-[9999] flex -translate-x-1/2 flex-col items-center gap-6">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
