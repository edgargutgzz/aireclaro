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
    },
  },
};

export default config;
