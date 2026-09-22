/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // GUVI Brand Colors
        guvi: {
          orange: '#FF6B35',
          dark: '#1A1A2E',
          yellow: '#FFC857',
          cream: '#FFF8E7',
          light: '#F5F5F5',
          success: '#00C853',
          error: '#FF3D00',
          warning: '#FFAB00',
        },
        // Fallback colors
        ink: '#1A1A2E',
        paper: '#FFF8E7',
        coral: '#FF6B35',
        mint: '#00C853',
        navy: '#1A1A2E',
      },
      fontFamily: { display: ['"Space Grotesk"', 'sans-serif'], body: ['"DM Sans"', 'sans-serif'] },
      boxShadow: { soft: '0 18px 50px rgba(26, 26, 46, .08)' },
    },
  },
  plugins: [],
}
