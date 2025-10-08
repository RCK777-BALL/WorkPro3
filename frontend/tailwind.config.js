/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#001f3f',
          light: '#405173',
          dark: '#000a1a'
        },
        accent: '#4f6d7a'
      },
      boxShadow: {
        navy: '0 4px 6px -1px rgba(0, 31, 63, 0.1), 0 2px 4px -2px rgba(0, 31, 63, 0.05)',
        'navy-md': '0 8px 12px -3px rgba(0, 31, 63, 0.2), 0 4px 6px -4px rgba(0, 31, 63, 0.1)',
        'navy-lg': '0 20px 25px -5px rgba(0, 31, 63, 0.25), 0 10px 10px -5px rgba(0, 31, 63, 0.1)'
      },
      blur: {
        xs: '2px'
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px'
      }
    }
  },
  plugins: []
};
