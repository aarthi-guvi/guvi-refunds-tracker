/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // GUVI Brand Colors
        guvi: {
          green: '#00A651',       // Primary green
          lightGreen: '#4CAF50',   // Light green accent
          dark: '#0A0F14',         // Dark text
          border: '#E4E8EC',       // Neutral/borders
          background: '#FFFFFF',   // White background
          success: '#00A651',     // Success (same as primary)
          error: '#FF3D00',       // Error red
          warning: '#FFAB00',     // Warning amber
        },
        // Fallback colors
        ink: '#0A0F14',
        paper: '#FFFFFF',
        coral: '#00A651',
        mint: '#4CAF50',
        navy: '#0A0F14',
      },
      fontFamily: { display: ['"Space Grotesk"', 'sans-serif'], body: ['"DM Sans"', 'sans-serif'] },
      boxShadow: { soft: '0 18px 50px rgba(10, 15, 20, .08)' },
    },
  },
  plugins: [],
}
