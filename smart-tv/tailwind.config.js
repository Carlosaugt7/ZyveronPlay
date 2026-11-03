/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zyveron: {
          bg: '#0a0d14',
          card: '#121722',
          surface: '#1b2234',
          border: '#2a3449',
          primary: '#10b981',
          primaryHover: '#059669',
          accent: '#38bdf8',
          textMuted: '#94a3b8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
