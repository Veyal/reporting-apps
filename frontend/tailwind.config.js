/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Gothic Minimalist Color Palette
        gothic: {
          // Primary blacks
          '900': '#0a0a0a',
          '800': '#1a1a1a',
          '700': '#2d2d2d',
          '600': '#404040',
          
          // Secondary grays
          '500': '#6b7280',
          '400': '#9ca3af',
          '300': '#d1d5db',
          '200': '#e5e7eb',
          '100': '#f3f4f6',
          '50': '#f8f8f8',
        },
        
        // Accent colors
        accent: {
          '600': '#8b5cf6',
          '500': '#a855f7',
          '400': '#c084fc',
          '300': '#d8b4fe',
        },
        
        // Status colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Poppins', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      
      boxShadow: {
        'gothic': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'gothic-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        'gothic-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
        'accent': '0 4px 6px -1px rgba(139, 92, 246, 0.3), 0 2px 4px -1px rgba(139, 92, 246, 0.2)',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-accent': 'pulseAccent 2s infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseAccent: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      
      backgroundImage: {
        'gothic-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        'accent-gradient': 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
      },
    },
  },
  plugins: [],
}
