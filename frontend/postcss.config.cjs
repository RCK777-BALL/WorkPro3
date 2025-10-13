const tailwindConfig = require("./tailwind.config.cjs");

module.exports = {
  plugins: [
    require("tailwindcss")({ config: tailwindConfig }),
    require("autoprefixer"),
  ],
};
