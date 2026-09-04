/**
 * Static EIP Editing Office Hour recaps.
 *
 * Hand-curated summaries of past office hours, shown in the Office Hours hub
 * (Calls tab + Overview) until the automated call-artifact pipeline covers the
 * office-hour series. Every PR row below was cross-checked against the live
 * governance backend (title / author / status), so it reflects reality rather
 * than the raw meeting notes.
 */

export type OhPrStatus = "MERGED" | "WAITING_ON_EDITOR" | "WAITING_ON_AUTHOR" | "OPEN";

export type OhPrItem = {
  repo: "ercs" | "eips" | "rips";
  pr: number;
  title: string;
  author: string;
  status: OhPrStatus;
  note: string;
};

// Call series slugs used in /calls/<series>/<number> for static office-hour
// style calls (EIP Editing Office Hours now; EIPIP meetings later).
export const OFFICE_HOUR_SERIES = new Set(["eipoh", "eipip"]);

export type OhRecap = {
  series: "eipoh" | "eipip";
  meeting: number;
  dateISO: string; // yyyy-mm-dd
  displayDate: string;
  title: string;
  youtube: string;
  issueUrl: string;
  summary: string;
  prs: OhPrItem[];
  decisions: string[];
  actionItems: string[];
  nextMeeting: string;
};

export const OFFICE_HOUR_RECAPS: OhRecap[] = [
  {
    series: "eipoh",
    meeting: 112,
    dateISO: "2026-09-01",
    displayDate: "Sep 1, 2026",
    title: "EIP Editing Office Hour (EIP + ERC) #112",
    youtube: "https://www.youtube.com/watch?v=s6a4NUwRx8g",
    issueUrl: "https://github.com/ethereum/pm/issues/2202",
    summary:
      "Session #112 worked through the review queue and live author questions. ERC-8167 (Modular Dispatch Proxies) advanced to Last Call and the ML-DSA verification precompile EIP was reviewed and merged. Editors closed a batch of duplicate or outdated Meta EIP PRs and typo fixes, and clarified that a multi-author proposal needs approval from an existing co-author before it can merge. Authors were guided to use the Ethereum Magicians forum for public feedback and the EIPsInsight board to track the review queue.",
    prs: [
      { repo: "ercs", pr: 1958, title: "Update ERC-8167: Move to Last Call", author: "wjmelements", status: "MERGED", note: "Modular Dispatch Proxies. Reviewed and approved; the dispatch-proxy standard advanced to Last Call." },
      { repo: "eips", pr: 12048, title: "Add EIP: Precompiles for ML-DSA Verification", author: "shemnon", status: "MERGED", note: "Reviewed as well-written with proper citations and test cases. Merged." },
      { repo: "eips", pr: 11962, title: "Update EIP-7716: Move to Draft", author: "OisinKyne", status: "WAITING_ON_AUTHOR", note: "Author asked what the block was. The eip-review-bot needs an approval from a co-author (an author other than the PR opener) before an editor can act." },
      { repo: "ercs", pr: 1952, title: "Website: Fix the Auto Stagnant Bot", author: "Cybercentry", status: "WAITING_ON_AUTHOR", note: "Carried in the quick-actions queue; still waiting on the author." },
    ],
    decisions: [
      "ERC-8167 (Modular Dispatch Proxies) was approved to move to Last Call.",
      "The ML-DSA verification precompile EIP was reviewed as well-written (proper citations and test cases) and merged.",
      "Minimal Sovereign Bridge Token (ERC-7905) was reviewed and marked as accepted.",
      "Eight duplicate or outdated PRs on the Glamsterdam (EIP-7773) and Hegota (EIP-8081) Meta EIPs, plus typo fixes, were identified for closure.",
      "Review process clarified: an author must obtain approval from at least one existing author to merge a PR; otherwise the proposal should be resubmitted under a new number.",
      "ERC-8009 is waiting for a reviewer. Editors do not assign technical reviewers, so authors should proactively reach out to interested parties.",
    ],
    actionItems: [
      "Mark (ERC-8009): invite industry partners to post feedback on the Ethereum Magicians forum to demonstrate community interest.",
      "Oisín (EIP-7716): obtain approval from a co-author (Tony) to proceed with the PR merge.",
      "Authors: direct public feedback and company comments to the Ethereum Magicians forum, and track the review queue via EIPsInsight.",
      "Consider adding an eipw lint rule to automate certain checks.",
    ],
    nextMeeting: "Meeting #113, Sep 8, 2026",
  },
  {
    series: "eipoh",
    meeting: 111,
    dateISO: "2026-08-25",
    displayDate: "Aug 25, 2026",
    title: "EIP Editing Office Hour (EIP + ERC) #111",
    youtube: "https://www.youtube.com/watch?v=ROL9QuD07bc",
    issueUrl: "https://github.com/ethereum/pm/issues/2192",
    summary:
      "Session #111 worked through live and offline reviews of several ERC pull requests. Most needed only minor changes before approval. Sam Wilson gave immediate feedback on structure and formatting and deferred detailed review of the larger PRs to after the call. One submission was flagged for the wrong repository (interface-category proposals belong in the EIP repo, not ERC).",
    prs: [
      { repo: "ercs", pr: 1909, title: "Add ERC: Index-Based Multi-Facet Proxy", author: "Arhemius", status: "MERGED", note: "Quick scan, no changes needed. Approved and merged." },
      { repo: "ercs", pr: 1919, title: "Add ERC: Confidential Agent Policy Verdicts", author: "mzf11125", status: "MERGED", note: "Reviewed with no blocking issues. Merged." },
      { repo: "ercs", pr: 1956, title: "Update ERC-5516: Move to Final", author: "LucasGrasso", status: "MERGED", note: "Approved after a quick review; one date field corrected before merge." },
      { repo: "ercs", pr: 1935, title: "Add ERC: Reference-Relative Slippage Bounds", author: "zexoverz", status: "WAITING_ON_EDITOR", note: "A duplicate interface import was flagged. Author to remove the duplicate before merge." },
      { repo: "ercs", pr: 1942, title: "Add ERC: Token Launch Abuse Detection and Remediation", author: "Cybercentry", status: "WAITING_ON_EDITOR", note: "Reference implementation is large. Sam recommended adding a README linking all relevant files and keeping the implementation minimal." },
      { repo: "ercs", pr: 1910, title: "Add ERC: Agent Memory State Registry", author: "everest-an", status: "WAITING_ON_AUTHOR", note: "Reviewed and considered clean; currently waiting on the author." },
      { repo: "ercs", pr: 1957, title: "Update ERC-8107: Move to Review", author: "KBryan", status: "WAITING_ON_AUTHOR", note: "Reviewed as solid, with a few small changes needed before approval." },
      { repo: "ercs", pr: 1952, title: "Website: Fix the Auto Stagnant Bot", author: "Cybercentry", status: "WAITING_ON_AUTHOR", note: "Larger scope, deferred to offline review after the call." },
    ],
    decisions: [
      "Interface-category submissions must go to the EIP repository, not ERC. Authors submitting interface-type proposals to ERC should be redirected.",
      "ERC-5516 (#1956) approved to move to Final after a quick review; one date field corrected before merge.",
      "A Last Call PR was reviewed and approved; its deadline date was updated to the required format.",
    ],
    actionItems: [
      "Sam: complete the offline detailed review of #1942 and #1952 after the call.",
      "Cybercentry (#1942): add a README to the reference implementation linking all relevant files.",
      "zexoverz (#1935): remove the duplicate interface import to clear the PR for merge.",
      "#1957 author: apply the small changes flagged to finalize the submission.",
      "Editors: leave a note for the miscategorized interface PR author to resubmit to the EIP repository.",
    ],
    nextMeeting: "Meeting #112, Sep 1, 2026",
  },
  {
    series: "eipip",
    meeting: 129,
    dateISO: "2026-08-12",
    displayDate: "Aug 12, 2026",
    title: "EIPIP Meeting #129",
    youtube: "",
    issueUrl: "https://github.com/ethereum/pm/issues/2159",
    summary:
      "Meeting #129 covered open calls for input, including approval to allow links to Unicode standards and stricter rules for changing EIP authors. Sam and jochem-brouwer debated the risks of changing author permissions and the importance of protecting EIP numbers. The group reviewed contributing.md changes that clarify EIP number allocation and prevent authors self-allocating numbers. It also addressed Meta EIP-7773 being blocked by unrelated changes (a mascot EIP) and the need for better process alignment between ACD and EIP editors. Updates on the Rust rendering system and EIP numbering automation showed limited progress with no active owner. Pooja announced plans for an EIP Hub at DevCon.",
    prs: [],
    decisions: [
      "Approved allowing links to the Unicode technical standard; Sam to resolve the conflict and force-merge the CFI since further approvals were unlikely.",
      "Proposed rule that office members should not change EIP author lists, to prevent conflicts and EIPs being taken hostage; edge cases around number ownership and compromised accounts were discussed.",
      "contributing.md updated: EIP number allocation clarified, self-allocation by authors prevented, don'ts moved to a separate section, and editor responsibility for number allocation noted (needs two reviewer approvals).",
      "The EIP bot that checks references to non-final EIPs and ERCs was re-enabled on both the EIP and ERC repositories.",
      "Meta EIP-7773 is blocked by unrelated changes (the addition of a mascot EIP); to be raised at ACD for a process fix.",
      "A community waiting period for author/removal objections was discussed, to continue on Discord for more editor feedback.",
      "Rust rendering implementation and EIP numbering automation have limited progress and no active owner since the protocol support team transition.",
    ],
    actionItems: [
      "Pooja: raise the mascot EIP blocking the Meta EIP at the next ACD meeting and discuss the inclusion process.",
      "Pooja: reach out to programming partners for the EIP Hub at DevCon and coordinate with attending editors.",
      "Sam: fix the conflict and force-merge the CFI allowing links to the Unicode technical standard.",
      "jochem-brouwer: open a PR updating agents.md to note that AI/LLMs should not allocate EIP numbers.",
      "jochem-brouwer: review the Rust implementation of the rendering system for the EIP working group.",
    ],
    nextMeeting: "Meeting #130, Sep 16, 2026 at 16:00 UTC",
  },
];

export const LATEST_OFFICE_HOUR_RECAP = OFFICE_HOUR_RECAPS[0];

/** /calls/<series>/<number> path for a recap. */
export const officeHourCallPath = (r: OhRecap) => `/calls/${r.series}/${r.meeting}`;

/** Look up a static office-hour recap by series slug + meeting number. */
export function findOfficeHourRecap(series: string, number: string): OhRecap | null {
  return OFFICE_HOUR_RECAPS.find((r) => r.series === series && String(r.meeting) === number) ?? null;
}
