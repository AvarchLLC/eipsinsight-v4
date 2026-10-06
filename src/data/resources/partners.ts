export interface Partner {
  name: string;
  /** One-line role shown under the name. */
  description?: string;
  website?: string;
  /** Logo path (rendered on a white chip, so a dark/colored mark works in both themes). */
  logo?: string;
}

// Ordered: coordination & education partners first, media partner last.
export const partners: Partner[] = [
  {
    name: "ECH Institute",
    description: "Coordination & standards operations",
    website: "https://ethereumcatherders.com",
    logo: "/brand/partners/ech.png",
  },
  {
    name: "EthShala",
    description: "Ethereum education & university program",
    website: "https://www.ethshala.com",
    logo: "/brand/partners/ethshala-white.svg",
  },
  {
    name: "EtherWorld",
    description: "Media & ecosystem amplification",
    website: "https://etherworld.co",
    logo: "/brand/partners/ew.png",
  },
];
