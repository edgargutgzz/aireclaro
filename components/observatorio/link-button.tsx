import Link from "next/link";
import { SquareArrowOutUpRight, Youtube } from "lucide-react";

// The Observatory site's secondary button (gray-100 fill) as a link, built to
// the style guide's secondary-button recipe and house focus ring. External
// hrefs open in a new tab (announced to screen readers); `video` swaps the
// trailing arrow for a leading YouTube glyph.
export type LinkButtonProps = { href: string; label: string; video?: boolean };

export default function LinkButton({ href, label, video }: LinkButtonProps) {
  const external = href.startsWith("http");
  return (
    <Link
      href={href}
      className="flex items-center rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {video && <Youtube className="mr-2 h-4 w-4 text-red-500" aria-hidden />}
      {label}
      {!video && <SquareArrowOutUpRight className="ml-2 h-4 w-4" aria-hidden />}
      {external && <span className="sr-only"> (abre en una nueva pestaña)</span>}
    </Link>
  );
}
