/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: {
          DEFAULT: token('surface'),
          2: token('surface-2'),
          3: token('surface-3'),
        },
        line: {
          DEFAULT: token('line'),
          strong: token('line-strong'),
        },
        ink: {
          DEFAULT: token('ink'),
          2: token('ink-2'),
          3: token('ink-3'),
        },
        primary: {
          DEFAULT: token('primary'),
          hover: token('primary-hover'),
          fg: token('primary-fg'),
          soft: token('primary-soft'),
        },
        accent: {
          DEFAULT: token('accent'),
          soft: token('accent-soft'),
          ink: token('accent-ink'),
        },
        link: token('link'),
        success: { DEFAULT: token('success'), soft: token('success-soft') },
        warning: { DEFAULT: token('warning'), soft: token('warning-soft') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
        info: { DEFAULT: token('info'), soft: token('info-soft') },
        viz: {
          1: token('viz-1'),
          2: token('viz-2'),
          3: token('viz-3'),
          strong: token('viz-strong'),
          lean: token('viz-lean'),
          neutral: token('viz-neutral'),
          against: token('viz-against'),
          muted: token('viz-muted'),
          track: token('viz-track'),
          grid: token('viz-grid'),
        },
        navy: {
          50: '#eef3fa',
          100: '#d7e2f2',
          200: '#adc3e3',
          300: '#7c9dcd',
          400: '#4d75b1',
          500: '#2c5594',
          600: '#1d3f75',
          700: '#163260',
          800: '#10264a',
          900: '#0b1b36',
          950: '#071226',
        },
        gold: {
          50: '#fdf8e8',
          100: '#f9edc4',
          200: '#f2db8a',
          300: '#e9c55a',
          400: '#ddb13a',
          500: '#c9971f',
          600: '#a87a15',
          700: '#855e13',
          800: '#6b4b15',
          900: '#5a3f16',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(var(--shadow) / 0.06)',
        card: '0 1px 2px 0 rgb(var(--shadow) / 0.05), 0 1px 3px 0 rgb(var(--shadow) / 0.06)',
        lift: '0 4px 10px -2px rgb(var(--shadow) / 0.08), 0 12px 32px -8px rgb(var(--shadow) / 0.14)',
        pop: '0 20px 48px -12px rgb(var(--shadow) / 0.28)',
        ring: '0 0 0 4px rgb(var(--ring) / 0.18)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
      maxWidth: {
        '8xl': '88rem',
      },
    },
  },
  plugins: [],
};
