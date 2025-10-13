const tailwindConfig = require("./tailwind.config.cjs");
const tailwindcssPostcss = require("@tailwindcss/postcss");

module.exports = {
  plugins: [
    tailwindcssPostcss({ config: tailwindConfig }),
    require("autoprefixer"),
  ],
};
