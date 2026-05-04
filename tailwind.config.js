/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f172a', // slate-900 (corporate elegant dark)
          dark: '#020617', // slate-950
          light: '#1e293b', // slate-800
        },
        secondary: {
          DEFAULT: '#b91c1c', // red-700 (corporate red)
          dark: '#991b1b', // red-800
        },
        accent: {
          DEFAULT: '#eab308', // yellow-500 (gold)
          dark: '#ca8a04', // yellow-600
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
