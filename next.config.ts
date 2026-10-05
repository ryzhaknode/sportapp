import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Docker локально; Vercel сам пакує без standalone
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
}

export default nextConfig
