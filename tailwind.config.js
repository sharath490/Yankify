export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: { 'slide-up': { from: { opacity: '0', transform: 'translateY(24px) scale(.98)' }, to: { opacity: '1', transform: 'translateY(0) scale(1)' } } },
      animation: { 'slide-up': 'slide-up .35s cubic-bezier(.22,1,.36,1) both' },
    },
  },
  plugins: [],
};
