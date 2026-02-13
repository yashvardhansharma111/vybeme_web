const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Convert oklab/oklch (from Tailwind v4) to rgb so Turbopack/Lightning CSS can parse
    "@csstools/postcss-oklab-function": {},
  },
};

export default config;
