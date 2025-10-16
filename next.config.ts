/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'


const withPWA = require('next-pwa')({
dest: 'public',
disable: !isProd,
register: true,
skipWaiting: true,
})


module.exports = withPWA({
reactStrictMode: true,
})