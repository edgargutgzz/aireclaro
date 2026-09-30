// The downloadable días insalubres image comes in one size per destination,
// picked from the chart's download menu (components/datos/download-image-menu.tsx)
// and rendered by app/api/og/dias-insalubres. The card is laid out at a
// 1080-wide design scale; each format scales it to its own width and adds its
// own top/bottom padding (design units) and its own scale on the central stat
// block, since a phone-screen story needs bigger type than a chat square.
export type ShareFormat = "whatsapp" | "instagram-post" | "instagram-story";

export interface ShareFormatSpec {
  width: number;
  height: number;
  padTop: number;
  padBottom: number;
  /** Extra scale on the central stat block (number + headline), so taller
   *  formats fill their canvas instead of leaving it mostly empty. */
  content: number;
  /** Break the headline into two set lines ("días sobre la norma" / "de
   *  PM2.5 en 2026") where the scaled-up type would otherwise wrap and
   *  strand the year alone on a line. */
  splitHeadline?: boolean;
}

export const SHARE_FORMATS: Record<ShareFormat, ShareFormatSpec> = {
  // WhatsApp's standard-quality photo send caps the long edge at 1600px, so
  // this is the largest square it passes through without resizing. Square
  // shows uncropped in the chat.
  whatsapp: { width: 1600, height: 1600, padTop: 72, padBottom: 72, content: 1 },
  // Instagram's feed portrait (4:5). The profile grid's 3:4 thumbnail trims
  // ~34px off each side, inside the 80px side padding.
  "instagram-post": { width: 1080, height: 1350, padTop: 72, padBottom: 72, content: 1.1 },
  // Stories (9:16). Instagram's own UI covers roughly the top and bottom
  // ~250px, so the logo and footer sit inside that safe zone.
  "instagram-story": { width: 1080, height: 1920, padTop: 250, padBottom: 250, content: 1.4, splitHeadline: true },
};

export function isShareFormat(value: string | null): value is ShareFormat {
  return value !== null && value in SHARE_FORMATS;
}
