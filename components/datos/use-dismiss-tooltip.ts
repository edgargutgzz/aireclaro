"use client";

import { useEffect } from "react";

// Shared dismiss behavior for /datos' hand-rolled hover tooltips (the bar
// charts' MonthTooltipCard/station tooltips, cobertura's cell tooltip, the
// calendar day tooltip, promedio anual's InfoPill) -- all built the same
// onMouseEnter/onMouseLeave/onFocus/onBlur way, which only clears a
// tooltip for a mouse or keyboard user. Touch has no "moving the pointer
// away" gesture, so a tap opens one and nothing ever closes it again
// (2026-09-27 feedback, first noticed on the calendar's day cells).
//
// Call with `active` = whatever condition means "a tooltip is currently
// showing" (pass false/null-checked-to-false to skip wiring anything up).
// Adds a document-level pointerdown -- covers mouse, touch, and stylus --
// plus Escape, so every input method that can open a tooltip can also
// close it, the same way clicking/tapping outside an open menu would.
export function useDismissTooltip(active: boolean, onDismiss: () => void) {
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("pointerdown", onDismiss);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDismiss);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, onDismiss]);
}
