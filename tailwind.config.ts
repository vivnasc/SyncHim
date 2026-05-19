import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx,mdx}',
    './content/**/*.md'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0A',
        coal: '#111111',
        bone: '#F5F1EA',
        gold: '#B8956A',
        bordeaux: '#6B1F2C',
        ash: '#888880'
      },
      fontFamily: {
        serif: ['"EB Garamond"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"Spectral"', '"Lora"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif']
      },
      letterSpacing: {
        wider: '0.04em',
        widest: '0.18em'
      },
      maxWidth: {
        prose: '38rem',
        reading: '34rem'
      }
    }
  },
  plugins: []
};

export default config;
