/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Maps existing indigo classes to Slate
        indigo: colors.slate,
        // Official theme palette for Dark Mode graphite surfaces (Direction A)
        gunmetal: {
          nav: '#0f0f11',
          canvas: '#1c1c1e',
          card: '#0f0f11',
          border: '#2d2d31',
          muted: '#9aa0a6',
        },
      },
      fontFamily: {
        // Overrides the default font with a terminal/mono stack
        sans: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
      }
    },
  },
  plugins: [],
}