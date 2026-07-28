"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "unsupported" | "off" | "on" | "busy" | "denied";

/** Bell toggle: register the service worker + push subscription for this device. */
export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [state, setState] = useState<State>("busy");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Yield once so state updates happen asynchronously to the effect body.
      await Promise.resolve();
      if (!vapidPublicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setState("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("unsupported");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  if (state === "unsupported" || !vapidPublicKey) return null;

  const toggle = async () => {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
        setState("off");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setState("on");
    } catch (err) {
      console.error("Push toggle failed:", err);
      setState("off");
    }
  };

  const label =
    state === "on" ? "Notifications on" : state === "denied" ? "Notifications blocked" : "Enable notifications";

  return (
    <button
      onClick={toggle}
      disabled={state === "busy" || state === "denied"}
      title={label}
      aria-label={label}
      className={`transition-colors ${state === "on" ? "text-accent" : "text-ink-faint hover:text-ink-muted"} disabled:opacity-40`}
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
        <path d="M8 2a4 4 0 0 0-4 4v2.5L2.5 11h11L12 8.5V6a4 4 0 0 0-4-4Z" />
        <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" />
        {state !== "on" && <path d="M2 2l12 12" strokeOpacity="0.7" />}
      </svg>
    </button>
  );
}
