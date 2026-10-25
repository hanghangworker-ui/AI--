/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef4ff', 100: '#dbe6fe', 200: '#bfd2fe', 300: '#93b4fd',
          400: '#6090fa', 500: '#3b6df6', 600: '#2551e8', 700: '#1d40d0',
          800: '#1d38a8', 900: '#1b3285', 950: '#141f4f',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,64,.06), 0 8px 24px rgba(16,24,64,.08)',
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
    },
    },
  },
  plugins: [],
}
