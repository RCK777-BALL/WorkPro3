/** PostCSS config for Tailwind v4+ */
module.exports = {
  plugins: {
    // Tailwind’s PostCSS plugin moved here in v4
    '@tailwindcss/postcss': {},
    // Keep autoprefixer (safe in both v3/v4)
    autoprefixer: {},
  },
};
