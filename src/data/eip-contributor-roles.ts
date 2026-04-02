export const CANONICAL_EIP_EDITORS = [
  "lightclient",
  "SamWilsn",
  "xinbenlv",
  "g11tech",
  "jochem-brouwer",
] as const;

export const CANONICAL_EIP_REVIEWERS = [
  "bomanaps",
  "Marchhill",
  "SkandaBhat",
  "advaita-saha",
  "nalepae",
  "daniellehrner",
] as const;

export const ASSOCIATE_EIP_EDITORS = [] as const;

export const CANONICAL_EIP_EDITOR_LOWER = CANONICAL_EIP_EDITORS.map((editor) => editor.toLowerCase());
export const CANONICAL_EIP_REVIEWER_LOWER = CANONICAL_EIP_REVIEWERS.map((reviewer) => reviewer.toLowerCase());

// Governance-defined editor coverage map used by Explore/Analytics editor coverage views.
export const OFFICIAL_EDITORS_BY_CATEGORY: Record<string, string[]> = {
  governance: ["lightclient", "SamWilsn", "xinbenlv", "nconsigny", "jochem-brouwer"],
  core: ["axic", "Pandapip1", "gcolvin", "lightclient"],
  erc: ["SamWilsn", "xinbenlv"],
  networking: ["yoavw", "CarlBeek", "adietrichs"],
  interface: ["yoavw", "CarlBeek", "lightclient"],
  meta: ["lightclient", "SamWilsn", "nconsigny", "jochem-brouwer"],
  informational: ["lightclient", "SamWilsn", "xinbenlv"],
};
