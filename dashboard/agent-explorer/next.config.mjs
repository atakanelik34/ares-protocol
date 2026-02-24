/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['viem', 'wagmi']
  }
};

export default nextConfig;
