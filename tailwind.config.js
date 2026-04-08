/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        'sds-8': '8px',
      },
      fontFamily: {
        sans: ['Outfit', 'Segoe UI', 'SF Pro', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
