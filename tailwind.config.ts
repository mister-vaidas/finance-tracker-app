import type { Config } from 'tailwindcss'


const config: Config = {
content: [
'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
],
theme: {
extend: {
colors: {
bg: '#0B1220',
card: '#0F172A',
ink: '#E2E8F0',
soft: '#94A3B8',
brand: '#0EA5E9',
up: '#22C55E',
down: '#EF4444',
},
borderRadius: {
xl: '1rem',
'2xl': '1.25rem',
},
boxShadow: {
soft: '0 10px 30px rgba(0,0,0,.25)'
}
},
},
plugins: [],
}
export default config