import Navlinks from "@/components/navbar/navlinks";
import Logo from "@/components/navbar/logo";

// Same org as observatoriodelaire.com (shared logo), but the nav itself
// follows Aire Claro's own visual language — the same icon+label pill
// links used in the mobile bottom bar, not the reference site's plain
// text links. Desktop only - mobile keeps its own bottom nav bar.
export default function SiteHeader() {
  return (
    <header className="hidden h-header items-center bg-stone-50 md:flex">
      {/* Full bleed rather than a centred max-w container. Everything below
          this bar is laid out against the viewport, so a boxed header left the
          logo around 100px inside the app's own left edge on a wide screen.

          The padding is asymmetric on purpose, because the page has two rails
          and the two sides of this bar sit on different ones. Panels put their
          *surface* at 24px (left-6 / right-6) and their *text* 20px further in,
          at 44px: "Capas", "Monterrey: Obispado". On the right the nav already
          lands on the text rail, since the last pill's own px-5 insets its
          label to 24 + 20. The logo is bare artwork with no surface and no
          padding of its own, so at px-6 it sat alone on the 24px rail, 20px
          left of every piece of text on the page and visibly outdented against
          "Capas" directly below it. pl-11 puts it on the text rail, which also
          makes the bar's two optical insets match at 44px.

          The logo then takes a 2px overshoot on top of that rail. Measured, the
          two sides already agree: the logo's ink starts at 43.8px and "Mapa"
          ends at 45.4px, the same inset "Capas" reads at. But the logo leads
          with a round mark ~26px across, and a circle sitting exactly on a rail
          reads as pulled inward, the way a round glyph does against a flat
          stem. -ml-0.5 lands the badge's tangent at 42px so its optical centre
          reads at 44. Artwork on a rail gets the overshoot; text sits on the
          rail exactly. */}
      <div className="flex w-full items-center justify-between pl-11 pr-6">
        <Logo size="lg" className="-ml-0.5" />
        <nav aria-label="Principal">
          <ul className="flex items-center gap-2">
            <Navlinks />
          </ul>
        </nav>
      </div>
    </header>
  );
}
