/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // GUVI Brand Colors (based on actual website)
        guvi: {
          orange: '#FF6B00',      // Primary brand orange
          dark: '#0D47A1',        // GUVI dark blue
          yellow: '#FFC107',      // Accent yellow
          cream: '#FFFFFF',       // White background
          light: '#F5F5F5',       // Light gray
          success: '#00C853',     // Success green
          error: '#FF3D00',       // Error red
          warning: '#FFAB00',     // Warning amber
        },
        // Fallback colors
        ink: '#0D47A1',
        paper: '#FFFFFF',
        coral: '#FF6B00',
        mint: '#00C853',
        navy: '#0D47A1',
      },
      fontFamily: { display: ['"Space Grotesk"', 'sans-serif'], body: ['"DM Sans"', 'sans-serif'] },
      boxShadow: { soft: '0 18px 50px rgba(13, 71, 161, .08)' },
    },
  },
  plugins: [],
}
