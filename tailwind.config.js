/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Lexend', 'sans-serif'],
        sans: ['Source Sans 3', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        ua: {
          blue: {
            DEFAULT: '#003876', // UA Official Deep Blue
            dark: '#002244',    // UA Midnight Blue
            navy: '#0A1E3F',
            light: '#0D5CA8',   // UA Royal Accent
            50: '#F0F5FC',
            100: '#E0ECF9',
            200: '#BDD7F2',
            500: '#003876',
            600: '#002E62',
            700: '#00244E',
          },
          red: {
            DEFAULT: '#B71C1C', // UA Cardinal Fire Red
            dark: '#8B0000',
            light: '#D32F2F',
            50: '#FDF2F2',
          },
          gold: {
            DEFAULT: '#EAA023', // UA Official Warm Gold
            light: '#F7C356',
            dark: '#C8820B',
            50: '#FEF9EE',
          },
          bg: '#F4F7FC',
        }
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(0, 45, 98, 0.08), 0 1px 3px -1px rgba(0, 45, 98, 0.05)',
        'card-hover': '0 12px 28px -6px rgba(0, 45, 98, 0.16), 0 8px 12px -4px rgba(0, 45, 98, 0.08)',
        'glow-blue': '0 0 25px -4px rgba(0, 56, 118, 0.35)',
        'glow-gold': '0 0 25px -4px rgba(234, 160, 35, 0.45)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
