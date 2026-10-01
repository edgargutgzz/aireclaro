// The downloadable días insalubres image comes in one size per destination,
// rendered by app/api/og/dias-insalubres (no download UI on the page for
// now). The image is laid out at a 1080-wide design scale; each format scales
// it to its own width and adds its own top/bottom padding (design units) and
// its own scale on the central stat block, since a phone-screen story needs bigger type than a chat square.
export type ShareFormat = "whatsapp" | "instagram-post" | "instagram-story" | "facebook-post";

export interface ShareFormatSpec {
  width: number;
  height: number;
  padTop: number;
  padBottom: number;
  /** Extra scale on the central stat block (number + headline), so taller
   *  formats fill their canvas instead of leaving it mostly empty. */
  content: number;
  /** Scale on the brand frame (logo + footer). >1 where the image fills a
   *  phone screen and the default frame reads as fine print. */
  chrome: number;
  /** Source and URL on separate lines, where the scaled-up footer no
   *  longer fits side by side. */
  stackFooter?: boolean;
}

export const SHARE_FORMATS: Record<ShareFormat, ShareFormatSpec> = {
  // WhatsApp's standard-quality photo send caps the long edge at 1600px, so
  // this is the largest square it passes through without resizing. Square
  // shows uncropped in the chat.
  whatsapp: { width: 1600, height: 1600, padTop: 72, padBottom: 72, content: 1.1, chrome: 1 },
  // Instagram's feed portrait (4:5). The profile grid's 3:4 thumbnail trims
  // ~34px off each side, inside the 80px side padding. content 1.2 is the
  // most before the one-line headline wraps.
  "instagram-post": { width: 1080, height: 1350, padTop: 72, padBottom: 72, content: 1.2, chrome: 1 },
  // Stories (9:16), seen full-screen on a phone: bigger stat, bigger brand
  // frame, footer stacked. Instagram's own UI
  // covers roughly the top and bottom ~250px, so logo and footer sit inside
  // that safe zone.
  "instagram-story": {
    width: 1080,
    height: 1920,
    padTop: 250,
    padBottom: 250,
    content: 1.7,
    chrome: 1.4,
    stackFooter: true,
  },
  // Facebook feed photo post, portrait 4:5 (the tallest the feed shows
  // uncropped). Facebook keeps photos up to ~2048px on the long edge, so
  // this goes higher-res than Instagram.
  "facebook-post": { width: 1600, height: 2000, padTop: 72, padBottom: 72, content: 1.2, chrome: 1 },
};

export function isShareFormat(value: string | null): value is ShareFormat {
  return value !== null && value in SHARE_FORMATS;
}
