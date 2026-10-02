"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

// A single-choice dropdown for /datos. Replaces a native <select>, whose open
// list is drawn by the OS and can't match the page (2026-10-01 feedback). The
// list uses the same surface as DownloadImageMenu, and follows the WAI-ARIA
// listbox pattern: arrows / Home / End move, Enter / Space pick, Escape or
// an outside tap closes.

interface Option<T extends string> {
  value: T;
  label: string;
}

const MENU_MAX_HEIGHT = 288; // max-h-72
const GAP = 8;

export default function SelectMenu<T extends string>({
  id,
  options,
  value,
  onChange,
  className = "",
}: {
  /** Put on the trigger, so an external <label htmlFor> names it. */
  id?: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Fixed, not absolute: ChartCard clips its overflow, which would cut an
  // absolutely positioned list off at the card's bottom edge.
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIndex];

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const pick = (index: number) => {
    onChange(options[index].value);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    // Opens below the trigger, or above when there's more room there (the
    // card sits at the bottom of the page). Re-anchored on scroll/resize.
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - GAP * 2;
      const above = rect.top - GAP * 2;
      const width = Math.max(rect.width, 240);
      const left = Math.min(rect.left, window.innerWidth - width - GAP);
      setPos(
        below >= MENU_MAX_HEIGHT || below >= above
          ? { left, width, top: rect.bottom + GAP, maxHeight: Math.min(MENU_MAX_HEIGHT, below) }
          : { left, width, bottom: window.innerHeight - rect.top + GAP, maxHeight: Math.min(MENU_MAX_HEIGHT, above) },
      );
    };
    place();
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  // Focus the list once it's placed, and keep the active option in view.
  useEffect(() => {
    if (open && pos) listRef.current?.focus({ preventScroll: true });
  }, [open, pos]);
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, pos]);

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive((i) => Math.min(last, i + 1)),
      ArrowUp: () => setActive((i) => Math.max(0, i - 1)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => pick(active),
      " ": () => pick(active),
      Escape: () => close(true),
      Tab: () => close(false),
    };
    const handler = keys[e.key];
    if (!handler) return;
    if (e.key !== "Tab") e.preventDefault();
    handler();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openList();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={`relative w-full rounded-xl bg-gray-100 py-2.5 pl-3 pr-9 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${className}`}
      >
        <span className="block truncate">{selected?.label}</span>
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open && pos && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKeyDown}
          style={pos}
          className="fixed z-20 overflow-y-auto rounded-xl border border-black/[0.08] bg-white/95 p-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px] focus:outline-none"
        >
          {options.map((o, i) => {
            const isSelected = i === selectedIndex;
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                onClick={() => pick(i)}
                onPointerMove={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  i === active ? "bg-gray-100/70" : ""
                } ${isSelected ? "font-medium text-gray-800" : "text-gray-600"}`}
              >
                <span className="truncate">{o.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
