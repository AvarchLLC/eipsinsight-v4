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
      // Explore drilldown shortcuts
      {
        source: '/draft',
        destination: '/explore/details/status/draft',
        permanent: false,
      },
      {
        source: '/review',
        destination: '/explore/details/status/review',
        permanent: false,
      },
      {
        source: '/last-call',
        destination: '/explore/details/status/last-call',
        permanent: false,
      },
      {
        source: '/final',
        destination: '/explore/details/status/final',
        permanent: false,
      },
      {
        source: '/living',
        destination: '/explore/details/status/living',
        permanent: false,
      },
      {
        source: '/stagnant',
        destination: '/explore/details/status/stagnant',
        permanent: false,
      },
      {
        source: '/withdrawn',
        destination: '/explore/details/status/withdrawn',
        permanent: false,
      },
      {
        source: '/core',
        destination: '/explore/details/category/core',
        permanent: false,
      },
      {
        source: '/networking',
        destination: '/explore/details/category/networking',
        permanent: false,
      },
      {
        source: '/interface',
        destination: '/explore/details/category/interface',
        permanent: false,
      },
      {
        source: '/meta',
        destination: '/explore/details/category/meta',
        permanent: false,
      },
      {
        source: '/informational',
        destination: '/explore/details/category/informational',
        permanent: false,
      },
      {
        source: '/repo/eips',
        destination: '/explore/details/repo/eips',
        permanent: false,
      },
      {
        source: '/repo/ercs',
        destination: '/explore/details/repo/ercs',
        permanent: false,
      },
      {
        source: '/repo/rips',
        destination: '/explore/details/repo/rips',
        permanent: false,
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
        destination: '/explore/details/category/erc',
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
      {
        source: '/resources/docs',
        destination: 'https://docs.eipsinsight.com/',
        permanent: true,
      },
      {
        source: '/docs',
        destination: 'https://docs.eipsinsight.com/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
