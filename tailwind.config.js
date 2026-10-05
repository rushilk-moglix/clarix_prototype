/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      // Warm paper greys and Clarix violet, so every utility class follows the new palette.
      colors: {
        gray: { 50: '#faf8f4', 100: '#f4f2ec', 200: '#e3dfd5', 300: '#d2ccbf', 400: '#a8a094', 500: '#7d756a', 600: '#5e5850', 700: '#4a4540', 800: '#29241f', 900: '#1c1a17', 950: '#11100f' },
        slate: { 50: '#faf8f4', 100: '#f4f2ec', 200: '#e3dfd5', 300: '#d2ccbf', 400: '#a8a094', 500: '#7d756a', 600: '#5e5850', 700: '#4a4540', 800: '#29241f', 900: '#1c1a17', 950: '#11100f' },
        indigo: { 50: '#f1f0fb', 100: '#e4e2f7', 200: '#c9c5ef', 300: '#a39de3', 400: '#7e76d4', 500: '#5a51c0', 600: '#3d33a0', 700: '#322a86', 800: '#28226b', 900: '#1f1a52', 950: '#130f33' },
        primary: { 50: '#f1f0fb', 100: '#e4e2f7', 200: '#c9c5ef', 300: '#a39de3', 400: '#7e76d4', 500: '#5a51c0', 600: '#3d33a0', 700: '#322a86', 800: '#28226b', 900: '#1f1a52', 950: '#130f33' },
      },
      fontFamily: {
        'sans': ['Archivo', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['IBM Plex Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}