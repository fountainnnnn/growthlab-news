/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gl-base': '#0D1117',
        'gl-surface': '#161B22',
        'gl-elevated': '#1C2128',
        'gl-inset': '#0D1117',
        'gl-border': 'rgba(139, 148, 158, 0.15)',
        'gl-border-hover': 'rgba(139, 148, 158, 0.25)',
        'gl-text': '#E6EDF3',
        'gl-text-secondary': '#8B949E',
        'gl-text-tertiary': '#6E7681',
        'gl-link': '#58A6FF',
        'gl-accent': '#7C5CFC',
        'gl-accent-blue': '#58A6FF',
        'gl-green': '#3FB950',
        'gl-orange': '#D29922',
        'gl-red': '#F85149',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
