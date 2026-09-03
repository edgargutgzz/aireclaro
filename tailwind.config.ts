import type { Config } from "tailwindcss"

const config: Config = {
  // The app is light-only (see .ai-style-guide.md §3). `darkMode: "class"` is
  // set so shadcn component source that carries `dark:` variants stays inert
  // rather than erroring — no `.dark` class is ever put on the tree.
  darkMode: ["class"],
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      width: {
        // Floating map-overlay panel widths — named so they read as
        // intentional design decisions instead of one-off magic numbers.
        'panel-md': '340px',
        'panel-filters': '380px',
        'panel-lg': '460px',
      },
      // shadcn/ui token bridge. The channel values live in app/globals.css as
      // `--background: <h s l>` triplets; these map them onto Tailwind colour
      // utilities (`bg-background`, `text-muted-foreground`, `border-border`…).
      // The palette is tuned to the house language — warm grays, blue-600
      // primary — not shadcn's stock stone. The air-quality scale is NOT here;
      // it stays in lib/air-quality.ts.
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        // Anchored to --radius (0.75rem / 12px = the house button radius,
        // .ai-style-guide.md §5). Bigger surfaces still reach for the literal
        // rounded-2xl / rounded-3xl from the scale.
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
