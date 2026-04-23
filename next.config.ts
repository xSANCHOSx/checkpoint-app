// @ts-check
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // API — завжди з мережі, ніколи не кешувати
      urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
      handler: 'NetworkOnly',
    },
    {
      // Статичні ресурси — кеш спочатку
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
      // HTML сторінки — мережа спочатку, fallback на кеш
      urlPattern: /^https?:\/\/.+\/((?!api\/).)*$/,
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
  // Для Vercel — НЕ додавати output:'standalone' (це тільки для Docker)
  // instrumentationHook потрібен тільки для self-hosted (node-cron)
  // На Vercel cron запускається через vercel.json
}

module.exports = withPWA(nextConfig)
