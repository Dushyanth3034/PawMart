/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        border: "rgba(17,24,39,0.09)",
        input: "#F7F4EB",
        ring: "#E65C00",
        background: "#FDFBF7",
        foreground: "#111827",
        primary: {
          DEFAULT: "#E65C00",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#111827",
          foreground: "#FDFBF7",
        },
        accent: {
          DEFAULT: "#FFB380",
          foreground: "#111827",
        },
        surface: {
          DEFAULT: "#F7F4EB",
          foreground: "#111827",
        },
        muted: {
          DEFAULT: "#6B7280",
          foreground: "#111827",
        },
        success: {
          DEFAULT: "#22C55E",
          foreground: "#FFFFFF",
        },
        error: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        warm: {
          50: "#FFF8F3",
          100: "#FFF0E6",
          200: "#FFD9BF",
          300: "#FFB380",
          400: "#FF8C4D",
          500: "#E65C00",
          600: "#CC5200",
          700: "#A34100",
          800: "#7A3100",
          900: "#522100",
        }
      },
      borderRadius: {
        lg: "24px",
        md: "20px",
        sm: "14px",
        xl: "32px",
        "2xl": "40px",
      },
      boxShadow: {
        'glass': '0 4px 24px -4px rgba(230,92,0,0.08)',
        'premium': '0 10px 40px -10px rgba(230,92,0,0.12)',
        'float': '0 20px 48px -16px rgba(230,92,0,0.18)',
        'card': '0 2px 16px -2px rgba(17,24,39,0.06)',
        'inner-light': 'inset 0 1px 1px rgba(255, 255, 255, 0.6)',
        'orange-glow': '0 0 32px rgba(230,92,0,0.15)',
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.85 },
        }
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-slow": "pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
