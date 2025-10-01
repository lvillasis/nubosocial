/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{ts,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: "#0d1117",
        primary: '#7c3aed',
        card: '#0f1724',
        muted: '#9aa4b2'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'gradient-x': 'gradient-x 8s ease infinite',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
      },
      boxShadow: {
        'card': '0 10px 30px rgba(2,6,23,0.6)'
      }
    },
  },
  plugins: [],
};
