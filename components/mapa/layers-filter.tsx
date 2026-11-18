"use client";

import { Check, Minus } from "lucide-react";

type CheckState = 'checked' | 'indeterminate' | 'unchecked';

// Styled after shadcn/ui's Checkbox (rounded-sm, border always in the
// "primary" tone, filled + shadow only once checked) rather than a plain
// light-gray box that suddenly turns dark.
export function LayerCheckbox({ state, size }: { state: CheckState; size: number }) {
  if (state === 'unchecked') {
    return (
      <div
        style={{ width: size, height: size, borderRadius: 4, border: '1.5px solid #737373', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center shadow-sm"
      style={{ width: size, height: size, borderRadius: 4, backgroundColor: '#737373', flexShrink: 0 }}
    >
      {state === 'checked' ? (
        <Check className="text-white" style={{ width: size - 6, height: size - 6 }} strokeWidth={3} />
      ) : (
        <Minus className="text-white" style={{ width: size - 7, height: size - 7 }} strokeWidth={3} />
      )}
    </div>
  );
}

