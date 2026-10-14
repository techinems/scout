"use client";

import { useId, useRef, useState } from "react";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type Suggestion = { placeId: string; main: string; secondary: string };

// Flipped once the server reports Places isn't configured, so every address
// field on the page stops asking and behaves as a plain text input.
let placesUnavailable = false;

function newSessionToken(): string {
  return crypto.randomUUID();
}

/**
 * Text input with address suggestions from Google Places. Free text is still
 * allowed (LZ descriptions, "rear lot behind Station 2"); picking a
 * suggestion replaces the text with the place's full formatted address, and
 * the server geocodes it on save as before.
 */
export function AddressInput({
  name,
  defaultValue = "",
  placeholder,
  required,
  className,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<AbortController | null>(null);
  const session = useRef<string | null>(null);
  // Bumped on every edit, so a slow response can't overwrite newer text.
  const edits = useRef(0);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const query = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    inflight.current?.abort();
    if (placesUnavailable || text.trim().length < 3) {
      setSuggestions([]);
      close();
      return;
    }
    timer.current = setTimeout(async () => {
      session.current ??= newSessionToken();
      const controller = new AbortController();
      inflight.current = controller;
      try {
        const params = new URLSearchParams({ q: text.trim(), session: session.current });
        const res = await fetch(`/api/places/autocomplete?${params}`, { signal: controller.signal });
        const body = (await res.json()) as { enabled?: boolean; suggestions?: Suggestion[] };
        if (body.enabled === false) placesUnavailable = true;
        const list = body.suggestions ?? [];
        setSuggestions(list);
        setActive(-1);
        setOpen(list.length > 0);
      } catch {
        // aborted or network error — leave the field as plain text
      }
    }, 220);
  };

  const pick = async (s: Suggestion) => {
    const edit = ++edits.current;
    const token = session.current;
    session.current = null;
    setValue(s.secondary ? `${s.main}, ${s.secondary}` : s.main);
    setSuggestions([]);
    close();
    if (!token) return;
    try {
      const params = new URLSearchParams({ id: s.placeId, session: token });
      const res = await fetch(`/api/places/details?${params}`);
      if (!res.ok) return;
      const { address } = (await res.json()) as { address?: string | null };
      if (address && edit === edits.current) setValue(address);
    } catch {
      // keep the suggestion text
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      void pick(suggestions[active]);
    } else if (e.key === "Escape") {
      // Close the list without also closing the surrounding modal.
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  return (
    <div className="relative">
      <Input
        name={name}
        value={value}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          edits.current++;
          setValue(e.target.value);
          query(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onBlur={close}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-(--radius-control) border border-edge-strong bg-surface-2 shadow-xl shadow-black/50">
          <ul id={listId} role="listbox">
            {suggestions.map((s, i) => (
              <li
                key={s.placeId}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // Keep focus in the input so blur doesn't close the list first.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void pick(s)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm",
                  i === active ? "bg-surface-3 text-ink" : "text-ink-muted",
                )}
              >
                <span className="text-ink">{s.main}</span>
                {s.secondary && <span className="ml-1.5 text-[12px] text-ink-faint">{s.secondary}</span>}
              </li>
            ))}
          </ul>
          <p className="border-t border-edge px-3 py-1 text-right text-[10px] text-ink-faint">powered by Google</p>
        </div>
      )}
    </div>
  );
}
