import withPWAInit from 'next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // API — завжди з мережі
      urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
      handler: 'NetworkOnly',
    },
    {
      // Статичні ресурси
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
      // HTML сторінки
      urlPattern: ({ url }) => !url.pathname.startsWith('/api/'),
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
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Додайте ваші специфічні налаштування тут
};

export default withPWA(nextConfig);