import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      width: {
        // Floating map-overlay panel widths — named so they read as
        // intentional design decisions instead of one-off magic numbers.
        'panel-sm': '310px',
        'panel-lg': '460px',
      },
    },
  },
  plugins: [],
}

export default config
