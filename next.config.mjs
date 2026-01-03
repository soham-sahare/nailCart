/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose'],
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'mongoose'];
    return config;
  },
};

export default nextConfig;
