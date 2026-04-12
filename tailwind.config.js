/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#f7f8fa',
          100: '#eef0f4',
          200: '#d5dae2',
          300: '#b0b9c7',
          400: '#8593a7',
          500: '#65758c',
          600: '#505d73',
          700: '#3a4353',
          800: '#252a35',
          900: '#1a1e27',
          950: '#0d0f14',
        },
        accent: {
          DEFAULT: '#00d4aa',
          hover: '#00e4b8',
          muted: 'rgba(0, 212, 170, 0.12)',
          light: '#34ebc6',
        },
        gold: {
          DEFAULT: '#f0b429',
          light: '#ffd066',
          muted: 'rgba(240, 180, 41, 0.12)',
        },
        danger: '#ef4444',
        success: '#22c55e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '4.5xl': ['2.5rem', { lineHeight: '1.15' }],
        '5.5xl': ['3.5rem', { lineHeight: '1.1' }],
        '6.5xl': ['4rem', { lineHeight: '1.05' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'glow': 'glow 3s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(0, 212, 170, 0.15)' },
          '100%': { boxShadow: '0 0 60px rgba(0, 212, 170, 0.25)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': 'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '60px 60px',
      },
      boxShadow: {
        'glow': '0 0 40px rgba(0, 212, 170, 0.12)',
        'glow-lg': '0 0 80px rgba(0, 212, 170, 0.18)',
        'glow-sm': '0 0 20px rgba(0, 212, 170, 0.08)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
