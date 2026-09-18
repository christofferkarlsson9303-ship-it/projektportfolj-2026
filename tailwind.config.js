/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: "var(--ground)",
        surface: "var(--surface)",
        sunken: "var(--sunken)",
        djup: "var(--djup)",

        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-faint": "var(--ink-faint)",

        hairline: "var(--hairline)",
        "hairline-stark": "var(--hairline-stark)",

        one: "var(--one)",
        "one-bla": "var(--one-bla)",
        "one-djup": "var(--one-djup)",
        "one-mork": "var(--one-mork)",
        "one-ring": "var(--one-ring)",

        turkos: "var(--turkos)",
        orange: "var(--orange)",
        rod: "var(--rod)",
        himmel: "var(--himmel)",

        "ok-bg": "var(--ok-bg)",
        "ok-ink": "var(--ok-ink)",
        "warn-bg": "var(--warn-bg)",
        "warn-ink": "var(--warn-ink)",
        "bad-bg": "var(--bad-bg)",
        "bad-ink": "var(--bad-ink)",
        "info-bg": "var(--info-bg)",
        "info-ink": "var(--info-ink)",
      },
      fontFamily: {
        head: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        body: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "sans-serif"],
      },
    },
  },
  plugins: [],
}
