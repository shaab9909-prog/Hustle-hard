/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        orbitron: ['Orbitron', 'sans-serif'],
        playfair: ['"Playfair Display"', 'serif'],
        syne: ['Syne', 'sans-serif'],
      },
      colors: {
        zenith: {
          950: '#07080c',
          900: '#0e1118',
          850: '#141824',
          800: '#1c2233',
          700: '#2c354e',
          glow: '#38bdf8',
        }
      }
    },
  },
  plugins: [],
}
