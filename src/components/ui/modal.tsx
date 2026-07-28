"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const ModalContext = createContext<{ close: () => void } | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used inside <Modal>");
  return ctx;
}

export function Modal({
  trigger,
  title,
  children,
  wide = false,
}: {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onMouseDown={(e) => {
          // Click on the backdrop closes.
          if (e.target === ref.current) setOpen(false);
        }}
        className={cn(
          "m-auto w-full rounded-(--radius-card) border border-edge-strong bg-surface text-ink shadow-2xl shadow-black/60 backdrop:bg-black/60 backdrop:backdrop-blur-[2px]",
          wide ? "max-w-2xl" : "max-w-md",
        )}
      >
        {open && (
          <ModalContext.Provider value={{ close: () => setOpen(false) }}>
            <div className="flex items-center justify-between border-b border-edge px-5 py-3.5">
              <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-ink-faint transition-colors hover:text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-5">{children}</div>
          </ModalContext.Provider>
        )}
      </dialog>
    </>
  );
}
