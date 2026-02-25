export interface FeaturedResource {
  id: string;
  title: string;
  type: "blog" | "video" | "news" | "doc";
  description: string;
  link: string;
  image?: string;
}

export const featuredResources: FeaturedResource[] = [
  {
    id: "eip-governance",
    title: "How EIP Governance Works",
    type: "doc",
    description:
      "A deep dive into the decision-making process behind Ethereum Improvement Proposals.",
    link: "/resources/docs",
  },
  {
    id: "eip-1559",
    title: "Understanding EIP-1559",
    type: "doc",
    description:
      "Learn about the fee market changes introduced by EIP-1559 and its impact on Ethereum.",
    link: "/eip/1559",
  },
  {
    id: "dencun-upgrade",
    title: "Dencun Upgrade Explained",
    type: "doc",
    description:
      "Everything you need to know about the Dencun network upgrade and its impact.",
    link: "/upgrade/cancun",
  },
  {
    id: "eip-process-doc",
    title: "EIP Process Documentation",
    type: "doc",
    description:
      "Official documentation on how to write and submit an EIP.",
    link: "/resources/docs",
  },
];
