/** @type {import('next').NextConfig} */

const nextConfig = {
  /* config options here */
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: 'images.unsplash.com',
    }, {
      protocol: 'https',
      hostname: 'img.clerk.com',
    }],
  },
};

export default nextConfig;
