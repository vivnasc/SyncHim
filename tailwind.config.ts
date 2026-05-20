import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx,mdx}',
    './content/**/*.md'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1A1410',
        coal: '#201914',
        bone: '#F2E8DC',
        gold: '#B8843D',
        goldBright: '#D4A857',
        bordeaux: '#8B2235',
        ash: '#A39B8E',
        separator: '#3A2E22'
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
