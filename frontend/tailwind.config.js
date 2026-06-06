/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        surface: {
          DEFAULT: '#070b14',
          card: '#0d1321',
          elevated: '#131b2e',
          border: '#1e293b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(59, 130, 246, 0.45)',
        'glow-sm': '0 0 24px -6px rgba(59, 130, 246, 0.35)',
        card: '0 8px 32px -8px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37, 99, 235, 0.25), transparent)',
        'mesh-gradient': 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, transparent 50%, rgba(59,130,246,0.05) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
