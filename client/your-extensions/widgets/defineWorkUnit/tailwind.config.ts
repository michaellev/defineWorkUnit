/**
 * tailwind.config.js
 * קונפיגורציית Tailwind עבור הווידג'ט
 * 
 * חשוב:
 * - prefix מונע התנגשות עם ESRI classes
 * - preflight: false מונע שבירת סגנונות EXB
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  // קידומת למניעת התנגשויות עם ESRI/EXB
  prefix: 'tw-',

  // ביטול ה-CSS reset של Tailwind (קריטי ל-EXB)
  corePlugins: {
    preflight: false,
  },

  // קבצים לסריקה
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      // צבעים מותאמים לפרויקט
      colors: {
        'kkl-green': '#2e7d32',
        'kkl-blue': '#0079c1',
        'esri-blue': '#0079c1',
      },
    },
  },

  plugins: [],
};
