import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/api-tokens",
          "/dashboard",
          "/debug",
          "/login",
          "/p",
          "/profile",
          "/search",
          "/settings",
          "/verify-request",
        ],
      },
    ],
    sitemap: "https://eipsinsight.com/sitemap.xml",
  };
}
