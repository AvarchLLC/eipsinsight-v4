import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'github.com', pathname: '/**' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
    ],
  },

  // Backward-compatible redirects for legacy routes
  async redirects() {
    return [
      // Legacy route redirects
      {
        source: '/standards-by-repo',
        destination: '/all',
        permanent: true,
      },
      {
        source: '/n-w-upgrades',
        destination: '/upgrade',
        permanent: true,
      },
      // Keep /eips, /ercs, /rips working (if they exist elsewhere)
      {
        source: '/eips/:path*',
        destination: '/eip/:path*',
        permanent: true,
      },
      {
        source: '/ercs/:path*',
        destination: '/erc/:path*',
        permanent: true,
      },
      {
        source: '/rips/:path*',
        destination: '/rip/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
