/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Fraunces", "serif"],
        "heading-italic": ["Fraunces-Italic", "serif"],
        body: ["Inter", "sans-serif"],
        "body-italic": ["Inter-Italic", "sans-serif"],
      },
    },
  },
  plugins: [],
};
