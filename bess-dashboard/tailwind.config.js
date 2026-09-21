/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],

  // Designsystemet i src/styles/design-system.css innehåller redan en komplett
  // reset och bastypografi. Tailwinds preflight skulle skriva över den.
  corePlugins: { preflight: false },

  // Mörkt läge styrs av data-theme på <html> (med systeminställning som fallback,
  // se design-system.css). `dark:`-utilities följer den explicita inställningen.
  darkMode: ['variant', ':is([data-theme="dark"] &)'],

  theme: {
    extend: {
      // Samma tokens som designsystemet — Tailwind och CSS:en är ett system,
      // inte två parallella paletter.
      colors: {
        surface: "var(--surface)",
        ground: "var(--ground)",
        sunken: "var(--sunken)",
        raised: "var(--raised)",

        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-faint": "var(--ink-faint)",

        hairline: "var(--hairline)",
        "hairline-stark": "var(--hairline-stark)",

        "one-bla": "var(--one-bla)",
        "one-djup": "var(--one-djup)",
        turkos: "var(--turkos)",
        duvbla: "var(--duvbla)",
        himmel: "var(--himmel)",
        rod: "var(--rod)",
        orange: "var(--orange)",
        morkgra: "var(--morkgra)",

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
        head: "var(--font-h)",
        body: "var(--font-b)",
      },
      borderRadius: {
        card: "var(--r)",
        sm: "var(--r-sm)",
      },
      boxShadow: {
        sm: "var(--sh-sm)",
        md: "var(--sh-md)",
        lift: "var(--sh-lift)",
      },
      transitionTimingFunction: {
        one: "var(--ease)",
      },
      spacing: {
        sidebar: "var(--sidebar-w)",
      },
    },
  },
  plugins: [],
};
