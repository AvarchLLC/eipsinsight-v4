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
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/**' },
    ],
  },

  // Backward-compatible redirects for legacy routes
  async redirects() {
    return [
      // Legacy route redirects
      {
        source: '/standards-by-repo',
        destination: '/standards',
        permanent: true,
      },
      {
        source: '/all',
        destination: '/standards',
        permanent: false,
      },
      {
        source: '/n-w-upgrades',
        destination: '/upgrade',
        permanent: true,
      },
      // Canonical proposal detail routes are plural repo paths: /eips/:number, /ercs/:number, /rips/:number
      // Keep legacy singular detail links working across the app and shared links.
      {
        source: '/eip/:path*',
        destination: '/eips/:path*',
        permanent: true,
      },
      {
        source: '/erc/:path*',
        destination: '/ercs/:path*',
        permanent: true,
      },
      {
        source: '/rip/:path*',
        destination: '/rips/:path*',
        permanent: true,
      },
      // Legacy singular repo roots
      {
        source: '/eip',
        destination: '/standards?repo=eips',
        permanent: true,
      },
      {
        source: '/erc',
        destination: '/standards?repo=ercs',
        permanent: true,
      },
      {
        source: '/rip',
        destination: '/standards?repo=rips',
        permanent: true,
      },
      // Legacy onboarding/resource links
      {
        source: '/resources/getting-started',
        destination: '/resources/docs',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
