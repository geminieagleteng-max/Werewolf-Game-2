/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
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
