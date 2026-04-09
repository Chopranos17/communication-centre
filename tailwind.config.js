/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          10: '#F5FAFF',
          20: '#F0F8FF',
          50: '#E6F3FF',
          100: '#CCE6FF',
          500: '#0183FF',
          600: '#0169CC',
          700: '#014F99',
        },
        neutral: {
          900: '#131313',
          800: '#292929',
          600: '#4d4d4d',
          400: '#aaaaaa',
          200: '#e0e0e0',
          100: '#f5f5f5',
        },
        success: '#1a7f4b',
        warning: '#b45309',
        error: '#d32f2f',
        info: '#0183FF',
      },
      borderRadius: {
        'sds-2': '2px',
        'sds-4': '4px',
        'sds-6': '6px',
        'sds-8': '8px',
        'sds-12': '12px',
        'sds-16': '16px',
        'sds-24': '24px',
      },
      boxShadow: {
        'sds-1': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'sds-2': '0 4px 12px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
        'sds-3': '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        'sds-dropdown': '0 4px 16px rgba(0,0,0,0.12)',
      },
      fontFamily: {
        sans: ['Outfit', 'Segoe UI', 'SF Pro', 'Roboto', 'sans-serif'],
        darwin: ['Darwin Sans', 'system-ui', 'sans-serif'],
      },
      screens: {
        sm: '320px',
        md: '721px',
        lg: '1025px',
        xl: '1441px',
      },
      keyframes: {
        fadeSlideIn: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeSlideIn: 'fadeSlideIn 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
}
