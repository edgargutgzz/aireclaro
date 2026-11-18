"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

// External links inside a dialog. One place for the underline, the rel
// hardening, and the note that the link leaves the page, which sighted
// readers get from the new tab and nobody else does.
export function DialogLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xs font-medium text-neutral-700 underline underline-offset-2 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
    >
      {children}
      <span className="sr-only"> (abre en una nueva pestaña)</span>
    </a>
  );
}

// Every modal on the site (the map's popups, /publicaciones' mobile filters)
// runs on the platform's own <dialog>. The browser puts
// it in the top layer, so it clears the map chrome without a z-index to pick;
// makes the rest of the page inert, so focus is trapped and the background is
// hidden from assistive tech; handles Escape; and returns focus to the trigger
// on close. All of that used to be hand-rolled, once per popup. What the
// platform still doesn't give us is click-outside-to-dismiss and holding the
// page still behind the dialog, so that is what is left here.
export function DialogShell({
  onClose,
  labelledBy,
  className,
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  className: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Kept in a ref so the effect below can depend on nothing. Callers pass a
  // fresh arrow every render, and a dialog re-renders whenever a section
  // inside it opens; re-running the effect on that would return focus to the
  // trigger and then steal it back on every click.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    // Focus the dialog rather than letting the browser land on the first
    // control, so screen readers read the dialog's name before its buttons.
    dialog.focus();

    // A modal dialog sits above the page but doesn't stop it scrolling. The
    // padding stands in for the scrollbar that hiding the overflow removes,
    // so the page doesn't jump sideways underneath the scrim.
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      // Close before React unmounts the node: that is what hands focus back
      // to whatever opened the dialog.
      if (dialog.open) dialog.close();
    };
  }, []);

  // Click-outside, guarded twice. The target check ignores keyboard-driven
  // clicks on the controls inside, which report a (0, 0) pointer; the rect
  // check ignores the dialog's own padding; and requiring the press to have
  // started outside too means a selection dragged out of the dialog doesn't
  // dismiss it on release.
  const pressedOutside = useRef(false);
  const isOutside = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return false;
    const rect = event.currentTarget.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      // Escape fires cancel; routing it through onClose keeps React state the
      // single source of truth for whether the dialog is open.
      onCancel={(event) => {
        event.preventDefault();
        onCloseRef.current();
      }}
      onMouseDown={(event) => {
        pressedOutside.current = isOutside(event);
      }}
      onClick={(event) => {
        if (pressedOutside.current && isOutside(event)) onCloseRef.current();
      }}
      className={`info-dialog fixed inset-0 m-auto text-neutral-800 focus:outline-none ${className}`}
    >
      {children}
    </dialog>
  );
}

// The info popups: a titled sheet with the same header and scrolling body in
// every one of them. Passive dialogs, in the Carbon sense, they present
// information and ask for nothing, so there is no footer action.
export function InfoDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = `dialog-${useId().replace(/:/g, "")}`;

  return (
    <DialogShell
      onClose={onClose}
      labelledBy={titleId}
      /* Not glass. The map panels are chrome and float in the workspace; this
         surface carries paragraphs, and even at /90 the map's colour bled
         through enough to drop the neutral-500 body copy under 4.5:1. Opaque
         white on a visible stone-200 hairline; the scrim's blur does the
         "floating above the map" work on its own. */
      className="flex max-h-[85svh] w-[85%] max-w-md flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white p-8 shadow-xl"
    >
      {/* The header stays put and only the body scrolls: the X is now the
          only dismiss control on screen, and a dismiss control that scrolls
          out of reach is worse than none. Long content is exactly when you
          need it. */}
      <div className="flex flex-shrink-0 items-start justify-between gap-4 pb-6">
        <h2 id={titleId} className="text-base font-medium text-neutral-800">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          /* neutral-500, not neutral-400: with no footer button left, this icon is
             the only visible way out, and neutral-400 on white is 2.54:1 against
             the 3:1 WCAG asks of anything identifying a control. */
          className="-mr-2 -mt-1 flex-shrink-0 rounded-xl p-2 text-neutral-500 transition-colors hover:bg-stone-50 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* No footer action. These dialogs present information and ask for
          nothing, so a full-width primary button that only closes would
          invent a decision that isn't there, and read as a consent on a
          definition. The header X, Escape and clicking outside are the
          three ways out. */}
      {/* `grow basis-auto`, not `flex-1`. The UA stylesheet gives <dialog>
          `height: fit-content` and we only ever set a max-height, so this
          column's height is intrinsic, sized from its items' hypothetical
          heights. `flex-1` is `flex: 1 1 0%`, whose hypothetical height is
          zero, so the body contributes nothing to the dialog and can end up
          laid out at 0px, with the dialog's own overflow-hidden clipping the
          copy away: header visible, body blank, which is what iOS Safari did
          to the Recomendaciones popup. With `basis-auto` the base size is the
          content, so it cannot collapse; `min-h-0` and the default shrink
          still let it give way and scroll once the content passes 85svh. */}
      <div className="-mx-1 min-h-0 grow basis-auto overflow-y-auto overscroll-contain px-1">{children}</div>
    </DialogShell>
  );
}

