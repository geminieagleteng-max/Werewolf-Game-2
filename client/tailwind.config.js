/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cinzel', 'Georgia', 'serif'],
        display: ['"Cinzel Decorative"', 'Cinzel', 'serif'],
        sans: ['"Noto Sans TC"', 'Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        werewolf: {
          dark: '#0b0d14',
          card: '#131726',
          blood: '#dc2626',
          gold: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
