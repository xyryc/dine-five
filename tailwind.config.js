/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        heading: ["PlusJakartaSans-Bold", "sans-serif"],
        "heading-semibold": ["PlusJakartaSans-SemiBold", "sans-serif"],
        "heading-medium": ["PlusJakartaSans-Medium", "sans-serif"],
        "heading-light": ["PlusJakartaSans-Light", "sans-serif"],
        body: ["InstrumentSans-Regular", "sans-serif"],
        "body-medium": ["InstrumentSans-Medium", "sans-serif"],
        "body-semibold": ["InstrumentSans-SemiBold", "sans-serif"],
        "body-bold": ["InstrumentSans-Bold", "sans-serif"],
      },
    },
  },
  plugins: [],
};
