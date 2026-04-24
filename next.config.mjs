import withPWAInit from 'next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    {
      // API — завжди з мережі, без кешування
      urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
      handler: 'NetworkOnly',
    },
    {
      // Адмін-сторінки — тільки з мережі (не кешуємо захищені маршрути)
      urlPattern: ({ url }) => url.pathname.startsWith('/admin'),
      handler: 'NetworkOnly',
    },
    {
      // Статичні ресурси — спочатку кеш
      urlPattern: /\.(?:js|css|woff|woff2|ttf|otf|eot|png|jpg|jpeg|gif|svg|ico|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
      },
    },
    {
      // Публічні HTML-сторінки — мережа з fallback на кеш
      urlPattern: ({ url }) =>
        !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/admin'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60,
        },
        networkTimeoutSeconds: 5,
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

export default withPWA(nextConfig)
