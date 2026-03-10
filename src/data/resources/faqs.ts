export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: "basics" | "process" | "platform";
  relatedLinks?: Array<{ label: string; href: string }>;
}

export const faqs: FAQ[] = [
  // ── Basics ──
  {
    id: "what-is-eip",
    category: "basics",
    question: "What is an EIP?",
    answer:
      "An EIP (Ethereum Improvement Proposal) is a design document providing information to the Ethereum community, describing a new feature, process, or environment change for Ethereum. EIPs are the primary mechanism for proposing new features, collecting community input, and documenting design decisions.",
    relatedLinks: [
      { label: "View all EIPs", href: "/standards?repo=eips" },
      { label: "EIP-1 Process", href: "https://eips.ethereum.org/EIPS/eip-1" },
    ],
  },
  {
    id: "what-is-erc",
    category: "basics",
    question: "What is an ERC?",
    answer:
      "An ERC (Ethereum Request for Comment) is a type of EIP that proposes application-level standards and conventions, such as token standards (ERC-20, ERC-721), name registries, and wallet formats. ERCs are critical for ecosystem interoperability.",
    relatedLinks: [
      { label: "View all ERCs", href: "/standards?repo=ercs" },
    ],
  },
  {
    id: "what-is-rip",
    category: "basics",
    question: "What is a RIP?",
    answer:
      "A RIP (Rollup Improvement Proposal) is a standards document for Layer 2 rollup solutions. RIPs define improvements and standards for rollup implementations, helping to coordinate development across the L2 ecosystem.",
    relatedLinks: [
      { label: "View all RIPs", href: "/standards?repo=rips" },
    ],
  },
  {
    id: "difference-eip-erc-rip",
    category: "basics",
    question: "What is the difference between an EIP, ERC, and RIP?",
    answer:
      "EIP is the broad standards umbrella for Ethereum improvements. ERCs are application-level standards inside the EIP process, usually focused on tokens, wallets, interfaces, and interoperability. RIPs are rollup-focused standards aimed at Layer 2 coordination. They use similar proposal mechanics but serve different parts of the ecosystem.",
    relatedLinks: [
      { label: "Browse standards", href: "/standards" },
      { label: "Explore proposal statuses", href: "/explore/status" },
    ],
  },
  {
    id: "where-to-start-learning",
    category: "basics",
    question: "Where should I start if I am new to Ethereum standards?",
    answer:
      "Start with EIP-1 to understand the proposal process, then review a few well-known standards such as EIP-1559 or ERC-20 to see how ideas become part of the ecosystem. After that, use the analytics and insights pages to understand how governance and contributor activity shape proposal outcomes.",
    relatedLinks: [
      { label: "Read docs", href: "/resources/docs" },
      { label: "View EIP-1559", href: "/eip/1559" },
      { label: "Open analytics", href: "/analytics/eips" },
    ],
  },
  {
    id: "how-do-i-contribute",
    category: "basics",
    question: "How do I contribute to the EIP process?",
    answer:
      "You can contribute by drafting proposals, opening pull requests, reviewing drafts, commenting during Last Call, improving documentation, or helping with research and implementation feedback. Effective contributions usually start with reading EIP-1 and reviewing similar accepted proposals before opening a PR.",
    relatedLinks: [
      { label: "Open EIP Builder", href: "/tools/eip-builder" },
      { label: "Search PRs and issues", href: "/search?tab=prs" },
    ],
  },

  // ── Process ──
  {
    id: "draft-to-final",
    category: "process",
    question: "How does an EIP move from Draft to Final?",
    answer:
      "An EIP progresses through several stages: Draft → Review → Last Call → Final. During Draft, the proposal is being actively worked on. Review means it's ready for peer review. Last Call is the final review period before acceptance. Final means the EIP has been accepted and implemented. This process can take months to years depending on complexity and community consensus.",
    relatedLinks: [
      { label: "View EIP lifecycle", href: "/analytics/eips" },
    ],
  },
  {
    id: "who-are-editors",
    category: "process",
    question: "Who are EIP Editors?",
    answer:
      "EIP Editors are individuals responsible for managing the EIP process. They review proposals for formatting and process compliance, provide editorial guidance, and help move EIPs through the workflow. Editors do not make technical decisions about EIP acceptance.",
    relatedLinks: [
      { label: "View Editor activity", href: "/analytics/editors" },
      { label: "Explore by role", href: "/explore/roles" },
    ],
  },
  {
    id: "what-is-last-call",
    category: "process",
    question: "What is Last Call?",
    answer:
      "Last Call is the final review stage before an EIP becomes Final. During this period (typically 14 days), the community has a final opportunity to review and comment on the proposal. After Last Call completes without significant objections, the EIP can move to Final status.",
  },
  {
    id: "how-long-does-review-take",
    category: "process",
    question: "How long does review usually take?",
    answer:
      "There is no fixed duration. Simple proposals can move quickly, while technically complex or contentious proposals may take months or years. Review time depends on editorial feedback, community discussion, implementation readiness, and whether consensus has formed around the change.",
    relatedLinks: [
      { label: "See governance trends", href: "/insights/governance-and-process" },
      { label: "Explore by status", href: "/explore/status" },
    ],
  },
  {
    id: "what-blocks-a-proposal",
    category: "process",
    question: "What usually blocks a proposal from moving forward?",
    answer:
      "The most common blockers are incomplete specification details, lack of editor or reviewer feedback, failing PR checks, unresolved technical objections, and unclear implementation strategy. For protocol-wide changes, timing around network upgrades can also delay progress.",
    relatedLinks: [
      { label: "Open PR board", href: "/tools/board" },
      { label: "PR analytics", href: "/analytics/prs" },
    ],
  },
  {
    id: "who-decides-acceptance",
    category: "process",
    question: "Who decides whether a proposal is accepted?",
    answer:
      "Acceptance is not controlled by one person. Editors manage process and formatting, but technical acceptance depends on broad community alignment, implementer support, researcher feedback, and whether the proposal gains enough consensus to move through the workflow and, where relevant, into client implementations or upgrades.",
    relatedLinks: [
      { label: "Explore roles", href: "/explore/roles" },
      { label: "Upgrade overview", href: "/upgrade" },
    ],
  },
  {
    id: "why-status-changes-back",
    category: "process",
    question: "Why does a proposal sometimes move backward in status?",
    answer:
      "Status can move backward when new objections appear, specification changes become necessary, implementation work reveals issues, or reviewers determine that more discussion is required before finalization. This is normal in a governance process that values correctness and consensus over speed.",
    relatedLinks: [
      { label: "Monthly insight", href: "/insights" },
      { label: "Editorial commentary", href: "/insights/editorial-commentary" },
    ],
  },

  // ── Platform ──
  {
    id: "what-does-eipsinsight-track",
    category: "platform",
    question: "What does EIPsInsight track?",
    answer:
      "EIPsInsight tracks EIPs, ERCs, and RIPs across their entire lifecycle. We monitor status changes, pull request activity, governance signals, editor workload, contributor activity, and provide analytics on proposal velocity, bottlenecks, and ecosystem health.",
    relatedLinks: [
      { label: "View Analytics", href: "/analytics" },
      { label: "Explore Standards", href: "/standards" },
    ],
  },
  {
    id: "data-update-frequency",
    category: "platform",
    question: "How often is data updated?",
    answer:
      "Our data pipelines run continuously, syncing with GitHub repositories every few minutes. Analytics dashboards are cached for performance but refreshed regularly. Most data you see is near real-time, with some aggregated metrics updated hourly.",
  },
  {
    id: "can-download-data",
    category: "platform",
    question: "Can I download data?",
    answer:
      "Yes! Most pages include CSV or JSON export buttons. You can download standards lists, analytics data, PR information, and more. We believe in open data and encourage researchers to use our platform for analysis.",
    relatedLinks: [
      { label: "Export Standards", href: "/standards" },
      { label: "Export Analytics", href: "/analytics" },
    ],
  },
  {
    id: "what-pages-should-i-use",
    category: "platform",
    question: "Which EIPsInsight pages should I use for different tasks?",
    answer:
      "Use Standards pages to inspect proposals, Analytics pages for trends and workload, Insights pages for interpretive views, Tools pages for operational workflows like PR boards and timelines, and Explore pages to discover actors, statuses, and trending proposals. The best path depends on whether you are learning, researching, or actively coordinating work.",
    relatedLinks: [
      { label: "Open Resources hub", href: "/resources" },
      { label: "Browse Tools", href: "/tools" },
      { label: "Open Explore", href: "/explore" },
    ],
  },
  {
    id: "does-platform-cover-prs-issues",
    category: "platform",
    question: "Does EIPsInsight cover pull requests and issues too?",
    answer:
      "Yes. EIPsInsight links standards data with pull requests, issue activity, reviews, and governance signals. This helps explain not only what changed in a proposal, but also how discussion and editorial work influenced that change.",
    relatedLinks: [
      { label: "PR detail pages", href: "/analytics/prs" },
      { label: "Timeline tool", href: "/tools/timeline" },
    ],
  },
  {
    id: "are-personas-required",
    category: "platform",
    question: "Do I need an account or persona to use EIPsInsight?",
    answer:
      "No. Most of the platform is available without signing in. Personas are a UI preference that help reorder navigation and tailor defaults for developers, editors, builders, or newcomers. Signing in mainly helps save preferences and sync them across devices.",
    relatedLinks: [
      { label: "Profile and settings", href: "/profile" },
      { label: "Resources", href: "/resources" },
    ],
  },
  {
    id: "how-current-is-data",
    category: "platform",
    question: "How current are analytics and board views?",
    answer:
      "Most proposal and PR data is refreshed frequently through automated syncs, while heavier analytics may use short-lived caching for performance. Operational views such as boards and timelines are designed to stay close to source activity, while monthly and historical analysis views emphasize accuracy over immediate real-time updates.",
    relatedLinks: [
      { label: "Open board", href: "/tools/board" },
      { label: "Open analytics", href: "/analytics" },
    ],
  },
];
