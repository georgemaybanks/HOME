/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#242923',
        muted: '#7c837a',
        line: '#e2e5dc',
        paper: '#f3f4ee',
        clay: '#c9714d',
        signal: '#4b855f',
        camera: '#252a25',
        sage: {
          DEFAULT: '#426e51',
          deep: '#31583d',
          soft: '#e7eee4',
          mist: '#e9ede4',
          selected: '#dbe5d7',
          line: '#d5dbd1',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      fontSize: {
        clock: ['2.5rem', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
};


