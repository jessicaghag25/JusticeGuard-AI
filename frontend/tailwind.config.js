/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brandRed: '#e03a3e',
        brandBlue: '#1f4f97'
      }
    }
  },
  plugins: []
};
