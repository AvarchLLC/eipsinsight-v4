/**
 * Community testimonials shown on /testimonials and in a compact strip on the
 * home page. Hand-curated from public posts; add new entries to the top.
 *
 * `quote` is rendered with @handles emphasized, so keep the @mentions in the
 * text. Keep `featured: true` for the ones that should lead the wall and appear
 * in the home-page strip.
 */

export type Testimonial = {
  /** Display name of the person. */
  name: string;
  /** X/Twitter handle without the leading @. */
  handle: string;
  /** Short role or affiliation; optional. */
  role?: string;
  /** The testimonial text. @mentions are emphasized at render time. */
  quote: string;
  /** Avatar image URL (e.g. the person's X profile image). */
  avatar?: string;
  /** Link to the original post or the author's profile; optional. */
  url?: string;
  /** Human-readable date, e.g. "Nov 6, 2026". */
  date?: string;
  /** A badge shown on the card, e.g. "EIP-1 author". */
  badge?: string;
  /** Lead the wall and show in the home-page strip. */
  featured?: boolean;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Hudson Jameson",
    handle: "hudsonjameson",
    role: "Author of EIP-1 · Ethereum",
    badge: "EIP-1 author",
    quote:
      "Everyone should visit @EIPsInsight and see the great work you all do.",
    avatar:
      "https://pbs.twimg.com/profile_images/1755127289891741696/9xR49-3L_400x400.jpg",
    url: "https://x.com/hudsonjameson",
    date: "Nov 6, 2026",
    featured: true,
  },
  {
    name: "Sam Wilson",
    handle: "_SamWilsn_",
    role: "Ethereum researcher",
    badge: "EIP editor",
    quote:
      "Thanks again for building the UI for the EIP board! It's a nice UI.",
    avatar:
      "https://pbs.twimg.com/profile_images/1434112869977759748/cfTpPYeQ_400x400.png",
    url: "https://x.com/_SamWilsn_",
    featured: true,
  },
  {
    name: "Jochem Brouwer",
    handle: "JochemBrouwer96",
    role: "Ethereum core developer",
    badge: "EIP editor",
    quote: "Wow, great, thanks! The site is super useful 😄",
    avatar:
      "https://pbs.twimg.com/profile_images/1916892337030004738/kD_bYqGT_400x400.jpg",
    url: "https://x.com/JochemBrouwer96",
    featured: true,
  },
  {
    name: "Zainan Zhou (Victor)",
    handle: "ZainanZhou",
    role: "EIP editor",
    quote: "That's nice, great detail.",
    avatar:
      "https://pbs.twimg.com/profile_images/1753136367763398656/HWtghbrf_400x400.jpg",
    url: "https://x.com/ZainanZhou",
  },
  {
    name: "Redwan",
    handle: "RedoudouM",
    role: "Ethereum Matrix",
    quote:
      "In the continuity of the great work of @EIPsInsight, this is a tool to translate Ethereum technical changes into product impact for financial institutions.",
    avatar:
      "https://pbs.twimg.com/profile_images/1886278550589693952/kbHsenCg_400x400.jpg",
    url: "https://x.com/RedoudouM",
    date: "Sep 2026",
  },
  {
    name: "Abhimanyu Nag",
    handle: "AbhiMan1601",
    role: "Co-author of EIP-5133",
    badge: "EIP author",
    quote:
      "Special shoutout to @EIPsInsight for the work they do. I started using it today and love the tool, esp for technical introductions into new EIPs.",
    avatar:
      "https://pbs.twimg.com/profile_images/2104940210182373376/CcLRzeHR_400x400.jpg",
    url: "https://x.com/AbhiMan1601",
    date: "Nov 2026",
  },
  {
    name: "gaurang.eth",
    handle: "iamgaurangdesai",
    quote:
      "Thanks to @EIPsInsight for showcasing the detailed version of what's happening, only at @EFDevcon.",
    avatar:
      "https://pbs.twimg.com/profile_images/1586974754325422080/1Ps_9fN0_400x400.png",
    url: "https://x.com/iamgaurangdesai",
    date: "Nov 3, 2026",
  },
];
