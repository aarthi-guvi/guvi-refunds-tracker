/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#18202b', paper: '#f7f5ef', coral: '#ec6b4f', mint: '#a7d9c5', navy: '#243447' },
      fontFamily: { display: ['"Space Grotesk"', 'sans-serif'], body: ['"DM Sans"', 'sans-serif'] },
      boxShadow: { soft: '0 18px 50px rgba(36, 52, 71, .08)' },
    },
  },
  plugins: [],
}
