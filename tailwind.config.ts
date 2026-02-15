import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: "1rem",
        '2xl': "1.5rem",
        full: "9999px"
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card': '0 0 0 1px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04)',
        'glow': '0 0 15px rgba(14, 165, 233, 0.3)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // 22 Design helper colors
        "primary-dark": "#E6C100",
        "sidebar-bg": "#050505",
        "sidebar-hover": "#1A1A1A",
        "accent-blue": "#3B82F6",

        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
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
        // 22 Design direct tokens
        "primary-22": "#FFD600",
        "secondary-22": "#050505",
        "background-light": "#FFFFFF",
        "background-dark": "#050505",
        "surface-light": "#FFFFFF",
        "surface-dark": "#111111",
        "brand-blue": "#3B82F6",

        // Legacy/Compatibility tokens (mapped to new palette where possible)
        "text-light": "#050505",
        "text-dark": "#FAFAFA",
        "muted-light": "#6B7280",
        "muted-dark": "#A3A3A3",
        "card-light": "#FFFFFF",
        "card-dark": "#111111",
        "text-secondary": "#6B7280",

        // 22 Electronic Palette
        brand: {
          black: {
            DEFAULT: '#000000', // Pure Black
            rich: '#0A0A0A',    // Rich Black
            soft: '#111111',    // Soft Black (Modals)
            elevated: '#171717', // Elevated (Cards)
            surface: '#1A1A1A', // Card Surface
          },
          white: {
            DEFAULT: '#FFFFFF', // Pure White
            off: '#F5F5F5',     // Off White
            hover: '#EDEDED',   // Hover/Light Gray
          },
          gray: {
            950: '#171717',
            900: '#1A1A1A',
            800: '#262626',
            700: '#3A3A3A',
            600: '#525252',
            500: '#6B6B6B',
            400: '#8A8A8A',
            300: '#A3A3A3',
            200: '#D4D4D4',
            100: '#EDEDED',
            50: '#F5F5F5',
            123: '#F5F5F5',
          },
          gold: {
            DEFAULT: '#DBC095',
            light: '#E8D4B0',
            dark: '#C4A676',
          },
          green: {
            deep: '#062C21',
            mid: '#0D3D2E',
          },
          semantic: {
            danger: '#E8453C',
            success: '#2ECC71',
            warning: '#F39C12',
          },
        },
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
