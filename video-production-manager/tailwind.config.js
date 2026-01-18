/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme colors using CSS custom properties for light/dark mode support
        'av-bg': 'rgb(var(--color-bg) / <alpha-value>)',
        'av-surface': 'rgb(var(--color-surface) / <alpha-value>)',
        'av-surface-light': 'rgb(var(--color-surface-light) / <alpha-value>)',
        'av-border': 'rgb(var(--color-border) / <alpha-value>)',
        'av-text': 'rgb(var(--color-text) / <alpha-value>)',
        'av-text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
        'av-accent': 'rgb(var(--accent-color-rgb) / <alpha-value>)',
        'av-accent-dim': 'rgb(var(--accent-dim-rgb) / <alpha-value>)',
        'av-warning': '#ffb347',
        'av-danger': '#ff6b6b',
        'av-info': '#4dabf7',
        'av-purple': '#a78bfa',
        'av-cyan': '#22d3ee',
        'signal-sdi': '#00ff88',
        'signal-hdmi': '#4dabf7',
        'signal-dp': '#a78bfa',
        'signal-fiber': '#ff6b6b',
      },
      fontFamily: {
        'display': ['JetBrains Mono', 'monospace'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(42, 53, 68, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(42, 53, 68, 0.5) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
      },
      backgroundSize: {
        'grid': '20px 20px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'signal-flow': 'signalFlow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        signalFlow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(9, 105, 218, 0.3)',
        'glow-info': '0 0 20px rgba(77, 171, 247, 0.3)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
}
