/**
 * PostCSS configuration.
 *
 * Tailwind v4 no longer uses a tailwind.config.js. The theme is defined in
 * app/globals.css with @theme inline, which maps the design tokens straight
 * onto Tailwind utilities. This file is the only PostCSS plugin needed.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;