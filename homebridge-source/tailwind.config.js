/** Every color is a CSS variable so the six palettes and light/dark modes swap at runtime. */
const v = (n) => `var(--${n})`;
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: Object.fromEntries(['bg','surface','surface-2','ink','muted','line','primary','primary-ink','primary-soft','secondary','secondary-soft','ok','ok-soft','warn','warn-soft','danger','danger-soft','info','info-soft','focus'].map((n) => [n, v(n)])),
      fontFamily: {
        display: ['Sora', '"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
        body: ['"Atkinson Hyperlegible"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { card: '18px' },
      boxShadow: { card: 'var(--shadow)' },
    },
  },
  plugins: [],
};
