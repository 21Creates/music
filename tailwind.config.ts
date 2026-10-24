import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'vinyl-black': '#0D0C0B',
        'groove-charcoal': '#1B1917',
        'sleeve-cream': '#F3ECDD',
        'white-label-acid': '#DFFF3F',
        'groove-gray': '#8A8378',
        'test-pressing-red': '#FF4D3D',
      },
    },
  },
  plugins: [],
} satisfies Config
