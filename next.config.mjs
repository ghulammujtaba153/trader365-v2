/** @type {import('next').NextConfig} */
const apiUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000').replace(/\/$/, '')

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`
      }
    ]
  }
}

export default nextConfig
