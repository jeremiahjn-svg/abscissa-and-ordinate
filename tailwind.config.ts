import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {

    extend: {
      colors: {
        space: {
          900: '#05050A', 
          800: '#0B0F19', 
          700: '#131A2A', 
        },
        brass: {
          400: '#E5C158', 
          500: '#CBA03C', 
        },
        starlight: {
          200: '#E2E8F0',
          300: '#CBD5E1',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
        serif: ['var(--font-playfair)'], 
      },
      backgroundImage: {
        'cosmic-gradient': 'radial-gradient(circle at top right, #131A2A 0%, #05050A 100%)',
      }
    },
  },
  plugins: [],
};
export default config;
