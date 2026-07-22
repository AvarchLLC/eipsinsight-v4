import type { Metadata } from "next";

const SITE_NAME = "EIPsInsight";
const SITE_URL = "https://eipsinsight.com";
const DEFAULT_OG_IMAGE = "/eipsinsight.png";

type BuildMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
  /**
   * Social card image. Pass `null` when the route has its own
   * `opengraph-image.tsx` — Next only falls back to that file convention if the
   * metadata does NOT specify images, so leaving the default here would silently
   * shadow the generated card with the static logo.
   */
  image?: string | null;
};

export function buildMetadata({
  title,
  description,
  path,
  keywords = [],
  noIndex = false,
  image = DEFAULT_OG_IMAGE,
}: BuildMetadataInput): Metadata {
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${SITE_URL}${canonicalPath}`;
  // null => omit images entirely so a route-level opengraph-image.tsx wins.
  const imageUrl =
    image === null
      ? null
      : image.startsWith("http://") || image.startsWith("https://")
        ? image
        : `${SITE_URL}${image.startsWith("/") ? image : `/${image}`}`;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      ...(imageUrl
        ? { images: [{ url: imageUrl, width: 1200, height: 630, alt: title }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
      creator: "@EIPsInsight",
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
            "max-image-preview": "none",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

