/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cormorant Garamond', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        'romantic-pink': '#E8A0A0',
        'romantic-purple': '#C9B8D8',
        'romantic-dark': '#3D2B3D',
        'rose': {
          50: '#FFF0F3',
          100: '#FAD0DC',
          200: '#F5B0C0',
          300: '#E8A0A0',
          400: '#D48080',
        },
        'lavender': {
          50: '#F3EEF7',
          100: '#C9B8D8',
          200: '#B8A0C8',
        },
        'sky': {
          50: '#F0F4FC',
          100: '#D5E2F8',
          200: '#B0C8F0',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
