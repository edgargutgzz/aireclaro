import type { Config } from "tailwindcss";

const config: Config = {
  // The app is light-only (see .ai-style-guide.md §3) -- no `.dark` class is
  // ever put on the tree, so this setting is inert either way. Left as
  // "class" rather than switched to Tailwind's default ("media") on
  // principle: nothing should start following the OS theme by surprise if a
  // `dark:` variant is ever typed by mistake.
  darkMode: "class",
  content: ["./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      width: {
        // Floating map-overlay panel widths — named so they read as
        // intentional design decisions instead of one-off magic numbers.
        "panel-md": "340px",
        "panel-filters": "380px",
        "panel-lg": "460px",
      },
      // House CSS-variable tokens (app/globals.css). Was shadcn/ui's full
      // token bridge (~20 colors); trimmed 2026-09-19 when shadcn was
      // removed project-wide down to the three still actually consumed --
      // see the comment in globals.css for what got cut and why.
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      borderRadius: {
        // Anchored to --radius (0.75rem / 12px = the house button radius,
        // .ai-style-guide.md §5). Bigger surfaces still reach for the literal
        // rounded-2xl / rounded-3xl from the scale.
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
};

export default config;
