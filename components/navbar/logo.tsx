import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";

// The OCCAMM wordmark as a home link. One artwork, one focus ring, two sizes:
// `sm` for the compact mobile top bar, `lg` for the desktop SiteHeader (which
// also passes `-ml-0.5` to nudge the mark onto the header's text rail, see the
// comment there). The acerca page's logo is deliberately not this one: it
// links out to observatoriodelaire.com with its own hover treatment.
const SIZES = {
  sm: { width: 119, height: 22, className: "h-[22px] w-[119px]" },
  lg: { width: 140, height: 26, className: "h-[26px] w-[140px]" },
} as const;

export default function Logo({
  size = "sm",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const img = SIZES[size];
  return (
    <Link
      href="/"
      className={clsx(
        "rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15",
        className,
      )}
    >
      <Image
        src="/occamm-logo.png"
        alt="OCCAMM, Observatorio del Aire"
        width={img.width}
        height={img.height}
        priority
        // A thin wordmark shown ~119px wide: default q75 WebP smears the
        // strokes, and the source is sized (420w) so a higher quality costs
        // almost nothing.
        quality={90}
        className={img.className}
      />
    </Link>
  );
}
