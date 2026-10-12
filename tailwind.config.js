/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-cairo)', 'var(--font-inter)', 'sans-serif'],
        arabic: ['var(--font-cairo)', 'sans-serif'],
        latin: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        // ITQAN Brand Colors
        brand: {
          50:  '#f0f7f5',
          100: '#dbeeec',
          200: '#badfd9',
          300: '#8dc8be',
          400: '#5ba99d',
          500: '#348a7e',
          600: '#075B4A', // Core Deep Islamic Green
          700: '#064c3e',
          800: '#053d32',
          900: '#043229',
          950: '#021c17',
        },
        gold: {
          50:  '#fbf9f2',
          100: '#f6f0df',
          200: '#ece0c0',
          300: '#dec796',
          400: '#d3b174',
          500: '#C6A66B', // Core Elegant Gold
          600: '#b08e50',
          700: '#8c6f3d',
          800: '#6f5732',
          900: '#5b472c',
        },
        cream: {
          50: '#fdfcf9',
          100: '#FAF8F2', // Warm Cream background
          200: '#f4efe2',
          300: '#eae0cc',
        },
        charcoal: {
          800: '#26332F', // Deep Charcoal text
          900: '#1b2421',
          950: '#121816',
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
}
