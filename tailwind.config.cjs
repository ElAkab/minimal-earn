// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./pages/**/*.html",
    "./src/**/*.{js,ts}",
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('flowbite/plugin')
  ],
}