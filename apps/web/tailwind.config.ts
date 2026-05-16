import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // Brand palette — violet-indigo
        brand: {
          50: 'hsl(var(--brand-50))',
          100: 'hsl(var(--brand-100))',
          200: 'hsl(var(--brand-200))',
          300: 'hsl(var(--brand-300))',
          400: 'hsl(var(--brand-400))',
          500: 'hsl(var(--brand-500))',
          600: 'hsl(var(--brand-600))',
          700: 'hsl(var(--brand-700))',
          800: 'hsl(var(--brand-800))',
          900: 'hsl(var(--brand-900))',
          950: 'hsl(var(--brand-950))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'soft-sm': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        soft: '0 4px 12px 0 rgb(0 0 0 / 0.06), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
        'soft-md': '0 8px 24px 0 rgb(0 0 0 / 0.08), 0 4px 8px -2px rgb(0 0 0 / 0.04)',
        'soft-lg': '0 16px 48px 0 rgb(0 0 0 / 0.10), 0 8px 16px -4px rgb(0 0 0 / 0.06)',
        'soft-xl': '0 24px 64px 0 rgb(0 0 0 / 0.12), 0 12px 24px -6px rgb(0 0 0 / 0.08)',
        brand: '0 4px 24px 0 hsl(258 90% 56% / 0.18), 0 1px 4px 0 hsl(258 90% 56% / 0.12)',
        'brand-lg': '0 8px 40px 0 hsl(258 90% 56% / 0.25), 0 2px 8px 0 hsl(258 90% 56% / 0.15)',
        glass: '0 8px 32px 0 rgb(0 0 0 / 0.06), inset 0 1px 0 0 rgb(255 255 255 / 0.6)',
        'glass-dark': '0 8px 32px 0 rgb(0 0 0 / 0.24), inset 0 1px 0 0 rgb(255 255 255 / 0.05)',
      },
      backdropBlur: {
        xs: '4px',
        '3xl': '60px',
        '4xl': '80px',
      },
      animation: {
        shimmer: 'shimmer 1.5s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        'gradient-shift': 'gradient-shift 4s ease infinite',
        'badge-ping': 'badge-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-in': 'fade-in 0.22s ease-out forwards',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        draw: 'draw 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'badge-ping': {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        draw: {
          from: { strokeDashoffset: '1' },
          to: { strokeDashoffset: '0' },
        },
      },
      transitionTimingFunction: {
        expressive: 'cubic-bezier(0.16, 1, 0.3, 1)',
        standard: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        quick: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        instant: '100ms',
        quick: '150ms',
        standard: '220ms',
        smooth: '350ms',
        slow: '500ms',
      },
    },
  },
  plugins: [],
};

export default config;
