/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // Intercepte toutes les requêtes qui commencent par /api
        source: '/api/:path*',
        // Et les redirige silencieusement vers ton backend Hono
        destination: 'https://adc-bice.vercel.app/:path*',
      },
    ];
  },
};

export default nextConfig;