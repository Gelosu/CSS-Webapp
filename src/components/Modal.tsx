import type { ReactNode } from "react";

const SIZE_CLASSES = {
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Modal({
  title,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: keyof typeof SIZE_CLASSES;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`w-full ${SIZE_CLASSES[size]} rounded-2xl border border-border bg-surface p-6 shadow-xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
